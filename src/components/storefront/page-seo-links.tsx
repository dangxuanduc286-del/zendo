import Link from "next/link";

export interface StorefrontPageLink {
  id: string;
  linkType:
    | "PRODUCT"
    | "CATEGORY"
    | "BRAND"
    | "POST"
    | "PAGE"
    | "COUPON"
    | "LANDING_PAGE";
  title: string;
  url: string;
  anchorText: string | null;
}

interface PageSeoLinksProps {
  links: StorefrontPageLink[];
}

const LINK_TYPE_ICONS: Record<StorefrontPageLink["linkType"], JSX.Element> = {
  PRODUCT: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  CATEGORY: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  BRAND: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  POST: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  PAGE: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  COUPON: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  LANDING_PAGE: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
};

const LINK_TYPE_LABELS: Record<StorefrontPageLink["linkType"], string> = {
  PRODUCT: "Sản phẩm",
  CATEGORY: "Danh mục",
  BRAND: "Thương hiệu",
  POST: "Bài viết",
  PAGE: "Trang",
  COUPON: "Mã giảm giá",
  LANDING_PAGE: "Trang đích",
};

export default function PageSeoLinks({
  links,
}: PageSeoLinksProps): JSX.Element | null {
  if (!links.length) return null;

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-zinc-900">
        Có thể bạn quan tâm
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              href={link.url}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-blue-700"
            >
              <span className="text-zinc-400">{LINK_TYPE_ICONS[link.linkType]}</span>
              <span className="flex-1">
                {link.anchorText ?? link.title}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {LINK_TYPE_LABELS[link.linkType]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
