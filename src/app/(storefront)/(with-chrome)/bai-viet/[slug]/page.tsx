import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../../components/storefront/empty-state";
import PostRelatedProducts, {
  type StorefrontProductItem,
} from "../../../../../components/storefront/post-related-products";
import { type StorefrontPost } from "../../../../../lib/storefront-blog";
import { sanitizePostThumbnailUrl } from "../../../../../lib/media";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildDynamicMetadata,
  buildFaqPageJsonLd,
} from "../../../../../lib/seo";

type ParamsInput = Promise<{ slug: string }>;
export const dynamic = "force-dynamic";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

async function getPostBySlug(slug: string): Promise<{
  post: StorefrontPost | null;
  related: StorefrontPost[];
  /** StorefrontProductItem[] không có N+1 (đã include trong query) */
  relatedProducts: StorefrontProductItem[];
}> {
  const db = await getDbClient();
  if (!db) return { post: null, related: [], relatedProducts: [] };

  // Query Post cơ bản
  const row = (await db.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      thumbnailUrl: true,
      seoTitle: true,
      seoDescription: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as unknown as {
    id: string; title: string; slug: string;
    excerpt: string | null; content: string;
    thumbnailUrl: string | null;
    seoTitle: string | null; seoDescription: string | null;
    seoKeywords: { main: string; sub: string[] } | null;
    tags: string[];
    publishedAt: Date | null; createdAt: Date; updatedAt: Date;
  } | null;

  if (!row) return { post: null, related: [], relatedProducts: [] };

  // Query riêng PostProduct bằng raw SQL (tránh Prisma ORM lỗi nếu bảng chưa migrate)
  let seoProductsRaw: Array<{
    productId: string;
    product: {
      id: string; name: string; slug: string;
      basePrice: string | number | bigint;
      salePrice: string | number | bigint | null;
      status: string;
      images: Array<{ url: string }>;
    };
  }> = [];

  try {
    const rawRows = await db.$queryRawUnsafe<
      Array<{
        product_id: string;
        name: string;
        slug: string;
        base_price: string;
        sale_price: string | null;
        status: string;
        thumbnail: string | null;
      }>
    >(
      `SELECT p.id AS product_id, p.name, p.slug, p."basePrice"::text AS base_price,
              p."salePrice"::text AS sale_price, p.status,
              (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) AS thumbnail
       FROM "PostProduct" pp
       INNER JOIN "Product" p ON p.id = pp."productId"
       WHERE pp."postId" = $1
       ORDER BY pp."sortOrder" ASC`,
      row.id
    );
    seoProductsRaw = rawRows.map((r) => ({
      productId: r.product_id,
      product: {
        id: r.product_id,
        name: r.name,
        slug: r.slug,
        basePrice: r.base_price,
        salePrice: r.sale_price,
        status: r.status,
        images: r.thumbnail ? [{ url: r.thumbnail }] : [],
      },
    }));
  } catch {
    // Bảng PostProduct chưa tồn tại hoặc lỗi khác → fallback empty
    seoProductsRaw = [];
  }

  const post: StorefrontPost = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? row.content.slice(0, 180),
    content: row.content,
    thumbnailUrl: sanitizePostThumbnailUrl(row.thumbnailUrl ?? ""),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoKeywords: (row as unknown as { seoKeywords: { main: string; sub: string[] } | null }).seoKeywords ?? null,
    tags: row.tags,
    publishedAt: row.publishedAt ?? row.createdAt,
    updatedAt: row.updatedAt,
  };

  // Lọc product hợp lệ: không ARCHIVED, có slug, có name
  const relatedProducts: StorefrontProductItem[] = seoProductsRaw
    .filter(
      (sp) =>
        sp.product.status !== "ARCHIVED" &&
        sp.product.slug &&
        sp.product.name
    )
    .map((sp) => ({
      id: sp.product.id,
      name: sp.product.name,
      slug: sp.product.slug,
      basePrice: sp.product.basePrice.toString(),
      salePrice: sp.product.salePrice?.toString() ?? null,
      thumbnailUrl: sp.product.images.length > 0 ? sp.product.images[0].url : null,
    }));

  const relatedRows = await db.post.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: row.id },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      thumbnailUrl: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      tags: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const related = relatedRows.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt ?? item.content.slice(0, 140),
    content: item.content,
    thumbnailUrl: sanitizePostThumbnailUrl(item.thumbnailUrl ?? ""),
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    seoKeywords: (item as unknown as { seoKeywords: { main: string; sub: string[] } | null }).seoKeywords ?? null,
    tags: item.tags,
    publishedAt: item.publishedAt ?? item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return { post, related, relatedProducts };
}

export async function generateMetadata({
  params,
}: {
  params: ParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const { post } = await getPostBySlug(resolvedParams.slug);

  if (!post) {
    return {
      title: "Bài viết không tồn tại | Zendo.vn",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle ?? `${post.title} | Zendo.vn`;
  const description = post.seoDescription ?? post.excerpt;

  const keywords = post.seoKeywords?.main
    ? [post.seoKeywords.main, ...post.seoKeywords.sub]
    : undefined;

  return buildDynamicMetadata({
    title,
    description,
    path: `/bai-viet/${post.slug}`,
    image: post.thumbnailUrl || undefined,
    type: "article",
    publishedTime: post.publishedAt.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    keywords,
  });
}

export default async function BlogDetailPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const resolvedParams = await Promise.resolve(params);
  const { post, related, relatedProducts } = await getPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }


  const articleJsonLd = buildArticleJsonLd({
    title: post.title,
    description: post.excerpt,
    image: post.thumbnailUrl || undefined,
    publishedTime: post.publishedAt.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    path: `/bai-viet/${post.slug}`,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Bài viết", path: "/bai-viet" },
    { name: post.title, path: `/bai-viet/${post.slug}` },
  ]);
  const articleFaqItems = [
    {
      question: `Bài viết ${post.title} nói về nội dung gì?`,
      answer: post.excerpt,
    },
    ...(post.tags.length
      ? [
          {
            question: `Bài viết ${post.title} có những chủ đề liên quan nào?`,
            answer: `Bài viết này đang được gắn với các chủ đề ${post.tags.slice(0, 6).join(", ")}.`,
          },
        ]
      : []),
    ...(related.length
      ? [
          {
            question: `Có bài viết nào liên quan đến ${post.title}?`,
            answer: `Một số bài viết liên quan đang được công khai gồm ${related
              .slice(0, 3)
              .map((item) => item.title)
              .join(", ")}.`,
          },
        ]
      : []),
  ];
  const faqJsonLd = buildFaqPageJsonLd(articleFaqItems);

  const paragraphs = post.content
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Bài viết", href: "/bai-viet" },
          { label: post.title },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <header className="space-y-3">
            <p className="text-sm font-medium text-zinc-500">
              {post.publishedAt.toLocaleDateString("vi-VN")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {post.title}
            </h1>
            <p className="text-sm leading-6 text-zinc-600 sm:text-base">{post.excerpt}</p>
            {post.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href="/bai-viet"
                    className="inline-flex rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          {post.thumbnailUrl ? (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src={post.thumbnailUrl}
                alt={post.title}
                fill
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}

          <div className="prose prose-zinc mt-6 max-w-none">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {/* Sản phẩm liên quan – SEO Internal Linking (chèn sau nội dung, trước bài viết liên quan + FAQ) */}
          <PostRelatedProducts products={relatedProducts} />

          {/* Bài viết liên quan */}
          {related.length ? (
            <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-bold text-zinc-900">Bài viết liên quan</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {related.map((item) => (
                  <Link key={item.id} href={`/bai-viet/${item.slug}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Câu hỏi thường gặp */}
          {articleFaqItems.length ? (
            <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-bold text-zinc-900">Câu hỏi thường gặp về bài viết</h2>
              <dl className="mt-4 space-y-3">
                {articleFaqItems.map((item) => (
                  <div key={item.question} className="rounded-xl bg-zinc-50 p-4">
                    <dt className="text-sm font-semibold text-zinc-900">{item.question}</dt>
                    <dd className="mt-1 text-sm leading-6 text-zinc-600">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </article>

        <aside className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-zinc-900">Liên kết nhanh</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/bai-viet" className="text-zinc-700 transition hover:text-zinc-900">
                  Tất cả bài viết
                </Link>
              </li>
              <li>
                <Link href="/" className="text-zinc-700 transition hover:text-zinc-900">
                  Về trang chủ
                </Link>
              </li>
            </ul>
          </section>

          {related.length ? (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold text-zinc-900">Bài viết liên quan</h2>
              <div className="mt-3 space-y-3">
                {related.map((item) => (
                  <article key={item.id} className="rounded-lg border border-zinc-100 p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
                      <Link href={`/bai-viet/${item.slug}`} className="transition hover:text-zinc-700">
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{item.excerpt}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              title="Chưa có bài viết liên quan"
              description="Nội dung đang tiếp tục cập nhật."
              actionLabel="Xem danh sách bài viết"
              actionHref="/bai-viet"
            />
          )}
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
    </main>
  );
}
