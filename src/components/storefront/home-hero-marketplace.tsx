import Link from "next/link";
import type { ReactNode } from "react";
import type { ThemeSettings, HomePromoCardItem } from "../../lib/settings";
import { resolveMediaUrl } from "../../lib/media";
import HomeHeroMobileCarousel from "./home-hero-mobile-carousel";
import BannerSlider from "./banner-slider";
import MediaImage from "../shared/media-image";
import HomeHeroCategoriesSidebar from "./home-hero-categories-sidebar";

interface HomeHeroCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

interface HomeHeroMarketplaceProps {
  themeSettings: ThemeSettings;
  categories: HomeHeroCategory[];
  fallback: JSX.Element;
}

const BOTTOM_BANNER_DEFAULT_ALTS = [
  "Điện tử công nghệ",
  "Phụ kiện công nghệ",
  "Điện tử gia dụng",
  "Nhà cửa đời sống",
  "Tất cả danh mục",
] as const;

function isInternalUrl(href: string | null | undefined): boolean {
  const v = (href ?? "").trim();
  return v.startsWith("/");
}

function promoCardHasDisplayableImage(imageUrl: string | undefined | null): boolean {
  return Boolean(resolveMediaUrl(imageUrl ?? ""));
}

function HomeBottomBannerImage({
  imageUrl,
  alt,
  imageFit,
  objectPosition,
  fallbackLabel,
}: {
  imageUrl: string;
  alt: string;
  imageFit?: "contain" | "cover";
  objectPosition?: string;
  fallbackLabel: string;
}): JSX.Element {
  const fitMode: "contain" | "cover" = imageFit === "cover" ? "cover" : "contain";
  const imageClassName =
    fitMode === "cover"
      ? "absolute inset-0 h-full w-full object-cover object-center"
      : "absolute inset-0 h-full w-full object-contain object-center";
  return (
    <MediaImage
      src={imageUrl}
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, 245px"
      quality={90}
      fallbackLabel={fallbackLabel}
      className={imageClassName}
      style={{ objectPosition: objectPosition || "center center" }}
    />
  );
}

function HomePromoClickWrap({
  href,
  className,
  ariaLabel,
  title,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
  children: ReactNode;
}): JSX.Element {
  const trimmed = (href ?? "").trim();
  if (!trimmed) {
    return <div className={className}>{children}</div>;
  }
  if (isInternalUrl(trimmed)) {
    return (
      <Link href={trimmed} className={className} aria-label={ariaLabel} title={title}>
        {children}
      </Link>
    );
  }
  const isExternalHttp = /^https?:\/\//i.test(trimmed);
  return (
    <a
      href={trimmed}
      className={className}
      aria-label={ariaLabel}
      title={title}
      {...(isExternalHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function resolveBottomBannerFallbackHref(sortOrder: number): string {
  switch (sortOrder) {
    case 1:
      return "/danh-muc/dien-tu";
    case 2:
      return "/danh-muc/phu-kien";
    case 3:
      return "/danh-muc/dien-tu-gia-dung";
    case 4:
      return "/danh-muc/nha-cua-doi-song";
    case 5:
      return "/cua-hang";
    default:
      return "/cua-hang";
  }
}

function FallbackCategoryIcon({ index }: { index: number }): JSX.Element {
  const common = "h-6 w-6 text-slate-400";
  if (index % 4 === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (index % 4 === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M7 7h10v10H7V7Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (index % 4 === 2) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M12 3v6l4 2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path
        d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomeHeroMarketplace({
  themeSettings,
  categories,
  fallback,
}: HomeHeroMarketplaceProps): JSX.Element {
  const mainFallbackBanner = themeSettings.mainBannerImage || themeSettings.homeBannerImage;
  const hasMainFallback = Boolean(mainFallbackBanner);

  const enabledMainBanners = (themeSettings.homeBanners || [])
    .filter((b) => b.enabled && Boolean(b.imageUrl))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);

  const desktopMainBanners: Array<{
    id: string;
    title: string;
    altText?: string;
    imageUrl: string;
    mobileImageUrl?: string | null;
    targetUrl?: string | null;
    imageFit: "contain" | "cover";
    objectPosition: string;
    mobileImageFit: "contain" | "cover";
    mobileObjectPosition: string;
  }> = (() => {
    if (enabledMainBanners.length) {
      return enabledMainBanners.map((b, index) => ({
        id: `main-${index}`,
        title: b.title || themeSettings.mainBannerTitle || "Banner Zendo",
        altText: b.altText,
        imageUrl: b.imageUrl,
        mobileImageUrl: b.mobileImageUrl,
        targetUrl: b.link || themeSettings.mainBannerHref || "",
        imageFit: b.imageFit === "cover" ? "cover" : "contain",
        objectPosition: (b.objectPosition || "center center").trim() || "center center",
        mobileImageFit: b.mobileImageFit === "cover" ? "cover" : "contain",
        mobileObjectPosition: (b.mobileObjectPosition || "center center").trim() || "center center",
      }));
    }
    if (!hasMainFallback) return [];
    return [
      {
        id: "main-fallback-0",
        title: themeSettings.mainBannerTitle || "Banner Zendo",
        altText: themeSettings.mainBannerTitle || "",
        imageUrl: mainFallbackBanner,
        mobileImageUrl: themeSettings.homeBannerMobileImage || mainFallbackBanner,
        targetUrl: themeSettings.mainBannerHref || "",
        imageFit: "contain",
        objectPosition: "center center",
        mobileImageFit: "contain",
        mobileObjectPosition: "center center",
      },
    ];
  })();

  const mobileMainBanners = desktopMainBanners.map((b) => ({
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl || b.imageUrl,
    link: b.targetUrl || "",
    title: b.title,
    altText: b.altText,
    subtitle: "",
    mobileImageFit: b.mobileImageFit,
    mobileObjectPosition: b.mobileObjectPosition,
  }));

  const rightCards: HomePromoCardItem[] = (themeSettings.homeRightPromoCards || [])
    .filter(
      (c) =>
        c.enabled &&
        Boolean((c.title || "").trim() || (c.link || "").trim() || promoCardHasDisplayableImage(c.imageUrl)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);

  const bottomCards: HomePromoCardItem[] = (themeSettings.homeBottomPromoCards || [])
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 5);

  const visibleCategories = categories;
  const hasVisibleCategories = visibleCategories.length > 0;

  if (!desktopMainBanners.length) {
    return (
      <section aria-label="Banner chính Zendo" className="space-y-3 sm:space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--z-border)] bg-[var(--z-card)] shadow-sm">{fallback}</div>
      </section>
    );
  }

  return (
    <section aria-label="Banner trang chủ Zendo" className="space-y-4 sm:space-y-5">
      {/* Mobile: chỉ hiển thị banner chính */}
      <div className="lg:hidden">
        <HomeHeroMobileCarousel banners={mobileMainBanners} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <div
          className={`grid gap-4 xl:gap-5 ${
            hasVisibleCategories
              ? "items-stretch grid-cols-[minmax(210px,230px)_minmax(0,1fr)_minmax(280px,320px)]"
              : "items-stretch grid-cols-[minmax(0,1fr)_minmax(280px,320px)]"
          }`}
        >
          {/* Left: danh mục sản phẩm */}
          {hasVisibleCategories ? (
            <div className="h-full min-h-0">
              <HomeHeroCategoriesSidebar categories={visibleCategories} />
            </div>
          ) : null}

          {/* Center: banner chính carousel */}
          <div className="h-full min-h-0">
            <BannerSlider
              banners={desktopMainBanners.map((b) => ({
                id: b.id,
                title: b.title,
                altText: b.altText,
                imageUrl: b.imageUrl,
                targetUrl: b.targetUrl,
                imageFit: b.imageFit,
                objectPosition: b.objectPosition,
              }))}
            />
          </div>

          {/* Right: 4 card/banner phụ dọc */}
          <div className="h-full min-h-0">
            <div className="grid h-full min-h-0 grid-rows-4 gap-[1px]">
              {rightCards.map((card, index) => {
                const href = card.link || "";
                const title = (card.title || "").trim();
                const description = card.description || "";
                const altText = card.altText?.trim() || title || `Banner phải ${index + 1}`;
                const resolvedImg = resolveMediaUrl(card.imageUrl ?? "");
                const showFullImage = promoCardHasDisplayableImage(card.imageUrl);

                const inner = showFullImage ? (
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-[#2563EB]/30 hover:shadow-md">
                    <MediaImage
                      src={resolvedImg}
                      alt={altText}
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      quality={90}
                      fallbackLabel={title}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      style={{ objectPosition: "center center" }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm transition hover:border-[#2563EB]/30 hover:shadow-md">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF]">
                      <FallbackCategoryIcon index={index} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{title}</div>
                      {description ? (
                        <div className="line-clamp-1 text-xs leading-4 text-slate-600">{description}</div>
                      ) : null}
                    </div>
                  </div>
                );

                return (
                  <div key={`${card.sortOrder}-${card.title}-${index}`} className="h-full min-h-0">
                    <HomePromoClickWrap href={href} className="block h-full min-h-0">
                      {inner}
                    </HomePromoClickWrap>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: 5 cards */}
        {bottomCards.length ? (
          <div className="mt-4">
            <div className="grid w-full grid-cols-5 gap-2.5 xl:gap-3">
              {bottomCards.map((card, index) => {
                const title = (card.title || "").trim();
                const altText = card.altText?.trim() || title || BOTTOM_BANNER_DEFAULT_ALTS[index] || `Banner dưới ${index + 1}`;
                const resolvedImg = resolveMediaUrl(card.imageUrl ?? "");
                const showFullImage = promoCardHasDisplayableImage(card.imageUrl);
                const objectPosition = (card.objectPosition || "center center").toLowerCase();
                const fallbackHref = resolveBottomBannerFallbackHref(card.sortOrder);
                const finalHref = (card.link || "").trim() || fallbackHref;
                const linkLabel = altText || title || `Banner danh mục ${index + 1}`;

                const inner = showFullImage ? (
                  <div className="relative h-auto w-full aspect-[245/104] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-[#2563EB]/25 hover:shadow-md">
                    <HomeBottomBannerImage
                      imageUrl={resolvedImg}
                      alt={altText}
                      imageFit={card.imageFit}
                      objectPosition={objectPosition}
                      fallbackLabel={title}
                    />
                  </div>
                ) : (
                  <div className="h-auto w-full aspect-[245/104] rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-[#2563EB]/25 hover:shadow-md" />
                );

                return (
                  <div key={`${card.sortOrder}-${index}`} className="min-h-0 w-full">
                    <HomePromoClickWrap
                      href={finalHref}
                      className="block h-full w-full min-w-0"
                      ariaLabel={linkLabel}
                      title={linkLabel}
                    >
                      {inner}
                    </HomePromoClickWrap>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
