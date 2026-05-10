import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  buildBreadcrumbJsonLd,
  buildDynamicMetadata,
  buildWebPageJsonLd,
} from "../../../../../lib/seo";
import { authOptions } from "../../../../../lib/auth";
import {
  canViewAffiliatePolicyOnStorefront,
  excerptPlain,
  getPublishedSitePolicyCached,
} from "../../../../../lib/site-policy-queries";

type ParamsInput = Promise<{ slug: string }>;

function legacyMappedSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return normalized === "chinh-sach-van-chuyen" ? "chinh-sach-giao-hang" : normalized;
}

function looksLikeHtmlFragment(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

export async function generateMetadata({ params }: { params: ParamsInput }): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const slug = resolved.slug.trim().toLowerCase();
  const policy = await getPublishedSitePolicyCached(slug);
  if (!policy) {
    return { title: "Không tìm thấy | Zendo.vn", robots: { index: false, follow: false } };
  }
  const path = `/chinh-sach/${encodeURIComponent(policy.slug)}`;
  const description = (policy.excerpt && policy.excerpt.trim()) || excerptPlain(policy.content);
  const titleMeta = `${policy.title} | Zendo.vn`;
  return buildDynamicMetadata({
    title: titleMeta,
    description,
    path,
    modifiedTime: policy.updatedAt.toISOString(),
    noIndex: policy.type === "AFFILIATE_POLICY",
  });
}

export default async function ChinhSachPolicyPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const resolved = await Promise.resolve(params);
  const slugRaw = resolved.slug.trim().toLowerCase();
  const policy = await getPublishedSitePolicyCached(slugRaw);

  if (!policy) {
    const mapped = legacyMappedSlug(slugRaw);
    permanentRedirect(`/${mapped}`);
  }

  const session = await getServerSession(authOptions);
  if (policy.type === "AFFILIATE_POLICY" && !canViewAffiliatePolicyOnStorefront(session)) {
    notFound();
  }

  const path = `/chinh-sach/${encodeURIComponent(policy.slug)}`;
  const descriptionPlain = (policy.excerpt && policy.excerpt.trim()) || excerptPlain(policy.content);
  const pageJsonLd = buildWebPageJsonLd({
    title: policy.title,
    description: descriptionPlain,
    path,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Chính sách", path: "/tai-khoan?tab=policyHub" },
    { name: policy.title, path },
  ]);

  const bodyHtml = policy.content.trim();
  const body =
    looksLikeHtmlFragment(bodyHtml) ? (
      <div
        className="prose prose-zinc max-w-none prose-headings:scroll-mt-20 prose-p:leading-relaxed prose-li:my-1 prose-a:text-blue-600 prose-table:text-sm prose-th:border prose-td:border prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    ) : (
      <div className="prose prose-zinc max-w-none">
        {bodyHtml.split(/\n{2,}/g).map((block) => (
          <p key={block}>{block}</p>
        ))}
      </div>
    );

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
          <li>
            <Link href="/tai-khoan?tab=policyHub" className="font-medium text-blue-700 hover:text-blue-800">
              Tài khoản · Tra cứu &amp; chính sách
            </Link>
          </li>
          <li aria-hidden className="text-zinc-400">
            /
          </li>
          <li className="font-semibold text-zinc-800">{policy.title}</li>
        </ol>
      </nav>

      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Chính sách &amp; hướng dẫn</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{policy.title}</h1>
          {policy.excerpt.trim() ? <p className="text-sm text-zinc-600">{policy.excerpt.trim()}</p> : null}
        </header>
        {body}
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
