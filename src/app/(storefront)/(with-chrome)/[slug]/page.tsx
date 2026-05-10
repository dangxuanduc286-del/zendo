import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildBreadcrumbJsonLd,
  buildDynamicMetadata,
  buildWebPageJsonLd,
} from "../../../../lib/seo";
import {
  excerptFromPageContent,
  getStorefrontPublicPageCached,
  type StorefrontPublicPage,
} from "../../../../lib/storefront-public-page";

type ParamsInput = Promise<{ slug: string }>;

function looksLikeHtmlFragment(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

function PageBody({ page }: { page: StorefrontPublicPage }): JSX.Element {
  const trimmed = page.content.trim();
  if (looksLikeHtmlFragment(trimmed)) {
    return (
      <div
        className="prose prose-zinc max-w-none prose-headings:scroll-mt-20 prose-p:leading-relaxed prose-li:my-1 prose-a:text-blue-600 prose-a:underline-offset-2 hover:prose-a:text-blue-700"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return (
    <div className="prose prose-zinc max-w-none">
      {trimmed.split(/\n{2,}/g).map((block) => (
        <p key={block}>{block}</p>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: { params: ParamsInput }): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const page = await getStorefrontPublicPageCached(resolved.slug);
  if (!page) {
    return { title: "Không tìm thấy | Zendo.vn", robots: { index: false, follow: false } };
  }
  const path = `/${page.slug}`;
  const description =
    (page.seoDescription && page.seoDescription.trim()) ||
    excerptFromPageContent(page.content);
  const titleMeta = page.seoTitle?.trim() || `${page.title} | Zendo.vn`;
  return buildDynamicMetadata({
    title: titleMeta,
    description,
    path,
    modifiedTime: page.updatedAt.toISOString(),
  });
}

export default async function StorefrontContentPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const resolved = await Promise.resolve(params);
  const page = await getStorefrontPublicPageCached(resolved.slug);
  if (!page) {
    notFound();
  }
  const path = `/${page.slug}`;
  const descriptionPlain =
    (page.seoDescription && page.seoDescription.trim()) ||
    excerptFromPageContent(page.content);
  const pageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: descriptionPlain,
    path,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: page.title, path },
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-zinc-500 sm:text-sm">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="font-medium text-blue-700 hover:text-blue-800">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden className="text-zinc-400">
            /
          </li>
          <li className="font-semibold text-zinc-800">{page.title}</li>
        </ol>
      </nav>

      <article className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{page.title}</h1>
        </header>
        <PageBody page={page} />
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
