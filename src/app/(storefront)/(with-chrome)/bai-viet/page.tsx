import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../components/storefront/empty-state";
import Pagination from "../../../../components/storefront/pagination";
import { type StorefrontPost } from "../../../../lib/storefront-blog";
import { absoluteUrl } from "../../../../lib/utils";
import { sanitizePostThumbnailUrl } from "../../../../lib/media";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../../lib/seo";

const PAGE_SIZE = 6;
export const dynamic = "force-dynamic";

type SearchParamsInput =
  Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePage(value: string | undefined): number {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

async function getPosts(page: number): Promise<{
  posts: StorefrontPost[];
  totalItems: number;
}> {
  const db = await getDbClient();
  if (!db) return { posts: [], totalItems: 0 };
  const skip = (page - 1) * PAGE_SIZE;
  const [rows, count] = await Promise.all([
    db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
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
    }),
    db.post.count({ where: { status: "PUBLISHED" } }),
  ]);

  return {
    posts: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? row.content.slice(0, 180),
      content: row.content,
      thumbnailUrl: sanitizePostThumbnailUrl(row.thumbnailUrl ?? ""),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      tags: row.tags,
      publishedAt: row.publishedAt ?? row.createdAt,
      updatedAt: row.updatedAt,
    })),
    totalItems: count,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const page = parsePage(firstValue(resolvedSearchParams.page));
  const title = page > 1 ? `Bài viết - Trang ${page} | Zendo.vn` : "Bài viết | Zendo.vn";
  const description =
    "Cap nhat kinh nghiem mua sam, tu van sản phẩm va xu huong moi nhat tu Zendo.vn.";
  const canonicalPath = page > 1 ? `/bai-viet?page=${page}` : "/bai-viet";

  return buildDynamicMetadata({
    title,
    description,
    path: canonicalPath,
  });
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<JSX.Element> {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const page = parsePage(firstValue(resolvedSearchParams.page));
  const { posts, totalItems } = await getPosts(page);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);


  const makeHref = (targetPage: number) =>
    targetPage > 1 ? `/bai-viet?page=${targetPage}` : "/bai-viet";

  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bài viết Zendo.vn",
    url: absoluteUrl(safePage > 1 ? `/bai-viet?page=${safePage}` : "/bai-viet"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/bai-viet/${post.slug}`),
        name: post.title,
      })),
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Bài viết", path: "/bai-viet" },
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Bài viết" },
        ]}
      />

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Bài viết</h1>
        <p className="text-sm leading-6 text-zinc-600 sm:text-base">
          Chia se kinh nghiem mua sam, danh gia sản phẩm va meo toi uu chi phi.
        </p>
      </header>

      {posts.length ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link href={`/bai-viet/${post.slug}`} className="block">
                  <div className="relative aspect-[16/10] bg-zinc-100">
                    {post.thumbnailUrl ? (
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </Link>
                <div className="space-y-2 p-4">
                  <p className="text-xs font-medium text-zinc-500">
                    {post.publishedAt.toLocaleDateString("vi-VN")}
                  </p>
                  <h2 className="line-clamp-2 text-base font-semibold text-zinc-900">
                    <Link href={`/bai-viet/${post.slug}`} className="transition hover:text-zinc-700">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-600">{post.excerpt}</p>
                  <Link
                    href={`/bai-viet/${post.slug}`}
                    className="inline-flex text-sm font-semibold text-zinc-900 transition hover:text-zinc-700"
                  >
                    Xem chi tiet
                  </Link>
                </div>
              </article>
            ))}
          </section>
          <Pagination currentPage={safePage} totalPages={totalPages} makeHref={makeHref} />
        </>
      ) : (
        <EmptyState
          title="Chưa có bài viết"
          description="Nội dung đang được cập nhật. Vui lòng quay lại sau."
          actionLabel="Về trang chủ"
          actionHref="/"
        />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </main>
  );
}
