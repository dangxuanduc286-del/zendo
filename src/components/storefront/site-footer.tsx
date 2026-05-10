import Link from "next/link";
import type { FooterTrustBanner, WebsiteSettings, SocialLink } from "../../lib/settings";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";

type FooterPostLink = {
  title: string;
  href: string;
};

type FooterCategoryLink = {
  label: string;
  href: string;
};

interface SiteFooterProps {
  websiteSettings: WebsiteSettings;
  socialLinks: SocialLink[];
  postLinks: FooterPostLink[];
  categoryLinks: FooterCategoryLink[];
}

/** Footer trust strip: cố định aspect-[2/1] (tương đương ảnh gợi ý ~1280×640). */
function FooterTrustBannerImage({
  imageUrl,
  alt,
  imageFit,
  objectPosition,
}: {
  imageUrl: string;
  alt: string;
  imageFit: "contain" | "cover";
  objectPosition?: string;
}): JSX.Element {
  const fitMode = imageFit === "cover" ? "cover" : "contain";
  const imageClassName =
    fitMode === "cover"
      ? "absolute inset-0 h-full w-full object-cover object-center"
      : "absolute inset-0 h-full w-full object-contain object-center";
  return (
    <MediaImage
      src={imageUrl}
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, 320px"
      quality={90}
      fallbackLabel=""
      className={imageClassName}
      style={{ objectPosition: objectPosition || "center center" }}
    />
  );
}

function isTrustedHttpExternal(href: string): boolean {
  const t = href.trim();
  return /^https?:\/\//i.test(t) || t.startsWith("//");
}

function isMailtoOrTel(href: string): boolean {
  const t = href.trim().toLowerCase();
  return t.startsWith("mailto:") || t.startsWith("tel:");
}

function FooterTrustBannerClickWrap({
  href,
  ariaLabel,
  title,
  children,
}: {
  href: string;
  ariaLabel: string;
  title: string;
  children: JSX.Element;
}): JSX.Element {
  const trimmed = href.trim();
  if (!trimmed) return children;

  const commonAnchor = `block h-full w-full`;
  const a11y = { "aria-label": ariaLabel, title };

  if (isMailtoOrTel(trimmed)) {
    return (
      <a href={trimmed} className={commonAnchor} {...a11y}>
        {children}
      </a>
    );
  }
  if (isTrustedHttpExternal(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className={commonAnchor} {...a11y}>
        {children}
      </a>
    );
  }
  return (
    <Link href={trimmed} className={commonAnchor} {...a11y}>
      {children}
    </Link>
  );
}

function FooterTrustBannersSection({
  items,
}: {
  items: FooterTrustBanner[];
}): JSX.Element {
  const seoFallbackAlt = "Banner cam kết dưới trang";
  const row = [...items].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 4);

  return (
    <section className="bg-transparent">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          {row.map((item) => {
            const resolved = resolveMediaUrl(item.imageUrl);
            const altTextFinal = item.altText.trim() || item.title.trim() || seoFallbackAlt;
            const linkLabel = item.altText.trim() || item.title.trim() || seoFallbackAlt;
            const hasImage = Boolean(resolved.trim());
            const canClick = item.enabled && Boolean(item.link.trim());

            const card = (
              <article
                aria-hidden={!item.enabled}
                className={`relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-transparent shadow-[0_6px_16px_rgba(15,23,42,0.06)] aspect-[2/1] ${item.enabled ? "" : "opacity-70"}`}
              >
                {hasImage ? (
                  <div className="absolute inset-0">
                    <FooterTrustBannerImage
                      imageUrl={resolved}
                      alt={altTextFinal}
                      imageFit={item.imageFit}
                      objectPosition={item.objectPosition}
                    />
                  </div>
                ) : null}
              </article>
            );

            return (
              <div key={item.sortOrder} className="min-w-0">
                {canClick ? (
                  <FooterTrustBannerClickWrap href={item.link} ariaLabel={linkLabel} title={linkLabel}>
                    {card}
                  </FooterTrustBannerClickWrap>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function renderFooterBottomText(text: string, siteName: string): JSX.Element {
  const parts = text.split(siteName);
  if (parts.length <= 1) {
    return <>{text}</>;
  }
  return (
    <>
      {parts.map((part, index) => (
        <span key={`footer-text-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <span className="font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]">
              {siteName}
            </span>
          ) : null}
        </span>
      ))}
    </>
  );
}

function defaultFooterGroups(
  postLinks: FooterPostLink[],
  categoryLinks: FooterCategoryLink[],
  websiteSettings: WebsiteSettings,
) {
  const categoryHref = categoryLinks[0]?.href ?? "/cua-hang";
  const blogHref = postLinks[0]?.href ?? "/bai-viet";
  const categoryFromSettings = websiteSettings.homeCategoryChips
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      label: item.label,
      href: item.slug ? `/danh-muc/${item.slug}` : "/cua-hang",
    }));
  const categoryFooterLinks = categoryFromSettings.length
    ? categoryFromSettings.slice(0, 6)
    : [
        { label: "Nổi bật", href: "/cua-hang" },
        { label: "Điện tử", href: "/danh-muc/dien-tu" },
        { label: "Phụ kiện", href: "/danh-muc/phu-kien" },
        { label: "Gia dụng", href: "/danh-muc/gia-dung" },
        { label: "Thể thao", href: "/danh-muc/the-thao" },
      ];

  return [
    {
      title: "Mua sắm",
      links: [
        { label: "Cửa hàng", href: "/cua-hang" },
        { label: "Sản phẩm nổi bật", href: "/cua-hang?sort=featured" },
        { label: "Hàng mới", href: "/cua-hang?sort=new" },
        { label: "Đang giảm giá", href: "/cua-hang?sort=sale" },
        { label: "Danh mục", href: categoryHref },
        ...categoryFooterLinks,
      ],
    },
    {
      title: "Hỗ trợ khách hàng",
      links: [
        { label: "Tra cứu đơn hàng", href: "/tra-cuu-don-hang" },
        { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
        { label: "Chính sách giao hàng", href: "/chinh-sach-giao-hang" },
        { label: "Chính sách đổi trả", href: "/chinh-sach-doi-tra" },
        { label: "Hướng dẫn mua hàng", href: "/huong-dan-mua-hang" },
      ],
    },
    {
      title: "Thông tin",
      links: [
        { label: "Tin và mẹo hay", href: blogHref },
        { label: "Giới thiệu", href: "/gioi-thieu" },
        { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
        { label: "Điều khoản sử dụng", href: "/dieu-khoan-su-dung" },
        { label: "Liên hệ", href: "/lien-he" },
      ],
    },
  ];
}

export default function SiteFooter({
  websiteSettings,
  socialLinks,
  postLinks,
  categoryLinks,
}: SiteFooterProps): JSX.Element {
  const dynamicGroups =
    websiteSettings.showFooterLinkGroups && websiteSettings.footerLinkGroups.length
      ? websiteSettings.footerLinkGroups
          .filter((group) => group.enabled)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((group) => ({
            title: group.title,
            links: group.links
              .filter((link) => link.enabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((link) => ({ label: link.label, href: link.href })),
          }))
      : defaultFooterGroups(postLinks, categoryLinks, websiteSettings);

  const siteName = websiteSettings.siteName.trim() || "Zendo.vn";
  const footerBrandName = websiteSettings.footerBrandName.trim() || siteName;
  const siteDescription =
    websiteSettings.footerBrandDescription.trim() ||
    websiteSettings.shortDescription.trim() ||
    websiteSettings.defaultSeoDescription.trim() ||
    "Zendo.vn là website mua sắm đa ngành, tập trung vào điện tử, phụ kiện và các sản phẩm thiết yếu. Chúng tôi hướng tới trải nghiệm mua hàng rõ ràng, giao nhanh và hỗ trợ dễ hiểu.";
  const footerSocialLinks = websiteSettings.showFooterSocialLinks
    ? [
        { label: "Facebook", url: websiteSettings.footerFacebookUrl.trim() },
        { label: "Instagram", url: websiteSettings.footerInstagramUrl.trim() },
        { label: "TikTok", url: websiteSettings.footerTiktokUrl.trim() },
        { label: "YouTube", url: websiteSettings.footerYoutubeUrl.trim() },
        { label: "Zalo", url: websiteSettings.footerZaloUrl.trim() },
      ].filter((item) => item.url)
    : [];
  const mergedSocialLinks = footerSocialLinks.length
    ? footerSocialLinks
    : websiteSettings.showFooterSocialLinks
      ? socialLinks
          .filter((item) =>
            ["facebook", "instagram", "tiktok", "youtube", "zalo"].includes(item.platform.trim().toLowerCase()),
          )
          .map((item) => ({ label: item.label || item.platform, url: item.url }))
      : [];
  const defaults = defaultFooterGroups(postLinks, categoryLinks, websiteSettings);
  const colShopping =
    dynamicGroups.find((group) => group.title.toLowerCase().includes("mua")) ?? defaults[0];
  const colSupport =
    dynamicGroups.find((group) => group.title.toLowerCase().includes("hỗ trợ")) ?? defaults[1];
  const colInfo =
    dynamicGroups.find((group) => group.title.toLowerCase().includes("thông tin")) ?? defaults[2];
  const hotline = websiteSettings.hotline.trim() || "0564162222";

  return (
    <>
      {websiteSettings.showBottomTrustBlock ? (
        <FooterTrustBannersSection items={websiteSettings.footerTrustBanners} />
      ) : null}

      <footer className="bg-[var(--z-bg)]/90">
        <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-12">
          <section className="space-y-3">
            <p className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Thương hiệu</p>
            <Link href="/" className="inline-flex items-center text-xl font-extrabold tracking-tight text-[#2563EB] transition-colors hover:text-[#1D4ED8]">
              {footerBrandName}
            </Link>
            <p className="text-sm leading-6 text-slate-600">{siteDescription}</p>
            <a href={`tel:${hotline.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M6.5 4.5h3l1.2 3.2-1.7 1.7a13 13 0 0 0 5.5 5.5l1.7-1.7 3.2 1.2v3a1.6 1.6 0 0 1-1.7 1.6A14.7 14.7 0 0 1 5 6.2 1.6 1.6 0 0 1 6.5 4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Hotline: {hotline}</span>
            </a>
            {websiteSettings.email.trim() ? (
              <a href={`mailto:${websiteSettings.email.trim()}`} className="block text-sm text-slate-600 hover:text-[var(--z-primary)]">
                {websiteSettings.email.trim()}
              </a>
            ) : null}
            {websiteSettings.address.trim() ? (
              <p className="text-sm leading-6 text-slate-600">{websiteSettings.address.trim()}</p>
            ) : null}
            {mergedSocialLinks.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {mergedSocialLinks.map((item) => (
                  <a
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-8 items-center rounded-full border border-[var(--z-border)] bg-[var(--z-card)] px-3 text-xs font-semibold text-slate-700 transition hover:border-[var(--z-primary)] hover:text-[var(--z-primary)]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
          <nav aria-label="Mua sắm" className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Mua sắm</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {colShopping.links.map((link) => (
                <li key={`shopping-${link.label}-${link.href}`}>
                  <Link href={link.href} className="transition hover:text-[var(--z-primary)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Hỗ trợ khách hàng" className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Hỗ trợ khách hàng</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {colSupport.links.map((link) => (
                <li key={`support-${link.label}-${link.href}`}>
                  <Link href={link.href} className="transition hover:text-[var(--z-primary)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Thông tin" className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">Thông tin</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {colInfo.links.map((link) => (
                <li key={`info-${link.label}-${link.href}`}>
                  <Link href={link.href} className="transition hover:text-[var(--z-primary)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div>
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-3 px-4 py-4 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>{renderFooterBottomText(websiteSettings.footerText || `© ${new Date().getFullYear()} ${siteName}. Đã đăng ký bản quyền.`, siteName)}</p>
            <span className="hidden md:inline" />
          </div>
        </div>
      </footer>
    </>
  );
}
