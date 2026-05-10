import Link from "next/link";
import type { Category } from "@prisma/client";
import SearchBar from "@/components/storefront/search-bar";
import CartIcon from "@/components/storefront/cart-icon";
import AccountMobileHamburgerButton from "@/components/storefront/account-mobile-hamburger-button";
import MediaImage from "../shared/media-image";
import HeaderDesktopCategoryMenu from "./header-desktop-category-menu";
import AccountMenu from "../storefront/account-menu";
import { STOREFRONT_FRAME } from "@/lib/storefront-frame";
import { TopbarSupportButton } from "./topbar-support-button";
import { Z_INDEX } from "../../lib/z-index";
import { MobileAccountHeaderAction } from "./mobile-account-header-action";

type HeaderCategory = Pick<Category, "id" | "name" | "slug">;
type HeaderCategoryTree = HeaderCategory & {
  children?: HeaderCategory[];
};
type HeaderPage = { id: string; title: string; slug: string };

interface StoreHeaderProps {
  logoUrl: string;
  siteName: string;
  hotline: string;
  categories: HeaderCategoryTree[];
  pages: HeaderPage[];
  headerNavItems: Array<{ label: string; href: string; enabled: boolean; sortOrder: number }>;
  isAdmin: boolean;
  /** Chỉ true khi user admin hoặc NODE_ENV=development — ẩn link Admin với khách production. */
  showAdminNav: boolean;
  searchPlaceholder: string;
  showTopbar: boolean;
  topbarLeftText: string;
  topbarShippingText: string;
  topbarCommitmentText: string;
  showHeaderSearch: boolean;
  showHeaderCartIcon: boolean;
  showHeaderAdminMenu: boolean;
  isAuthenticated: boolean;
  desktopCategoryLimit: number;
  mobileCategoryLimit: number;
}

const TOPBAR_ICON_SM = "h-3.5 w-3.5 shrink-0 text-amber-400";
const TOPBAR_ICON_LG = "h-4 w-4 shrink-0 text-amber-400";

function StorefrontTopBar({
  hotline,
  leftText,
  shippingText,
  commitmentText,
}: {
  hotline: string;
  leftText: string;
  shippingText: string;
  commitmentText: string;
}): JSX.Element {
  const hot = hotline.trim();
  const telDigits = hot.replace(/[^\d+]/g, "");

  const safeLeftText = leftText.trim() || "Đa ngành uy tín, trọng tâm điện tử";
  const safeShippingText = shippingText.trim() || "Giao nhanh • COD tiện lợi";
  const safeCommitmentText = commitmentText.trim() || "Đổi trả lỗi theo chính sách";
  const segments: Array<{ icon: "layers" | "shield" | "truck" | "refresh"; text: string }> = [
    { icon: "layers", text: safeLeftText },
    { icon: "shield", text: "Cam kết - Hàng hóa Uy Tín và Rẻ nhất Việt Nam" },
    { icon: "truck", text: safeShippingText },
    { icon: "refresh", text: safeCommitmentText },
  ];
  const [segment2, segment3, segment4, segment5] = segments;

  function SegmentIcon({
    kind,
    size = "lg",
  }: {
    kind: (typeof segments)[number]["icon"];
    size?: "sm" | "lg";
  }): JSX.Element {
    const c = size === "lg" ? TOPBAR_ICON_LG : TOPBAR_ICON_SM;
    if (kind === "layers") {
      return (
        <svg viewBox="0 0 20 20" aria-hidden className={c}>
          <path
            d="M10 2 3 5.5 10 9l7-3.5L10 2Zm0 8.25L3.5 7.25 3 9.5l7 3.5 7-3.5-.5-2.25L10 10.25Zm0 3.25L3.5 10.5 3 12.75 10 16.25 17 12.75l-.5-2.25L10 13.5Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    if (kind === "shield") {
      return (
        <svg viewBox="0 0 20 20" aria-hidden className={c}>
          <path
            d="M10 2 4 4.2V9c0 3.1 2.1 6 5 6.7 2.9-.7 5-3.6 5-6.7V4.2L10 2Z"
            fill="currentColor"
          />
        </svg>
      );
    }
    if (kind === "truck") {
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={c}>
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM13 16V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10h10Zm0 0h2.5a1 1 0 0 0 1-.8l1.67-8.35A1 1 0 0 0 17.18 5H16"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden className={c}>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          d="M4 9a6 6 0 0 1 10.3-4M4 9V5m0 4h3.5M16 11a6 6 0 0 1-10.3 4M16 11v4m0-4h-3.5"
        />
      </svg>
    );
  }

  const hotlineIcon = (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 text-amber-400 lg:h-4 lg:w-4"
    >
      <path
        d="M4.5 3h2l1.2 4.5a1 1 0 0 1-.25.95l-1.1 1.1a12 12 0 0 0 5.15 5.15l1.1-1.1a1 1 0 0 1 .95-.25L17 14.5v2a1 1 0 0 1-1.1.95A16 16 0 0 1 3.55 4.6 1 1 0 0 1 4.5 3Z"
        fill="currentColor"
      />
    </svg>
  );

  const hotlineNode =
    hot && telDigits ? (
      <a
        href={`tel:${telDigits}`}
        className="inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold leading-tight tracking-tight text-amber-400 transition hover:text-amber-300 lg:text-[13px] xl:text-sm"
      >
        {hotlineIcon}
        <span>Hotline: {hot}</span>
      </a>
    ) : hot ? (
      <span className="inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold leading-tight text-amber-400 lg:text-[13px] xl:text-sm">
        {hotlineIcon}
        <span>Hotline: {hot}</span>
      </span>
    ) : null;

  return (
    <div className="border-b border-[#E2E8F0] bg-white text-[#0F172A] lg:border-slate-900/70 lg:bg-[#031327] lg:text-white">
      <div className={`${STOREFRONT_FRAME}`}>
        {/* Desktop: 5 cụm theo thứ tự mẫu, nằm trong đúng 1 hàng */}
        <div className="hidden lg:block">
          <div
            className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center py-1.5 text-[13px] font-medium leading-tight tracking-tight text-slate-100 xl:py-[7px] xl:text-sm"
            role="region"
            aria-label="Hotline và cam kết dịch vụ"
          >
            <div className="inline-flex min-w-0 items-center whitespace-nowrap pr-3">
              {hotlineNode}
            </div>
            <div className="inline-flex min-w-0 items-center whitespace-nowrap pl-3 pr-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <SegmentIcon kind={segment2.icon} size="lg" />
                {segment2.text}
              </span>
            </div>
            <div className="inline-flex min-w-0 items-center justify-center whitespace-nowrap pl-3 pr-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <SegmentIcon kind={segment3.icon} size="lg" />
                {segment3.text}
              </span>
            </div>
            <div className="inline-flex min-w-0 items-center justify-end whitespace-nowrap pl-3 pr-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <SegmentIcon kind={segment4.icon} size="lg" />
                {segment4.text}
              </span>
            </div>
            <div className="inline-flex min-w-0 items-center justify-end whitespace-nowrap pl-3">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <SegmentIcon kind={segment5.icon} size="lg" />
                {segment5.text}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile: 3 item icon + text giống app TMĐT mẫu */}
        <div className="lg:hidden">
          <div
            className="grid h-8 grid-cols-3 items-center gap-1.5 py-0 text-[10.5px] font-medium leading-none text-[#475569]"
            role="region"
            aria-label="Cam kết dịch vụ"
          >
            <div
              data-topbar-item="hang-chinh-hang"
              className="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#F8FAFC] px-1.5"
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#2563EB]">
                <path d="M10 2 4 4.2V9c0 3.1 2.1 6 5 6.7 2.9-.7 5-3.6 5-6.7V4.2L10 2Z" fill="currentColor" />
              </svg>
              <span className="whitespace-nowrap">Hàng chính hãng</span>
            </div>
            <div
              data-topbar-item="giao-nhanh"
              className="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#F8FAFC] px-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#64748B]">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.65"
                  d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM13 16V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10h10Zm0 0h2.5a1 1 0 0 0 1-.8l1.67-8.35A1 1 0 0 0 17.18 5H16"
                />
              </svg>
              <span className="whitespace-nowrap">Giao nhanh</span>
            </div>
            <div
              data-topbar-item="doi-tra-7"
              className="inline-flex h-7 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#F8FAFC] px-1.5"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#64748B]">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.65"
                  d="M4 9a6 6 0 0 1 10.3-4M4 9V5m0 4h3.5M16 11a6 6 0 0 1-10.3 4M16 11v4m0-4h-3.5"
                />
              </svg>
              <span className="whitespace-nowrap">Đổi trả 7 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreHeader({
  logoUrl,
  siteName,
  hotline,
  categories,
  pages,
  headerNavItems,
  isAdmin,
  showAdminNav,
  searchPlaceholder,
  showTopbar,
  topbarLeftText,
  topbarShippingText,
  topbarCommitmentText,
  showHeaderSearch,
  showHeaderCartIcon,
  showHeaderAdminMenu,
  isAuthenticated,
  desktopCategoryLimit,
  mobileCategoryLimit,
}: StoreHeaderProps): JSX.Element {
  void pages;
  const categoryRows = categories.slice(0, Math.max(1, desktopCategoryLimit));
  void mobileCategoryLimit;
  const navRows = (headerNavItems.length
    ? headerNavItems
    : [
        { label: "Cửa hàng", href: "/cua-hang", enabled: true, sortOrder: 1 },
        { label: "Bài viết", href: "/bai-viet", enabled: true, sortOrder: 2 },
      ])
    .filter((item) => item.enabled)
    .filter((item) => item.href !== "/tra-cuu-don-hang")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
  const myAccountHref = isAdmin ? "/admin/account" : "/tai-khoan";
  const danhMucHref = categoryRows[0]?.slug ? `/danh-muc/${categoryRows[0].slug}` : "/cua-hang";
  const navItemClass =
    "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--z-border)] bg-[var(--z-card)] px-3.5 text-sm font-semibold leading-none text-[var(--z-text-main)] shadow-sm transition hover:border-[var(--z-primary)] hover:text-[var(--z-text-main)] active:bg-slate-50";

  return (
    <header className="w-full lg:sticky lg:top-0" style={{ zIndex: Z_INDEX.header }}>
      {showTopbar ? (
        <StorefrontTopBar
          hotline={hotline}
          leftText={topbarLeftText}
          shippingText={topbarShippingText}
          commitmentText={topbarCommitmentText}
        />
      ) : null}

      <div className="border-b border-[var(--z-border)] bg-[var(--z-card)] shadow-[0_1px_0_rgba(15,23,42,0.05)]">
        {/* Desktop: giữ nguyên layout hiện tại */}
        <div className={`${STOREFRONT_FRAME} hidden w-full flex-nowrap items-center gap-2 py-2 sm:h-14 sm:gap-3 sm:py-0 lg:flex lg:h-[4.25rem] lg:gap-4`}>
          <Link href="/" className="shrink-0" aria-label={`Trang chủ ${siteName}`}>
            <span className="relative block h-8 w-[100px] sm:h-9 sm:w-[118px] lg:h-10 lg:w-[132px]">
              {logoUrl ? (
                <MediaImage
                  src={logoUrl}
                  alt={`Logo ${siteName}`}
                  width={600}
                  height={180}
                  fallbackLabel="Logo"
                  className="h-full w-full object-contain"
                  sizes="(max-width: 640px) 100px, (max-width: 1024px) 118px, 132px"
                  priority
                />
              ) : (
                <span className="inline-flex h-full w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  {siteName}
                </span>
              )}
            </span>
          </Link>

          {showHeaderSearch ? (
            <div className="min-w-0 flex-1 lg:mx-1 lg:min-w-[220px] lg:max-w-[min(100%,420px)] xl:max-w-[min(100%,460px)] 2xl:max-w-[min(100%,500px)]">
              <SearchBar compact className="min-w-0" placeholder={searchPlaceholder} />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <nav aria-label="Điều hướng chính" className="ml-auto hidden shrink-0 flex-nowrap items-center gap-2 lg:flex lg:gap-2">
            <HeaderDesktopCategoryMenu categories={categoryRows} danhMucHref={danhMucHref} navItemClass={navItemClass} />
            {navRows.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href} className={navItemClass}>
                {item.label}
              </Link>
            ))}
            <TopbarSupportButton className={navItemClass} variant="headerPill" />
            {showHeaderCartIcon ? <CartIcon withLabel className={navItemClass} /> : null}
            {showAdminNav && showHeaderAdminMenu ? (
              <AccountMenu isAuthenticated={isAuthenticated} isAdmin={isAdmin} myAccountHref={myAccountHref} loginHref="/tai-khoan" />
            ) : null}
          </nav>
        </div>

        {/* Mobile: 3 hàng giống app TMĐT mẫu */}
        <div className={`${STOREFRONT_FRAME} lg:hidden`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex h-12 items-center justify-between gap-2 py-1.5">
            <Link href="/" className="min-w-0 flex-1" aria-label={`Trang chủ ${siteName}`}>
              <span className="relative mx-auto block h-7 w-[106px]">
                {logoUrl ? (
                  <MediaImage
                    src={logoUrl}
                    alt={`Logo ${siteName}`}
                    width={600}
                    height={180}
                    fallbackLabel="Logo"
                    className="h-full w-full object-contain"
                    sizes="110px"
                  />
                ) : (
                  <span className="inline-flex h-full w-full items-center justify-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]">
                    {siteName}
                  </span>
                )}
              </span>
            </Link>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                {showHeaderCartIcon ? (
                  <CartIcon className="h-9 w-9 rounded-xl border border-[#E2E8F0] bg-white px-0 text-[#0F172A] shadow-sm" />
                ) : null}
                {showAdminNav && showHeaderAdminMenu ? (
                  <MobileAccountHeaderAction isAuthenticated={isAuthenticated} myAccountHref={myAccountHref} />
                ) : null}
              </div>
            </div>
          </div>

          {showHeaderSearch ? (
            <div className="pb-3">
              <div className="flex min-w-0 items-stretch gap-2">
                <AccountMobileHamburgerButton />
                <SearchBar
                  compact
                  className="min-w-0 flex-1"
                  placeholder={"Bạn cần tìm gì hôm nay?"}
                  hideSubmitButton
                  inputId="storefront-search-mobile"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
