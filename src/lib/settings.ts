export type TrustBarItem = {
  title: string;
  description: string;
};

export type HomeInfoCard = {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
};

/** 4 banner cam kết hiển thị phía trên footer storefront (ảnh đầy khung). */
export type FooterTrustBanner = {
  imageUrl: string;
  link: string;
  title: string;
  altText: string;
  objectPosition: string;
  imageFit: "contain" | "cover";
  enabled: boolean;
  sortOrder: number;
};

export function emptyFooterTrustBannerSlot(sortOrder: number): FooterTrustBanner {
  return {
    imageUrl: "",
    link: "",
    title: "",
    altText: "",
    objectPosition: "center center",
    imageFit: "contain",
    enabled: true,
    sortOrder,
  };
}

export function defaultFooterTrustBannersSlots(): FooterTrustBanner[] {
  return [1, 2, 3, 4].map(emptyFooterTrustBannerSlot);
}

export type HomeHeroBannerItem = {
  imageUrl: string;
  mobileImageUrl: string;
  link: string;
  /** Text dùng làm alt SEO cho ảnh banner. Nếu trống sẽ fallback về `title`. */
  altText?: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  enabled: boolean;
  sortOrder: number;
  /** Desktop hero banner chính — mặc định contain để tránh cắt chữ. */
  imageFit?: "contain" | "cover";
  objectPosition?: string;
  /** Mobile hero — mặc định contain; nên upload ảnh mobile riêng nếu muốn phủ kín (cover). */
  mobileImageFit?: "contain" | "cover";
  mobileObjectPosition?: string;
};

export type HomePromoCardItem = {
  /** Nếu có URL hợp lệ, storefront hiển thị ảnh phủ full khung card (object-cover). */
  imageUrl: string;
  link: string;
  title: string;
  description: string;
  /** Text dùng làm alt SEO cho ảnh card. Nếu trống sẽ fallback về `title`. */
  altText?: string;
  /** Tinh chỉnh trọng tâm ảnh khi render object-cover (vd: center center, left center). */
  objectPosition?: string;
  /** Chế độ fit ảnh card: contain để không crop, cover để phủ đầy khung. */
  imageFit?: "contain" | "cover";
  enabled: boolean;
  sortOrder: number;
};

export type HomeChipItem = {
  label: string;
  enabled: boolean;
  sortOrder: number;
};

export type HomeCategoryChipItem = {
  label: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
};

export type FooterLinkItem = {
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
};

export type FooterLinkGroup = {
  title: string;
  enabled: boolean;
  sortOrder: number;
  links: FooterLinkItem[];
};

export type FloatingCtaItem = {
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
};

export type DealsSectionConfig = {
  id: string;
  type:
    | "flash_sale"
    | "voucher_hot"
    | "deal_under_99k"
    | "freeship"
    | "trending"
    | "deep_discount";
  enabled: boolean;
  title: string;
  subtitle?: string;
  theme?: {
    preset?: "flash-sale" | "luxury" | "tet" | "neon" | "minimal" | "dark-sale";
    background?: string;
    textColor?: string;
    accentColor?: string;
  };
  banner?: {
    desktopImage?: string;
    mobileImage?: string;
    link?: string;
  };
  countdown?: {
    enabled: boolean;
    startsAt?: string;
    endsAt?: string;
  };
  productSource?: {
    type: "manual" | "sale" | "featured" | "trending" | "under_price" | "category" | "newest";
    productIds?: string[];
    categoryIds?: string[];
    limit?: number;
    maxPrice?: number;
    minDiscountPercent?: number;
  };
  voucherSource?: {
    couponIds?: string[];
  };
  experiment?: {
    experimentId: string;
    variantId: string;
    enabled: boolean;
  };
  sortOrder: number;
};

export type CustomerAccountBannerSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
};

export type CustomerAffiliateBannerSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
};

export type CustomerAccountSettings = {
  showOverview: boolean;
  showOrders: boolean;
  showOrderTimeline: boolean;
  showProfile: boolean;
  showAddresses: boolean;
  showCoupons: boolean;
  showNotifications: boolean;
  showSupport: boolean;
  showWarranty: boolean;
  showReturnRequest: boolean;
  showWishlist: boolean;
  showRecentlyViewed: boolean;
  showRecommendedProducts: boolean;
  showAffiliate: boolean;
  showSecurity: boolean;
  showPurchaseHistory: boolean;
  purchaseHistoryTitle: string;
  emptyPurchaseHistoryText: string;
  purchaseHistoryPageSize: number;
  enableOrderDetail: boolean;
  enableCancelOrder: boolean;
  enableReorder: boolean;
  enableReviewAfterPurchase: boolean;
  enableOrderSearch: boolean;
  enableOrderDateFilter: boolean;
  enableOrderStatusFilter: boolean;
  cancelOrderTimeLimitMinutes: number;
  orderSupportText: string;
  orderDetailTitle: string;
  accountTitle: string;
  accountSubtitle: string;
  welcomeMessage: string;
  emptyOrderText: string;
  shoppingCtaText: string;
  notificationTitle: string;
  couponTitle: string;
  supportTitle: string;
  warrantyTitle: string;
  returnRequestTitle: string;
  continueShoppingUrl: string;
  orderLookupUrl: string;
  supportPhone: string;
  supportZaloUrl: string;
  supportMessengerUrl: string;
  returnPolicyUrl: string;
  warrantyPolicyUrl: string;
  affiliateTitle: string;
  affiliateSubtitle: string;
  affiliateSupportText: string;
  affiliateTermsUrl: string;
  affiliateGuideUrl: string;
  affiliateMinWithdrawalAmount: number;
  affiliateDefaultCommissionText: string;
  affiliateGuideTitle: string;
  affiliateGuideIntro: string;
  affiliateGuideStep1: string;
  affiliateGuideStep2: string;
  affiliateGuideStep3: string;
  affiliateGuideStep4: string;
  affiliateGuideStep5: string;
  affiliateGuideStep6: string;
  affiliateGuideStep7: string;
  affiliateGuideStep8: string;
  affiliateCanBuy: boolean;
  affiliateDefaultTab: "affiliate" | "overview";
  affiliateBlockCheckoutMessage: string;
  affiliateShowPurchaseHistory: boolean;
  affiliateShowBuyerStats: boolean;
  affiliateShowShoppingCta: boolean;
  affiliateShowVoucher: boolean;
  affiliateShowAddressBook: boolean;
  affiliateShowSupport: boolean;
  affiliateShowWithdrawals: boolean;
  affiliateShowGuide: boolean;
  affiliateBanner: CustomerAffiliateBannerSettings;
  banner: CustomerAccountBannerSettings;
};

export type ProductDetailSettings = {
  enabled: boolean;
  buyNowLabel: string;
  addToCartLabel: string;
  showBestPriceNote: boolean;
  bestPriceLabel: string;
  showDiscountBadge: boolean;
  descriptionTitle: string;
  readMoreLabel: string;
  reviewTitle: string;
  reviewEmptyText: string;
  verifiedPurchaseLabel: string;
  soldLabel: string;
  ratingLabel: string;
  policyOfficialLabel: string;
  policyReturnLabel: string;
  policyShippingLabel: string;
  policyWarrantyLabel: string;
  showPolicyRow: boolean;
  showReviewSection: boolean;
  showRelatedProducts: boolean;
  hideTechnicalSpecs: boolean;
};

export type HeaderNavItem = {
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
};

export type WebsiteSettings = {
  siteName: string;
  slogan: string;
  shortDescription: string;
  siteUrl: string;
  canonicalBaseUrl: string;
  logoUrl: string;
  footerLogoUrl: string;
  productPlaceholderImage: string;
  faviconUrl: string;
  hotline: string;
  email: string;
  address: string;
  footerText: string;
  footerBrandName: string;
  footerBrandDescription: string;
  showFooterSocialLinks: boolean;
  footerFacebookUrl: string;
  footerInstagramUrl: string;
  footerTiktokUrl: string;
  footerYoutubeUrl: string;
  footerZaloUrl: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  defaultSeoKeywords: string;
  defaultOgImage: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  searchPlaceholder: string;
  socialLinks: SocialLink[];
  logo: string;
  footer: {
    company: string;
    address: string;
    copyright: string;
  };
  seoDefault: {
    siteName: string;
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
  /** Số Zalo (hiển thị / liên kệ). */
  zalo: string;
  showAnnouncementBar: boolean;
  announcementText: string;
  showStorefrontTopbar: boolean;
  topbarLeftText: string;
  topbarShippingText: string;
  topbarCommitmentText: string;
  showHeaderSearch: boolean;
  showHeaderCartIcon: boolean;
  showHeaderAdminMenu: boolean;
  headerDesktopCategoryLimit: number;
  headerMobileCategoryLimit: number;
  showTopHighlights: boolean;
  showHomeFeatureBlocks: boolean;
  showBottomTrustBlock: boolean;
  showHomeWhyChoose: boolean;
  showFooterLinkGroups: boolean;
  productGridColumnsDesktop: number;
  /** HTML chân trang bổ sung (tuỳ storefront render). */
  footerHtml: string;
  trustBarItems: TrustBarItem[];
  homeInfoCards: HomeInfoCard[];
  /** Banner cam kết dưới trang — tách khỏi homeInfoCards và hero promos. */
  footerTrustBanners: FooterTrustBanner[];
  homeQuickChips: HomeChipItem[];
  homeCategoryChips: HomeCategoryChipItem[];
  headerNavItems: HeaderNavItem[];
  footerLinkGroups: FooterLinkGroup[];
  floatingCtas: FloatingCtaItem[];
  dealsSections: DealsSectionConfig[];
  customerAccountSettings: CustomerAccountSettings;
  productDetailSettings: ProductDetailSettings;
  popupEnabled: boolean;
  popupTitle: string;
  popupContent: string;
  popupImageUrl: string;
  popupLink: string;
  popupDelayMs: number;
  popupFrequencyHours: number;
  businessHours: string;
  /** URL nhúng bản đồ hoặc liên kết Google Maps. */
  mapUrl: string;
  taxCode: string;
  defaultProductWarranty: string;
  analyticsEnabled: boolean;
  timezone: string;
  currency: string;
  trackingEnabled: boolean;
  affiliateEnabled: boolean;
  commissionRate: number;
  payoutThreshold: number;
  cookieDuration: number;
  attributionRule: string;
  rewardPointEnabled: boolean;
  withdrawalEnabled: boolean;
  ctvGuideContent: string;
  /** Tab thông báo “Hoa hồng” & realtime CTV — cấu hình Admin → CTV → Cài đặt. */
  affiliateCommissionTab: AffiliateCommissionTabSettings;
  ga4ScriptEnabled: boolean;
  metaPixelScriptEnabled: boolean;
  remarketingEventsEnabled: boolean;
  gtmContainerId: string;
  ga4MeasurementId: string;
  metaPixelId: string;
  tiktokPixelEnabled: boolean;
  zaloPixelEnabled: boolean;
  tiktokPixelId: string;
  zaloPixelId: string;
  clarityProjectId: string;
  headScripts: string;
  bodyScripts: string;
};

export type ThemeSettings = {
  primaryColor: string;
  primaryHoverColor: string;
  secondaryColor: string;
  ctaColor: string;
  ctaHoverColor: string;
  ratingColor: string;
  cardBorderColor: string;
  pageBackground: string;
  heroTitle: string;
  heroSubtitle: string;
  mainBannerImage: string;
  mainBannerHref: string;
  mainBannerTitle: string;
  mainBannerSubtitle: string;
  leftBannerTopImage: string;
  leftBannerTopHref: string;
  leftBannerBottomImage: string;
  leftBannerBottomHref: string;
  rightBannerTopImage: string;
  rightBannerTopHref: string;
  rightBannerBottomImage: string;
  rightBannerBottomHref: string;
  campaignBackgroundEnabled: boolean;
  campaignBackgroundImage: string;
  campaignBackgroundMobileImage: string;
  enableSiteBackgroundImage: boolean;
  siteBackgroundImage: string;
  homeBannerImage: string;
  homeBannerMobileImage: string;
  showHeroBanner: boolean;
  heroCtaLabel: string;
  heroCtaHref: string;
  enableFlashSaleSection: boolean;
  homeBanners: HomeHeroBannerItem[];
  homeRightPromoCards: HomePromoCardItem[];
  homeBottomPromoCards: HomePromoCardItem[];
  enableFeaturedSection: boolean;
  enableNewSection: boolean;
  enableBestSellerSection: boolean;
  enableBrandSection: boolean;
  enableBlogSection: boolean;
  productCardButtonMode: "solid" | "outline";
  productCardButtonText: string;
  productDetailPrimaryButtonText: string;
  showAddToCartButton: boolean;
  showBuyNowButton: boolean;
  homeBanner: {
    desktop: string;
    mobile: string;
  };
  toggleSections: {
    showFeaturedProducts: boolean;
    showBestSellerProducts: boolean;
    showNewProducts: boolean;
    showBlogSection: boolean;
    showBrandStrip: boolean;
    showTestimonials: boolean;
  };
};

import {
  DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS,
  normalizeAffiliateCommissionTabSettings,
  type AffiliateCommissionTabSettings,
} from "./affiliate-commission-tab-settings";
import { safeParseJson } from "./safe-json";
import { isPublicMediaUrl, normalizeBannerMediaUrl, normalizeMediaUrl } from "./media-url";
import { unstable_cache } from "next/cache";
import { cache } from "react";

function normalizeDealsSections(raw: unknown): DealsSectionConfig[] {
  if (!Array.isArray(raw)) return [...FALLBACK_WEBSITE_SETTINGS.dealsSections];
  const safe = raw
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row)))
    .map((row, idx) => {
      const id = toSafeString(row.id) || `deals_${idx + 1}`;
      const typeRaw = toSafeString(row.type) as DealsSectionConfig["type"];
      const type: DealsSectionConfig["type"] =
        typeRaw === "flash_sale" ||
        typeRaw === "voucher_hot" ||
        typeRaw === "deal_under_99k" ||
        typeRaw === "freeship" ||
        typeRaw === "trending" ||
        typeRaw === "deep_discount"
          ? typeRaw
          : "flash_sale";

      const productSourceRaw =
        row.productSource && typeof row.productSource === "object" && !Array.isArray(row.productSource)
          ? (row.productSource as Record<string, unknown>)
          : null;
      const productSourceType = toSafeString(productSourceRaw?.type) as DealsSectionConfig["productSource"]["type"];
      const productSource: DealsSectionConfig["productSource"] | undefined = productSourceRaw
        ? {
            type:
              productSourceType === "manual" ||
              productSourceType === "sale" ||
              productSourceType === "featured" ||
              productSourceType === "trending" ||
              productSourceType === "under_price" ||
              productSourceType === "category" ||
              productSourceType === "newest"
                ? productSourceType
                : "sale",
            productIds: Array.isArray(productSourceRaw.productIds)
              ? productSourceRaw.productIds.filter((v): v is string => typeof v === "string").slice(0, 200)
              : undefined,
            categoryIds: Array.isArray(productSourceRaw.categoryIds)
              ? productSourceRaw.categoryIds.filter((v): v is string => typeof v === "string").slice(0, 50)
              : undefined,
            limit: Math.max(0, Math.min(60, Number(productSourceRaw.limit ?? 0) || 0)) || undefined,
            maxPrice: Number.isFinite(Number(productSourceRaw.maxPrice)) ? Number(productSourceRaw.maxPrice) : undefined,
            minDiscountPercent: Number.isFinite(Number(productSourceRaw.minDiscountPercent))
              ? Number(productSourceRaw.minDiscountPercent)
              : undefined,
          }
        : undefined;

      const bannerRaw =
        row.banner && typeof row.banner === "object" && !Array.isArray(row.banner)
          ? (row.banner as Record<string, unknown>)
          : null;
      const countdownRaw =
        row.countdown && typeof row.countdown === "object" && !Array.isArray(row.countdown)
          ? (row.countdown as Record<string, unknown>)
          : null;
      const themeRaw =
        row.theme && typeof row.theme === "object" && !Array.isArray(row.theme)
          ? (row.theme as Record<string, unknown>)
          : null;
      const voucherSourceRaw =
        row.voucherSource && typeof row.voucherSource === "object" && !Array.isArray(row.voucherSource)
          ? (row.voucherSource as Record<string, unknown>)
          : null;
      const experimentRaw =
        row.experiment && typeof row.experiment === "object" && !Array.isArray(row.experiment)
          ? (row.experiment as Record<string, unknown>)
          : null;

      return {
        id,
        type,
        enabled: toSafeBoolean(row.enabled, false),
        title:
          toSafeString(row.title) ||
          FALLBACK_WEBSITE_SETTINGS.dealsSections.find((s) => s.type === type)?.title ||
          "Ưu đãi",
        subtitle: toSafeString(row.subtitle) || undefined,
        theme: themeRaw
          ? {
              preset: ((): DealsSectionConfig["theme"]["preset"] | undefined => {
                const p = toSafeString(themeRaw.preset);
                return p === "flash-sale" ||
                  p === "luxury" ||
                  p === "tet" ||
                  p === "neon" ||
                  p === "minimal" ||
                  p === "dark-sale"
                  ? p
                  : undefined;
              })(),
              background: toSafeString(themeRaw.background) || undefined,
              textColor: toSafeString(themeRaw.textColor) || undefined,
              accentColor: toSafeString(themeRaw.accentColor) || undefined,
            }
          : undefined,
        banner: bannerRaw
          ? {
              desktopImage: normalizeMediaUrl(toSafeString(bannerRaw.desktopImage)),
              mobileImage: normalizeMediaUrl(toSafeString(bannerRaw.mobileImage)),
              link: toSafeString(bannerRaw.link) || undefined,
            }
          : undefined,
        countdown: countdownRaw
          ? {
              enabled: toSafeBoolean(countdownRaw.enabled, false),
              startsAt: toSafeString(countdownRaw.startsAt) || undefined,
              endsAt: toSafeString(countdownRaw.endsAt) || undefined,
            }
          : undefined,
        productSource,
        voucherSource: voucherSourceRaw
          ? {
              couponIds: Array.isArray(voucherSourceRaw.couponIds)
                ? voucherSourceRaw.couponIds.filter((v): v is string => typeof v === "string").slice(0, 50)
                : undefined,
            }
          : undefined,
        experiment: experimentRaw
          ? {
              experimentId: toSafeString(experimentRaw.experimentId) || "",
              variantId: toSafeString(experimentRaw.variantId) || "",
              enabled: toSafeBoolean(experimentRaw.enabled, false),
            }
          : undefined,
        sortOrder: Math.max(0, Math.min(999, Number(row.sortOrder ?? idx + 1) || idx + 1)),
      } satisfies DealsSectionConfig;
    });

  const enabledCount = safe.filter((s) => s.enabled).length;
  const normalized = enabledCount ? safe : [...FALLBACK_WEBSITE_SETTINGS.dealsSections];
  return normalized.sort((a, b) => a.sortOrder - b.sortOrder);
}

export type SocialLink = {
  platform: string;
  label: string;
  url: string;
  icon?: string;
};

const FALLBACK_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: "Zendo.vn",
  slogan: "Mua sắm thông minh mỗi ngày",
  shortDescription:
    "Zendo.vn là website mua sắm đa ngành, tập trung vào điện tử, phụ kiện và sản phẩm thiết yếu.",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  canonicalBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  logoUrl: "",
  footerLogoUrl: "",
  productPlaceholderImage: "",
  faviconUrl: "",
  hotline: "1900 6868",
  email: "support@zendo.vn",
  address: "01 Nguyễn Văn Linh, Quận 7, TP. HCM",
  footerText: `© ${new Date().getFullYear()} Zendo.vn. Đã đăng ký bản quyền.`,
  footerBrandName: "Zendo.vn",
  footerBrandDescription:
    "Zendo.vn là website mua sắm đa ngành, tập trung vào điện tử, phụ kiện và sản phẩm thiết yếu.",
  showFooterSocialLinks: false,
  footerFacebookUrl: "",
  footerInstagramUrl: "",
  footerTiktokUrl: "",
  footerYoutubeUrl: "",
  footerZaloUrl: "",
  defaultSeoTitle: "Zendo.vn - Nền tảng mua sắm đa ngành",
  defaultSeoDescription:
    "Nền tảng thương mại điện tử đa ngành, giao hàng nhanh, giá tốt mỗi ngày.",
  defaultSeoKeywords: "zendo, thương mại điện tử, mua sắm online",
  defaultOgImage: "",
  robotsIndex: true,
  robotsFollow: true,
  searchPlaceholder: "Tìm sản phẩm, danh mục, thương hiệu...",
  socialLinks: [],
  logo: "",
  footer: {
    company: "Công ty Cổ phần Thương mại Zendo",
    address: "01 Nguyễn Văn Linh, Quận 7, TP. HCM",
    copyright: `© ${new Date().getFullYear()} Zendo.vn. Đã đăng ký bản quyền.`,
  },
  seoDefault: {
    siteName: "Zendo.vn",
    title: "Zendo.vn - Nền tảng mua sắm đa ngành",
    description: "Nền tảng thương mại điện tử đa ngành, giao hàng nhanh, giá tốt mỗi ngày.",
    keywords: ["zendo", "thương mại điện tử", "mua sắm online"],
    ogImage: "",
  },
  zalo: "",
  showAnnouncementBar: false,
  announcementText: "",
  showStorefrontTopbar: true,
  topbarLeftText: "Đa ngành uy tín, trọng tâm điện tử",
  topbarShippingText: "Giao nhanh • COD tiện lợi",
  topbarCommitmentText: "Đổi trả lỗi theo chính sách",
  showHeaderSearch: true,
  showHeaderCartIcon: true,
  showHeaderAdminMenu: true,
  headerDesktopCategoryLimit: 10,
  headerMobileCategoryLimit: 12,
  showTopHighlights: true,
  showHomeFeatureBlocks: true,
  showBottomTrustBlock: true,
  showHomeWhyChoose: true,
  showFooterLinkGroups: true,
  productGridColumnsDesktop: 6,
  footerHtml: "",
  trustBarItems: [],
  homeInfoCards: [
    { title: "Hàng chọn lọc rõ nguồn gốc", subtitle: "Cam kết chính hãng", icon: "shield", href: "", enabled: true, sortOrder: 1 },
    { title: "Giao nhanh toàn quốc", subtitle: "Theo dõi đơn minh bạch", icon: "truck", href: "", enabled: true, sortOrder: 2 },
    { title: "Kiểm tra hàng trước khi nhận", subtitle: "Mua sắm an tâm hơn", icon: "receipt", href: "", enabled: true, sortOrder: 3 },
    { title: "Đổi trả nếu lỗi theo chính sách", subtitle: "Hỗ trợ nhanh, rõ ràng", icon: "refresh", href: "", enabled: true, sortOrder: 4 },
  ],
  footerTrustBanners: defaultFooterTrustBannersSlots(),
  homeQuickChips: [
    { label: "Flash sale", enabled: true, sortOrder: 1 },
    { label: "Deal hot", enabled: true, sortOrder: 2 },
    { label: "Giá tốt", enabled: true, sortOrder: 3 },
    { label: "Mới về", enabled: true, sortOrder: 4 },
    { label: "Ưu đãi hôm nay", enabled: true, sortOrder: 5 },
  ],
  homeCategoryChips: [
    { label: "Nổi bật", slug: "", enabled: true, sortOrder: 1 },
    { label: "Điện tử", slug: "dien-tu", enabled: true, sortOrder: 2 },
    { label: "Phụ kiện", slug: "phu-kien", enabled: true, sortOrder: 3 },
    { label: "Gia dụng", slug: "gia-dung", enabled: true, sortOrder: 4 },
    { label: "Thể thao", slug: "the-thao", enabled: true, sortOrder: 5 },
  ],
  headerNavItems: [
    { label: "Cửa hàng", href: "/cua-hang", enabled: true, sortOrder: 1 },
    { label: "Bài viết", href: "/bai-viet", enabled: true, sortOrder: 2 },
  ],
  footerLinkGroups: [
    {
      title: "Mua sắm",
      enabled: true,
      sortOrder: 1,
      links: [
        { label: "Cửa hàng", href: "/cua-hang", enabled: true, sortOrder: 1 },
        { label: "Danh mục nổi bật", href: "/cua-hang", enabled: true, sortOrder: 2 },
        { label: "Giỏ hàng", href: "/gio-hang", enabled: true, sortOrder: 3 },
      ],
    },
    {
      title: "Hỗ trợ khách hàng",
      enabled: true,
      sortOrder: 2,
      links: [
        { label: "Tra cứu đơn", href: "/tra-cuu-don-hang", enabled: true, sortOrder: 1 },
        { label: "Liên hệ", href: "/lien-he", enabled: true, sortOrder: 2 },
      ],
    },
  ],
  floatingCtas: [
    { label: "Gọi hotline", href: "tel:19006868", enabled: true, sortOrder: 1 },
    { label: "Nhận tư vấn nhanh", href: "/lien-he", enabled: true, sortOrder: 2 },
    { label: "Mua ngay", href: "/cua-hang", enabled: true, sortOrder: 3 },
  ],
  dealsSections: [
    {
      id: "flash_sale",
      type: "flash_sale",
      enabled: true,
      title: "Flash Sale",
      subtitle: "Ưu đãi giới hạn thời gian với mức giá tốt.",
      countdown: { enabled: false },
      productSource: { type: "sale", limit: 12, minDiscountPercent: 10 },
      sortOrder: 1,
    },
    {
      id: "voucher_hot",
      type: "voucher_hot",
      enabled: true,
      title: "Voucher hot",
      subtitle: "Mã giảm giá đang hoạt động.",
      voucherSource: {},
      sortOrder: 2,
    },
    {
      id: "deal_under_99k",
      type: "deal_under_99k",
      enabled: true,
      title: "Deal dưới 99k",
      subtitle: "Săn deal giá tốt mỗi ngày.",
      productSource: { type: "under_price", limit: 12, maxPrice: 99000 },
      sortOrder: 3,
    },
    {
      id: "freeship",
      type: "freeship",
      enabled: true,
      title: "Freeship",
      subtitle: "Ưu đãi vận chuyển theo chương trình.",
      sortOrder: 4,
    },
    {
      id: "trending",
      type: "trending",
      enabled: true,
      title: "Trending",
      subtitle: "Sản phẩm được quan tâm nhiều.",
      productSource: { type: "trending", limit: 12 },
      sortOrder: 5,
    },
    {
      id: "deep_discount",
      type: "deep_discount",
      enabled: true,
      title: "Giảm sâu",
      subtitle: "Giá giảm mạnh, số lượng có hạn.",
      productSource: { type: "sale", limit: 12, minDiscountPercent: 30 },
      sortOrder: 6,
    },
  ],
  customerAccountSettings: {
    showOverview: true,
    showOrders: true,
    showOrderTimeline: true,
    showProfile: true,
    showAddresses: true,
    showCoupons: true,
    showNotifications: true,
    showSupport: true,
    showWarranty: true,
    showReturnRequest: true,
    showWishlist: true,
    showRecentlyViewed: true,
    showRecommendedProducts: true,
    showAffiliate: true,
    showSecurity: true,
    showPurchaseHistory: true,
    purchaseHistoryTitle: "Lịch sử mua hàng",
    emptyPurchaseHistoryText: "Chưa có đơn hàng trong danh sách này.",
    purchaseHistoryPageSize: 20,
    enableOrderDetail: true,
    enableCancelOrder: false,
    enableReorder: true,
    enableReviewAfterPurchase: true,
    enableOrderSearch: true,
    enableOrderDateFilter: true,
    enableOrderStatusFilter: true,
    cancelOrderTimeLimitMinutes: 30,
    orderSupportText: "Cần hỗ trợ đơn hàng? Liên hệ hotline hoặc Zalo trong mục Hỗ trợ.",
    orderDetailTitle: "Chi tiết đơn hàng",
    accountTitle: "Tài khoản của tôi",
    accountSubtitle: "Theo dõi đơn hàng, cập nhật hồ sơ và quản lý thông tin tài khoản.",
    welcomeMessage: "Chào mừng bạn quay lại Zendo.vn.",
    emptyOrderText: "Bạn chưa có đơn hàng nào.",
    shoppingCtaText: "Mua sắm ngay",
    notificationTitle: "Thông báo tài khoản",
    couponTitle: "Ưu đãi của bạn",
    supportTitle: "Hỗ trợ khách hàng",
    warrantyTitle: "Bảo hành sản phẩm",
    returnRequestTitle: "Yêu cầu đổi trả",
    continueShoppingUrl: "/cua-hang",
    orderLookupUrl: "/tra-cuu-don-hang",
    supportPhone: "1900 6868",
    supportZaloUrl: "",
    supportMessengerUrl: "",
    returnPolicyUrl: "/chinh-sach-doi-tra",
    warrantyPolicyUrl: "/chinh-sach-bao-hanh",
    affiliateTitle: "Trung tâm CTV / Affiliate",
    affiliateSubtitle: "Theo dõi hiệu suất giới thiệu, hoa hồng và điểm thưởng của bạn.",
    affiliateSupportText: "Liên hệ đội ngũ hỗ trợ CTV nếu bạn cần trợ giúp về link giới thiệu và hoa hồng.",
    affiliateTermsUrl: "",
    affiliateGuideUrl: "",
    affiliateMinWithdrawalAmount: 100000,
    affiliateDefaultCommissionText: "Hoa hồng được đối soát theo đơn hàng đủ điều kiện.",
    affiliateGuideTitle: "Hướng dẫn chi tiết CTV / Affiliate",
    affiliateGuideIntro: "Làm theo từng bước để triển khai link giới thiệu hiệu quả và tuân thủ chính sách.",
    affiliateGuideStep1:
      "Lấy link giới thiệu: vào Bộ tạo link giới thiệu, chọn loại link phù hợp và tạo link có mã ref cá nhân.",
    affiliateGuideStep2:
      "Chia sẻ link đúng cách: chia sẻ qua Zalo, Facebook, TikTok, website hoặc nhóm khách hàng phù hợp.",
    affiliateGuideStep3:
      "Khách bấm link và phát sinh đơn: hệ thống ghi nhận click/đơn hợp lệ theo mã ref, chỉ tính đơn đúng điều kiện.",
    affiliateGuideStep4:
      "Theo dõi đơn giới thiệu: vào mục Đơn giới thiệu để theo dõi trạng thái đơn và hoa hồng dự kiến.",
    affiliateGuideStep5:
      "Theo dõi hoa hồng & điểm thưởng: xem trạng thái chờ duyệt, đã duyệt, đã thanh toán.",
    affiliateGuideStep6:
      "Yêu cầu rút tiền: vào mục Yêu cầu rút tiền, kiểm tra mức rút tối thiểu và gửi yêu cầu khi được kích hoạt.",
    affiliateGuideStep7:
      "Quy định/lưu ý: không spam, không tự mua gian lận, chỉ tính đơn hợp lệ; vi phạm có thể bị khóa CTV.",
    affiliateGuideStep8:
      "Cần hỗ trợ: liên hệ hotline, Zalo, Messenger hoặc link hướng dẫn từ cài đặt quản trị.",
    affiliateCanBuy: false,
    affiliateDefaultTab: "affiliate",
    affiliateBlockCheckoutMessage:
      "Tài khoản Cộng tác viên hiện không thể đặt hàng trên website. Vui lòng liên hệ hỗ trợ nếu bạn cần mở quyền mua.",
    affiliateShowPurchaseHistory: false,
    affiliateShowBuyerStats: false,
    affiliateShowShoppingCta: false,
    affiliateShowVoucher: false,
    affiliateShowAddressBook: false,
    affiliateShowSupport: true,
    affiliateShowWithdrawals: true,
    affiliateShowGuide: true,
    affiliateBanner: {
      enabled: false,
      title: "",
      subtitle: "",
      imageUrl: "",
      buttonText: "",
      buttonUrl: "",
    },
    banner: {
      enabled: false,
      title: "",
      subtitle: "",
      imageUrl: "",
      buttonText: "",
      buttonUrl: "",
    },
  },
  productDetailSettings: {
    enabled: true,
    buyNowLabel: "Mua ngay",
    addToCartLabel: "Thêm vào giỏ",
    showBestPriceNote: true,
    bestPriceLabel: "Giá tốt nhất tại Zendo.vn",
    showDiscountBadge: true,
    descriptionTitle: "Mô tả sản phẩm",
    readMoreLabel: "Xem thêm",
    reviewTitle: "Đánh giá & Nhận xét",
    reviewEmptyText: "Sản phẩm chưa có đánh giá.",
    verifiedPurchaseLabel: "Đã mua hàng",
    soldLabel: "Đã bán",
    ratingLabel: "đánh giá",
    policyOfficialLabel: "100% Chính hãng",
    policyReturnLabel: "Đổi trả dễ dàng",
    policyShippingLabel: "Freeship toàn quốc",
    policyWarrantyLabel: "Bảo hành chính hãng",
    showPolicyRow: true,
    showReviewSection: true,
    showRelatedProducts: true,
    hideTechnicalSpecs: true,
  },
  popupEnabled: false,
  popupTitle: "",
  popupContent: "",
  popupImageUrl: "",
  popupLink: "",
  popupDelayMs: 2500,
  popupFrequencyHours: 12,
  businessHours: "Thứ 2 – CN: 8:00 – 22:00",
  mapUrl: "",
  taxCode: "",
  defaultProductWarranty: "",
  analyticsEnabled: true,
  timezone: "Asia/Ho_Chi_Minh",
  currency: "VND",
  trackingEnabled: true,
  affiliateEnabled: false,
  commissionRate: 5,
  payoutThreshold: 100000,
  cookieDuration: 30,
  attributionRule: "last_click",
  rewardPointEnabled: false,
  withdrawalEnabled: false,
  /** Để trống mặc định; nội dung hiển thị cho CTV do admin cấu hình hoặc bản mẫu ở tab Hướng dẫn. */
  ctvGuideContent: "",
  affiliateCommissionTab: { ...DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS },
  ga4ScriptEnabled: true,
  metaPixelScriptEnabled: true,
  remarketingEventsEnabled: true,
  gtmContainerId: "",
  ga4MeasurementId: "",
  metaPixelId: "",
  tiktokPixelEnabled: true,
  zaloPixelEnabled: true,
  tiktokPixelId: "",
  zaloPixelId: "",
  clarityProjectId: "",
  headScripts: "",
  bodyScripts: "",
};

const FALLBACK_THEME_SETTINGS: ThemeSettings = {
  primaryColor: "#2563EB",
  primaryHoverColor: "#1D4ED8",
  secondaryColor: "#0F172A",
  ctaColor: "#F59E0B",
  ctaHoverColor: "#D97706",
  ratingColor: "#F59E0B",
  cardBorderColor: "#E2E8F0",
  pageBackground: "#F8FAFC",
  heroTitle: "Nền tảng mua sắm đa ngành cho mọi gia đình Việt",
  heroSubtitle: "Sản phẩm chính hãng, giá tốt mỗi ngày, giao nhanh toàn quốc.",
  mainBannerImage: "",
  mainBannerHref: "",
  mainBannerTitle: "",
  mainBannerSubtitle: "",
  leftBannerTopImage: "",
  leftBannerTopHref: "",
  leftBannerBottomImage: "",
  leftBannerBottomHref: "",
  rightBannerTopImage: "",
  rightBannerTopHref: "",
  rightBannerBottomImage: "",
  rightBannerBottomHref: "",
  campaignBackgroundEnabled: false,
  campaignBackgroundImage: "",
  campaignBackgroundMobileImage: "",
  enableSiteBackgroundImage: false,
  siteBackgroundImage: "",
  homeBannerImage: "",
  homeBannerMobileImage: "",
  showHeroBanner: true,
  heroCtaLabel: "Mua ngay",
  heroCtaHref: "/cua-hang",
  enableFlashSaleSection: true,
  homeBanners: [],
  homeRightPromoCards: [
    { imageUrl: "", link: "", title: "Miễn phí giao hàng", description: "", altText: "Miễn phí giao hàng", objectPosition: "center center", imageFit: "cover", enabled: true, sortOrder: 1 },
    { imageUrl: "", link: "", title: "Thu thập voucher", description: "", altText: "Thu thập voucher", objectPosition: "center center", imageFit: "cover", enabled: true, sortOrder: 2 },
    { imageUrl: "", link: "", title: "Trả góp 0% lãi suất", description: "", altText: "Trả góp 0% lãi suất", objectPosition: "center center", imageFit: "cover", enabled: true, sortOrder: 3 },
    { imageUrl: "", link: "", title: "Bảo hành chính hãng", description: "", altText: "Bảo hành chính hãng", objectPosition: "center center", imageFit: "cover", enabled: true, sortOrder: 4 },
  ],
  homeBottomPromoCards: [
    { imageUrl: "", link: "", title: "Flash Sale", description: "", altText: "Flash Sale", objectPosition: "center center", imageFit: "contain", enabled: true, sortOrder: 1 },
    { imageUrl: "", link: "", title: "Deal hot", description: "", altText: "Deal hot", objectPosition: "center center", imageFit: "contain", enabled: true, sortOrder: 2 },
    { imageUrl: "", link: "", title: "Hàng mới về", description: "", altText: "Hàng mới về", objectPosition: "center center", imageFit: "contain", enabled: true, sortOrder: 3 },
    { imageUrl: "", link: "", title: "Voucher", description: "", altText: "Voucher", objectPosition: "center center", imageFit: "contain", enabled: true, sortOrder: 4 },
    { imageUrl: "", link: "", title: "Ưu đãi thành viên", description: "", altText: "Ưu đãi thành viên", objectPosition: "center center", imageFit: "contain", enabled: true, sortOrder: 5 },
  ],
  enableFeaturedSection: true,
  enableNewSection: true,
  enableBestSellerSection: true,
  enableBrandSection: true,
  enableBlogSection: true,
  productCardButtonMode: "solid",
  productCardButtonText: "Thêm giỏ",
  productDetailPrimaryButtonText: "Mua ngay",
  showAddToCartButton: true,
  showBuyNowButton: true,
  homeBanner: {
    desktop: "",
    mobile: "",
  },
  toggleSections: {
    showFeaturedProducts: true,
    showBestSellerProducts: true,
    showNewProducts: true,
    showBlogSection: true,
    showBrandStrip: true,
    showTestimonials: false,
  },
};

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProductCardButtonText(value: unknown): string {
  const text = toSafeString(value);
  if (!text) return FALLBACK_THEME_SETTINGS.productCardButtonText;
  if (text.toLocaleLowerCase("vi-VN") === "xem chi tiết") return "Thêm giỏ";
  return text;
}

function sanitizeDefaultOgImage(value: string): string {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return "";
  if (/og-default\.jpg/i.test(normalized)) return "";
  return normalized;
}

function toSafeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toSafeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toSafeNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizePromoObjectPosition(value: unknown): string {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) return "center center";
  const allowed = new Set(["center center", "left center", "right center", "center top", "center bottom"]);
  return allowed.has(normalized) ? normalized : "center center";
}

function sanitizePromoImageFit(value: unknown, fallback: "contain" | "cover"): "contain" | "cover" {
  const normalized = toSafeString(value).toLowerCase();
  if (normalized === "cover") return "cover";
  if (normalized === "contain") return "contain";
  return fallback;
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    return dbModule.db;
  } catch {
    return null;
  }
}

const readSettingValueCached = unstable_cache(
  async (key: string): Promise<unknown | null> => {
    const db = await getDbClient();
    if (!db) return null;
    const setting = await db.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return safeParseJson<unknown | null>(setting?.value, null, `settings:${key}`);
  },
  ["setting-value-v1"],
  { revalidate: 60 },
);

export async function getSettingValue<T>(key: string): Promise<T | null> {
  try {
    return (await readSettingValueCached(key)) as T | null;
  } catch (error) {
    void error;
    return null;
  }
}

export async function normalizeWebsiteSettings(
  value: unknown,
  socialLinksInput: unknown,
): Promise<WebsiteSettings> {
  const raw = toSafeObject(value) ?? {};
  const footer = toSafeObject(raw.footer);
  const seoDefault = toSafeObject(raw.seoDefault);
  const socialFromWebsite = Array.isArray(raw.socialLinks) ? raw.socialLinks : [];
  const socialRaw = Array.isArray(socialFromWebsite) && socialFromWebsite.length ? socialFromWebsite : socialLinksInput;
  const socialLinks = Array.isArray(socialRaw)
    ? socialRaw
        .map((item): SocialLink | null => {
          const normalized = toSafeObject(item);
          if (!normalized) return null;
          const url = toSafeString(normalized.url);
          if (!url) return null;
          return {
            platform: toSafeString(normalized.platform) || "social",
            label: toSafeString(normalized.label) || toSafeString(normalized.platform) || "Social",
            url,
            icon: toSafeString(normalized.icon) || undefined,
          };
        })
        .filter((item): item is SocialLink => Boolean(item))
    : [];

  const trustRaw = raw.trustBarItems;
  const trustBarItems: TrustBarItem[] = Array.isArray(trustRaw)
    ? trustRaw
        .map((item): TrustBarItem | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const title = toSafeString(t.title);
          const description = toSafeString(t.description);
          return { title, description };
        })
        .filter((item): item is TrustBarItem => Boolean(item))
        .slice(0, 4)
    : [];

  const homeInfoCardsRaw = raw.homeInfoCards;
  const homeInfoCards: HomeInfoCard[] = Array.isArray(homeInfoCardsRaw)
    ? homeInfoCardsRaw
        .map((item, index): HomeInfoCard | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const title = toSafeString(t.title);
          const subtitle = toSafeString(t.subtitle);
          const icon = toSafeString(t.icon);
          const href = toSafeString(t.href);
          return {
            title,
            subtitle,
            icon,
            href,
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
          };
        })
        .filter((item): item is HomeInfoCard => Boolean(item && item.title))
        .slice(0, 8)
    : FALLBACK_WEBSITE_SETTINGS.homeInfoCards;

  const footerTrustBannersRaw = raw.footerTrustBanners;
  const footerTrustBannerBuckets = new Map<number, FooterTrustBanner>();
  if (Array.isArray(footerTrustBannersRaw)) {
    footerTrustBannersRaw.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const t = item as Record<string, unknown>;
      const declaredOrder = toSafeNumber(t.sortOrder, index + 1);
      const sortOrder = Math.min(4, Math.max(1, Math.floor(declaredOrder)));
      const imageUrlNorm = normalizeMediaUrl(toSafeString(t.imageUrl));
      const preserved: FooterTrustBanner = {
        imageUrl: imageUrlNorm,
        link: toSafeString(t.link),
        title: toSafeString(t.title),
        altText: toSafeString(t.altText),
        objectPosition: sanitizePromoObjectPosition(t.objectPosition),
        imageFit: sanitizePromoImageFit(t.imageFit, "contain"),
        enabled: toSafeBoolean(t.enabled, true),
        sortOrder,
      };
      footerTrustBannerBuckets.set(sortOrder, preserved);
    });
  }
  const footerTrustBanners: FooterTrustBanner[] = [1, 2, 3, 4].map(
    (n) =>
      footerTrustBannerBuckets.get(n) ?? ({
        ...emptyFooterTrustBannerSlot(n),
      } satisfies FooterTrustBanner),
  );

  const homeQuickChipsRaw = raw.homeQuickChips;
  const homeQuickChips: HomeChipItem[] = Array.isArray(homeQuickChipsRaw)
    ? homeQuickChipsRaw
        .map((item, index): HomeChipItem | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const label = toSafeString(t.label);
          return {
            label,
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
          };
        })
        .filter((item): item is HomeChipItem => Boolean(item && item.label))
        .slice(0, 12)
    : FALLBACK_WEBSITE_SETTINGS.homeQuickChips;

  const homeCategoryChipsRaw = raw.homeCategoryChips;
  const homeCategoryChips: HomeCategoryChipItem[] = Array.isArray(homeCategoryChipsRaw)
    ? homeCategoryChipsRaw
        .map((item, index): HomeCategoryChipItem | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const label = toSafeString(t.label);
          return {
            label,
            slug: toSafeString(t.slug),
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
          };
        })
        .filter((item): item is HomeCategoryChipItem => Boolean(item && item.label))
        .slice(0, 12)
    : FALLBACK_WEBSITE_SETTINGS.homeCategoryChips;

  const headerNavItemsRaw = raw.headerNavItems;
  const headerNavItems: HeaderNavItem[] = Array.isArray(headerNavItemsRaw)
    ? headerNavItemsRaw
        .map((item, index): HeaderNavItem | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const label = toSafeString(t.label);
          const href = toSafeString(t.href);
          if (!label || !href) return null;
          return {
            label,
            href,
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
          };
        })
        .filter((item): item is HeaderNavItem => Boolean(item))
        .slice(0, 8)
    : FALLBACK_WEBSITE_SETTINGS.headerNavItems;

  const footerLinkGroupsRaw = raw.footerLinkGroups;
  const footerLinkGroups: FooterLinkGroup[] = Array.isArray(footerLinkGroupsRaw)
    ? footerLinkGroupsRaw
        .map((item, index): FooterLinkGroup | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const title = toSafeString(t.title);
          const linksRaw = Array.isArray(t.links) ? t.links : [];
          const links = linksRaw
            .map((linkItem, linkIndex): FooterLinkItem | null => {
              if (!linkItem || typeof linkItem !== "object") return null;
              const l = linkItem as Record<string, unknown>;
              const label = toSafeString(l.label);
              const href = toSafeString(l.href);
              if (!label || !href) return null;
              return {
                label,
                href,
                enabled: toSafeBoolean(l.enabled, true),
                sortOrder: toSafeNumber(l.sortOrder, linkIndex + 1),
              };
            })
            .filter((row): row is FooterLinkItem => Boolean(row))
            .slice(0, 20);
          if (!title) return null;
          return {
            title,
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
            links,
          };
        })
        .filter((row): row is FooterLinkGroup => Boolean(row))
        .slice(0, 6)
    : FALLBACK_WEBSITE_SETTINGS.footerLinkGroups;

  const floatingCtasRaw = raw.floatingCtas;
  const floatingCtas: FloatingCtaItem[] = Array.isArray(floatingCtasRaw)
    ? floatingCtasRaw
        .map((item, index): FloatingCtaItem | null => {
          if (!item || typeof item !== "object") return null;
          const t = item as Record<string, unknown>;
          const label = toSafeString(t.label);
          const href = toSafeString(t.href);
          if (!label || !href) return null;
          return {
            label,
            href,
            enabled: toSafeBoolean(t.enabled, true),
            sortOrder: toSafeNumber(t.sortOrder, index + 1),
          };
        })
        .filter((row): row is FloatingCtaItem => Boolean(row))
        .slice(0, 5)
    : FALLBACK_WEBSITE_SETTINGS.floatingCtas;
  const accountRaw = toSafeObject(raw.customerAccountSettings);
  const productDetailRaw = toSafeObject(raw.productDetailSettings);
  const accountBannerRaw = toSafeObject(accountRaw?.banner);
  const accountAffiliateBannerRaw = toSafeObject(accountRaw?.affiliateBanner);
  const customerAccountSettings: CustomerAccountSettings = {
    showOverview: toSafeBoolean(accountRaw?.showOverview, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showOverview),
    showOrders: toSafeBoolean(accountRaw?.showOrders, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showOrders),
    showOrderTimeline: toSafeBoolean(accountRaw?.showOrderTimeline, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showOrderTimeline),
    showProfile: toSafeBoolean(accountRaw?.showProfile, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showProfile),
    showAddresses: toSafeBoolean(accountRaw?.showAddresses, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showAddresses),
    showCoupons: toSafeBoolean(accountRaw?.showCoupons, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showCoupons),
    showNotifications: toSafeBoolean(accountRaw?.showNotifications, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showNotifications),
    showSupport: toSafeBoolean(accountRaw?.showSupport, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showSupport),
    showWarranty: toSafeBoolean(accountRaw?.showWarranty, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showWarranty),
    showReturnRequest: toSafeBoolean(accountRaw?.showReturnRequest, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showReturnRequest),
    showWishlist: toSafeBoolean(accountRaw?.showWishlist, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showWishlist),
    showRecentlyViewed: toSafeBoolean(accountRaw?.showRecentlyViewed, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showRecentlyViewed),
    showRecommendedProducts: toSafeBoolean(accountRaw?.showRecommendedProducts, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showRecommendedProducts),
    showAffiliate: toSafeBoolean(accountRaw?.showAffiliate, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showAffiliate),
    showSecurity: toSafeBoolean(accountRaw?.showSecurity, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showSecurity),
    showPurchaseHistory: toSafeBoolean(
      accountRaw?.showPurchaseHistory,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.showPurchaseHistory,
    ),
    purchaseHistoryTitle:
      toSafeString(accountRaw?.purchaseHistoryTitle) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.purchaseHistoryTitle,
    emptyPurchaseHistoryText:
      toSafeString(accountRaw?.emptyPurchaseHistoryText) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.emptyPurchaseHistoryText,
    purchaseHistoryPageSize: Math.max(
      5,
      Math.min(100, toSafeNumber(accountRaw?.purchaseHistoryPageSize, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.purchaseHistoryPageSize)),
    ),
    enableOrderDetail: toSafeBoolean(accountRaw?.enableOrderDetail, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableOrderDetail),
    enableCancelOrder: toSafeBoolean(accountRaw?.enableCancelOrder, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableCancelOrder),
    enableReorder: toSafeBoolean(accountRaw?.enableReorder, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableReorder),
    enableReviewAfterPurchase: toSafeBoolean(
      accountRaw?.enableReviewAfterPurchase,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableReviewAfterPurchase,
    ),
    enableOrderSearch: toSafeBoolean(accountRaw?.enableOrderSearch, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableOrderSearch),
    enableOrderDateFilter: toSafeBoolean(
      accountRaw?.enableOrderDateFilter,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableOrderDateFilter,
    ),
    enableOrderStatusFilter: toSafeBoolean(
      accountRaw?.enableOrderStatusFilter,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.enableOrderStatusFilter,
    ),
    cancelOrderTimeLimitMinutes: Math.max(
      0,
      Math.min(
        10_080,
        toSafeNumber(accountRaw?.cancelOrderTimeLimitMinutes, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.cancelOrderTimeLimitMinutes),
      ),
    ),
    orderSupportText:
      toSafeString(accountRaw?.orderSupportText) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.orderSupportText,
    orderDetailTitle:
      toSafeString(accountRaw?.orderDetailTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.orderDetailTitle,
    accountTitle: toSafeString(accountRaw?.accountTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.accountTitle,
    accountSubtitle: toSafeString(accountRaw?.accountSubtitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.accountSubtitle,
    welcomeMessage: toSafeString(accountRaw?.welcomeMessage) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.welcomeMessage,
    emptyOrderText: toSafeString(accountRaw?.emptyOrderText) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.emptyOrderText,
    shoppingCtaText: toSafeString(accountRaw?.shoppingCtaText) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.shoppingCtaText,
    notificationTitle: toSafeString(accountRaw?.notificationTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.notificationTitle,
    couponTitle: toSafeString(accountRaw?.couponTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.couponTitle,
    supportTitle: toSafeString(accountRaw?.supportTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.supportTitle,
    warrantyTitle: toSafeString(accountRaw?.warrantyTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.warrantyTitle,
    returnRequestTitle: toSafeString(accountRaw?.returnRequestTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.returnRequestTitle,
    continueShoppingUrl: toSafeString(accountRaw?.continueShoppingUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.continueShoppingUrl,
    orderLookupUrl: toSafeString(accountRaw?.orderLookupUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.orderLookupUrl,
    supportPhone: toSafeString(accountRaw?.supportPhone) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.supportPhone,
    supportZaloUrl: toSafeString(accountRaw?.supportZaloUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.supportZaloUrl,
    supportMessengerUrl: toSafeString(accountRaw?.supportMessengerUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.supportMessengerUrl,
    returnPolicyUrl: toSafeString(accountRaw?.returnPolicyUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.returnPolicyUrl,
    warrantyPolicyUrl: toSafeString(accountRaw?.warrantyPolicyUrl) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.warrantyPolicyUrl,
    affiliateTitle: toSafeString(accountRaw?.affiliateTitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateTitle,
    affiliateSubtitle: toSafeString(accountRaw?.affiliateSubtitle) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateSubtitle,
    affiliateSupportText: toSafeString(accountRaw?.affiliateSupportText) || FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateSupportText,
    affiliateTermsUrl: toSafeString(accountRaw?.affiliateTermsUrl),
    affiliateGuideUrl: toSafeString(accountRaw?.affiliateGuideUrl),
    affiliateMinWithdrawalAmount: Math.max(
      0,
      toSafeNumber(
        accountRaw?.affiliateMinWithdrawalAmount,
        FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateMinWithdrawalAmount,
      ),
    ),
    affiliateDefaultCommissionText:
      toSafeString(accountRaw?.affiliateDefaultCommissionText) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateDefaultCommissionText,
    affiliateGuideTitle:
      toSafeString(accountRaw?.affiliateGuideTitle) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideTitle,
    affiliateGuideIntro:
      toSafeString(accountRaw?.affiliateGuideIntro) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideIntro,
    affiliateGuideStep1:
      toSafeString(accountRaw?.affiliateGuideStep1) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep1,
    affiliateGuideStep2:
      toSafeString(accountRaw?.affiliateGuideStep2) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep2,
    affiliateGuideStep3:
      toSafeString(accountRaw?.affiliateGuideStep3) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep3,
    affiliateGuideStep4:
      toSafeString(accountRaw?.affiliateGuideStep4) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep4,
    affiliateGuideStep5:
      toSafeString(accountRaw?.affiliateGuideStep5) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep5,
    affiliateGuideStep6:
      toSafeString(accountRaw?.affiliateGuideStep6) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep6,
    affiliateGuideStep7:
      toSafeString(accountRaw?.affiliateGuideStep7) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep7,
    affiliateGuideStep8:
      toSafeString(accountRaw?.affiliateGuideStep8) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateGuideStep8,
    affiliateCanBuy: toSafeBoolean(accountRaw?.affiliateCanBuy, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateCanBuy),
    affiliateDefaultTab: ((): "affiliate" | "overview" => {
      const v = toSafeString(accountRaw?.affiliateDefaultTab).toLowerCase();
      return v === "overview" ? "overview" : "affiliate";
    })(),
    affiliateBlockCheckoutMessage:
      toSafeString(accountRaw?.affiliateBlockCheckoutMessage) ||
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateBlockCheckoutMessage,
    affiliateShowPurchaseHistory: toSafeBoolean(
      accountRaw?.affiliateShowPurchaseHistory,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowPurchaseHistory,
    ),
    affiliateShowBuyerStats: toSafeBoolean(
      accountRaw?.affiliateShowBuyerStats,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowBuyerStats,
    ),
    affiliateShowShoppingCta: toSafeBoolean(
      accountRaw?.affiliateShowShoppingCta,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowShoppingCta,
    ),
    affiliateShowVoucher: toSafeBoolean(
      accountRaw?.affiliateShowVoucher,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowVoucher,
    ),
    affiliateShowAddressBook: toSafeBoolean(
      accountRaw?.affiliateShowAddressBook,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowAddressBook,
    ),
    affiliateShowSupport: toSafeBoolean(
      accountRaw?.affiliateShowSupport,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowSupport,
    ),
    affiliateShowWithdrawals: toSafeBoolean(
      accountRaw?.affiliateShowWithdrawals,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowWithdrawals,
    ),
    affiliateShowGuide: toSafeBoolean(
      accountRaw?.affiliateShowGuide,
      FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateShowGuide,
    ),
    affiliateBanner: {
      enabled: toSafeBoolean(
        accountAffiliateBannerRaw?.enabled,
        FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.affiliateBanner.enabled,
      ),
      title: toSafeString(accountAffiliateBannerRaw?.title),
      subtitle: toSafeString(accountAffiliateBannerRaw?.subtitle),
      imageUrl: normalizeMediaUrl(toSafeString(accountAffiliateBannerRaw?.imageUrl)),
      buttonText: toSafeString(accountAffiliateBannerRaw?.buttonText),
      buttonUrl: toSafeString(accountAffiliateBannerRaw?.buttonUrl),
    },
    banner: {
      enabled: toSafeBoolean(accountBannerRaw?.enabled, FALLBACK_WEBSITE_SETTINGS.customerAccountSettings.banner.enabled),
      title: toSafeString(accountBannerRaw?.title),
      subtitle: toSafeString(accountBannerRaw?.subtitle),
      imageUrl: normalizeMediaUrl(toSafeString(accountBannerRaw?.imageUrl)),
      buttonText: toSafeString(accountBannerRaw?.buttonText),
      buttonUrl: toSafeString(accountBannerRaw?.buttonUrl),
    },
  };
  const productDetailSettings: ProductDetailSettings = {
    enabled: toSafeBoolean(productDetailRaw?.enabled, FALLBACK_WEBSITE_SETTINGS.productDetailSettings.enabled),
    buyNowLabel: toSafeString(productDetailRaw?.buyNowLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.buyNowLabel,
    addToCartLabel:
      toSafeString(productDetailRaw?.addToCartLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.addToCartLabel,
    showBestPriceNote: toSafeBoolean(
      productDetailRaw?.showBestPriceNote,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.showBestPriceNote,
    ),
    bestPriceLabel:
      toSafeString(productDetailRaw?.bestPriceLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.bestPriceLabel,
    showDiscountBadge: toSafeBoolean(
      productDetailRaw?.showDiscountBadge,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.showDiscountBadge,
    ),
    descriptionTitle:
      toSafeString(productDetailRaw?.descriptionTitle) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.descriptionTitle,
    readMoreLabel: toSafeString(productDetailRaw?.readMoreLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.readMoreLabel,
    reviewTitle: toSafeString(productDetailRaw?.reviewTitle) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.reviewTitle,
    reviewEmptyText:
      toSafeString(productDetailRaw?.reviewEmptyText) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.reviewEmptyText,
    verifiedPurchaseLabel:
      toSafeString(productDetailRaw?.verifiedPurchaseLabel) ||
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.verifiedPurchaseLabel,
    soldLabel: toSafeString(productDetailRaw?.soldLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.soldLabel,
    ratingLabel: toSafeString(productDetailRaw?.ratingLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.ratingLabel,
    policyOfficialLabel:
      toSafeString(productDetailRaw?.policyOfficialLabel) ||
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.policyOfficialLabel,
    policyReturnLabel:
      toSafeString(productDetailRaw?.policyReturnLabel) || FALLBACK_WEBSITE_SETTINGS.productDetailSettings.policyReturnLabel,
    policyShippingLabel:
      toSafeString(productDetailRaw?.policyShippingLabel) ||
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.policyShippingLabel,
    policyWarrantyLabel:
      toSafeString(productDetailRaw?.policyWarrantyLabel) ||
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.policyWarrantyLabel,
    showPolicyRow: toSafeBoolean(
      productDetailRaw?.showPolicyRow,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.showPolicyRow,
    ),
    showReviewSection: toSafeBoolean(
      productDetailRaw?.showReviewSection,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.showReviewSection,
    ),
    showRelatedProducts: toSafeBoolean(
      productDetailRaw?.showRelatedProducts,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.showRelatedProducts,
    ),
    hideTechnicalSpecs: toSafeBoolean(
      productDetailRaw?.hideTechnicalSpecs,
      FALLBACK_WEBSITE_SETTINGS.productDetailSettings.hideTechnicalSpecs,
    ),
  };

  const normalized: WebsiteSettings = {
    siteName: toSafeString(raw.siteName) || toSafeString(seoDefault?.siteName) || FALLBACK_WEBSITE_SETTINGS.siteName,
    slogan: toSafeString(raw.slogan) || FALLBACK_WEBSITE_SETTINGS.slogan,
    shortDescription:
      toSafeString(raw.shortDescription) ||
      toSafeString(seoDefault?.description) ||
      FALLBACK_WEBSITE_SETTINGS.shortDescription,
    siteUrl: toSafeString(raw.siteUrl) || FALLBACK_WEBSITE_SETTINGS.siteUrl,
    canonicalBaseUrl: toSafeString(raw.canonicalBaseUrl) || toSafeString(raw.siteUrl) || FALLBACK_WEBSITE_SETTINGS.canonicalBaseUrl,
    logoUrl: normalizeMediaUrl(toSafeString(raw.logoUrl) || toSafeString(raw.logo)),
    footerLogoUrl: normalizeMediaUrl(toSafeString(raw.footerLogoUrl) || toSafeString(raw.logoUrl) || toSafeString(raw.logo)),
    productPlaceholderImage: normalizeMediaUrl(toSafeString(raw.productPlaceholderImage)),
    faviconUrl: normalizeMediaUrl(toSafeString(raw.faviconUrl)),
    hotline: toSafeString(raw.hotline) || FALLBACK_WEBSITE_SETTINGS.hotline,
    email: toSafeString(raw.email) || FALLBACK_WEBSITE_SETTINGS.email,
    address: toSafeString(raw.address) || toSafeString(footer?.address) || FALLBACK_WEBSITE_SETTINGS.address,
    footerText:
      toSafeString(raw.footerText) ||
      toSafeString(footer?.copyright) ||
      FALLBACK_WEBSITE_SETTINGS.footerText,
    footerBrandName:
      toSafeString(raw.footerBrandName) ||
      toSafeString(raw.siteName) ||
      FALLBACK_WEBSITE_SETTINGS.footerBrandName,
    footerBrandDescription:
      toSafeString(raw.footerBrandDescription) ||
      toSafeString(raw.shortDescription) ||
      toSafeString(raw.defaultSeoDescription) ||
      FALLBACK_WEBSITE_SETTINGS.footerBrandDescription,
    showFooterSocialLinks: toSafeBoolean(
      raw.showFooterSocialLinks,
      FALLBACK_WEBSITE_SETTINGS.showFooterSocialLinks,
    ),
    footerFacebookUrl: toSafeString(raw.footerFacebookUrl),
    footerInstagramUrl: toSafeString(raw.footerInstagramUrl),
    footerTiktokUrl: toSafeString(raw.footerTiktokUrl),
    footerYoutubeUrl: toSafeString(raw.footerYoutubeUrl),
    footerZaloUrl: toSafeString(raw.footerZaloUrl),
    defaultSeoTitle:
      toSafeString(raw.defaultSeoTitle) || toSafeString(seoDefault?.title) || FALLBACK_WEBSITE_SETTINGS.defaultSeoTitle,
    defaultSeoDescription:
      toSafeString(raw.defaultSeoDescription) ||
      toSafeString(seoDefault?.description) ||
      FALLBACK_WEBSITE_SETTINGS.defaultSeoDescription,
    defaultSeoKeywords:
      toSafeString(raw.defaultSeoKeywords) ||
      (Array.isArray(seoDefault?.keywords) ? seoDefault.keywords.filter((item): item is string => typeof item === "string").join(", ") : "") ||
      FALLBACK_WEBSITE_SETTINGS.defaultSeoKeywords,
    defaultOgImage: sanitizeDefaultOgImage(
      toSafeString(raw.defaultOgImage) || toSafeString(seoDefault?.ogImage) || FALLBACK_WEBSITE_SETTINGS.defaultOgImage,
    ),
    robotsIndex: toSafeBoolean(raw.robotsIndex, FALLBACK_WEBSITE_SETTINGS.robotsIndex),
    robotsFollow: toSafeBoolean(raw.robotsFollow, FALLBACK_WEBSITE_SETTINGS.robotsFollow),
    searchPlaceholder:
      toSafeString(raw.searchPlaceholder) || FALLBACK_WEBSITE_SETTINGS.searchPlaceholder,
    socialLinks,
    logo: normalizeMediaUrl(toSafeString(raw.logoUrl) || toSafeString(raw.logo)),
    footer: {
      company:
        toSafeString(raw.footerBrandName) ||
        toSafeString(footer?.company) ||
        FALLBACK_WEBSITE_SETTINGS.footer.company,
      address: toSafeString(raw.address) || toSafeString(footer?.address) || FALLBACK_WEBSITE_SETTINGS.footer.address,
      copyright:
        toSafeString(raw.footerText) ||
        toSafeString(footer?.copyright) ||
        FALLBACK_WEBSITE_SETTINGS.footer.copyright,
    },
    seoDefault: {
      siteName: toSafeString(raw.siteName) || toSafeString(seoDefault?.siteName) || FALLBACK_WEBSITE_SETTINGS.seoDefault.siteName,
      title:
        toSafeString(raw.defaultSeoTitle) ||
        toSafeString(seoDefault?.title) ||
        FALLBACK_WEBSITE_SETTINGS.seoDefault.title,
      description:
        toSafeString(raw.defaultSeoDescription) ||
        toSafeString(seoDefault?.description) ||
        FALLBACK_WEBSITE_SETTINGS.seoDefault.description,
      keywords: Array.isArray(seoDefault?.keywords)
        ? seoDefault.keywords.filter((item): item is string => typeof item === "string")
        : toSafeString(raw.defaultSeoKeywords)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 30),
      ogImage: sanitizeDefaultOgImage(
        toSafeString(raw.defaultOgImage) ||
          toSafeString(seoDefault?.ogImage) ||
          FALLBACK_WEBSITE_SETTINGS.seoDefault.ogImage,
      ),
    },
    zalo: toSafeString(raw.zalo),
    showAnnouncementBar: toSafeBoolean(raw.showAnnouncementBar, FALLBACK_WEBSITE_SETTINGS.showAnnouncementBar),
    announcementText: toSafeString(raw.announcementText),
    showStorefrontTopbar: toSafeBoolean(raw.showStorefrontTopbar, FALLBACK_WEBSITE_SETTINGS.showStorefrontTopbar),
    topbarLeftText: toSafeString(raw.topbarLeftText) || FALLBACK_WEBSITE_SETTINGS.topbarLeftText,
    topbarShippingText:
      toSafeString(raw.topbarShippingText) || FALLBACK_WEBSITE_SETTINGS.topbarShippingText,
    topbarCommitmentText:
      toSafeString(raw.topbarCommitmentText) || FALLBACK_WEBSITE_SETTINGS.topbarCommitmentText,
    showHeaderSearch: toSafeBoolean(raw.showHeaderSearch, FALLBACK_WEBSITE_SETTINGS.showHeaderSearch),
    showHeaderCartIcon: toSafeBoolean(raw.showHeaderCartIcon, FALLBACK_WEBSITE_SETTINGS.showHeaderCartIcon),
    showHeaderAdminMenu: toSafeBoolean(raw.showHeaderAdminMenu, FALLBACK_WEBSITE_SETTINGS.showHeaderAdminMenu),
    headerDesktopCategoryLimit: Math.max(
      1,
      Math.min(20, toSafeNumber(raw.headerDesktopCategoryLimit, FALLBACK_WEBSITE_SETTINGS.headerDesktopCategoryLimit)),
    ),
    headerMobileCategoryLimit: Math.max(
      1,
      Math.min(30, toSafeNumber(raw.headerMobileCategoryLimit, FALLBACK_WEBSITE_SETTINGS.headerMobileCategoryLimit)),
    ),
    showTopHighlights: toSafeBoolean(raw.showTopHighlights, FALLBACK_WEBSITE_SETTINGS.showTopHighlights),
    showHomeFeatureBlocks: toSafeBoolean(
      raw.showHomeFeatureBlocks,
      FALLBACK_WEBSITE_SETTINGS.showHomeFeatureBlocks,
    ),
    showBottomTrustBlock: toSafeBoolean(raw.showBottomTrustBlock, FALLBACK_WEBSITE_SETTINGS.showBottomTrustBlock),
    showHomeWhyChoose: toSafeBoolean(raw.showHomeWhyChoose, FALLBACK_WEBSITE_SETTINGS.showHomeWhyChoose),
    showFooterLinkGroups: toSafeBoolean(raw.showFooterLinkGroups, FALLBACK_WEBSITE_SETTINGS.showFooterLinkGroups),
    productGridColumnsDesktop: Math.max(
      4,
      Math.min(6, toSafeNumber(raw.productGridColumnsDesktop, FALLBACK_WEBSITE_SETTINGS.productGridColumnsDesktop)),
    ),
    footerHtml: toSafeString(raw.footerHtml),
    trustBarItems,
    homeInfoCards,
    footerTrustBanners,
    homeQuickChips,
    homeCategoryChips,
    headerNavItems,
    footerLinkGroups,
    floatingCtas,
    dealsSections: normalizeDealsSections(raw.dealsSections),
    customerAccountSettings,
    productDetailSettings,
    popupEnabled: toSafeBoolean(raw.popupEnabled, FALLBACK_WEBSITE_SETTINGS.popupEnabled),
    popupTitle: toSafeString(raw.popupTitle),
    popupContent: toSafeString(raw.popupContent),
    popupImageUrl: normalizeMediaUrl(toSafeString(raw.popupImageUrl)),
    popupLink: toSafeString(raw.popupLink),
    popupDelayMs: Math.max(0, Math.min(30000, toSafeNumber(raw.popupDelayMs, FALLBACK_WEBSITE_SETTINGS.popupDelayMs))),
    popupFrequencyHours: Math.max(
      1,
      Math.min(168, toSafeNumber(raw.popupFrequencyHours, FALLBACK_WEBSITE_SETTINGS.popupFrequencyHours)),
    ),
    businessHours: toSafeString(raw.businessHours) || FALLBACK_WEBSITE_SETTINGS.businessHours,
    mapUrl: toSafeString(raw.mapUrl),
    taxCode: toSafeString(raw.taxCode),
    defaultProductWarranty: toSafeString(raw.defaultProductWarranty),
    analyticsEnabled: toSafeBoolean(
      raw.analyticsEnabled,
      FALLBACK_WEBSITE_SETTINGS.analyticsEnabled,
    ),
    timezone: toSafeString(raw.timezone) || FALLBACK_WEBSITE_SETTINGS.timezone,
    currency: toSafeString(raw.currency) || FALLBACK_WEBSITE_SETTINGS.currency,
    trackingEnabled: toSafeBoolean(raw.trackingEnabled, FALLBACK_WEBSITE_SETTINGS.trackingEnabled),
    affiliateEnabled: toSafeBoolean(
      raw.affiliateEnabled,
      FALLBACK_WEBSITE_SETTINGS.affiliateEnabled,
    ),
    commissionRate: toSafeNumber(
      raw.commissionRate ?? raw.affiliateCommissionRate,
      FALLBACK_WEBSITE_SETTINGS.commissionRate,
    ),
    payoutThreshold: toSafeNumber(
      raw.payoutThreshold ?? raw.affiliatePayoutThreshold,
      FALLBACK_WEBSITE_SETTINGS.payoutThreshold,
    ),
    cookieDuration: toSafeNumber(
      raw.cookieDuration ?? raw.affiliateCookieDurationDays,
      FALLBACK_WEBSITE_SETTINGS.cookieDuration,
    ),
    attributionRule:
      toSafeString(raw.attributionRule ?? raw.affiliateAttributionRule) ||
      FALLBACK_WEBSITE_SETTINGS.attributionRule,
    rewardPointEnabled: toSafeBoolean(
      raw.rewardPointEnabled ?? raw.affiliateRewardPointsEnabled,
      FALLBACK_WEBSITE_SETTINGS.rewardPointEnabled,
    ),
    withdrawalEnabled: toSafeBoolean(
      raw.withdrawalEnabled,
      FALLBACK_WEBSITE_SETTINGS.withdrawalEnabled,
    ),
    ctvGuideContent:
      toSafeString(raw.ctvGuideContent) || FALLBACK_WEBSITE_SETTINGS.ctvGuideContent,
    affiliateCommissionTab: normalizeAffiliateCommissionTabSettings(raw),
    ga4ScriptEnabled: toSafeBoolean(raw.ga4ScriptEnabled, FALLBACK_WEBSITE_SETTINGS.ga4ScriptEnabled),
    metaPixelScriptEnabled: toSafeBoolean(raw.metaPixelScriptEnabled, FALLBACK_WEBSITE_SETTINGS.metaPixelScriptEnabled),
    remarketingEventsEnabled: toSafeBoolean(
      raw.remarketingEventsEnabled,
      FALLBACK_WEBSITE_SETTINGS.remarketingEventsEnabled,
    ),
    gtmContainerId: toSafeString(raw.gtmContainerId),
    ga4MeasurementId: toSafeString(raw.ga4MeasurementId),
    metaPixelId: toSafeString(raw.metaPixelId),
    tiktokPixelEnabled: toSafeBoolean(
      raw.tiktokPixelEnabled,
      FALLBACK_WEBSITE_SETTINGS.tiktokPixelEnabled,
    ),
    zaloPixelEnabled: toSafeBoolean(
      raw.zaloPixelEnabled,
      FALLBACK_WEBSITE_SETTINGS.zaloPixelEnabled,
    ),
    tiktokPixelId: toSafeString(raw.tiktokPixelId),
    zaloPixelId: toSafeString(raw.zaloPixelId),
    clarityProjectId: toSafeString(raw.clarityProjectId),
    headScripts: toSafeString(raw.headScripts),
    bodyScripts: toSafeString(raw.bodyScripts),
  };


  return normalized;
}

export async function normalizeThemeSettings(value: unknown): Promise<ThemeSettings> {
  const raw = toSafeObject(value) ?? {};
  const homeBanner = toSafeObject(raw.homeBanner);
  const toggleSections = toSafeObject(raw.toggleSections);
  const mode = toSafeString(raw.productCardButtonMode);
  const productCardButtonMode: "solid" | "outline" =
    mode === "outline" || mode === "solid"
      ? mode
      : toSafeString(raw.secondaryColor)
        ? "solid"
        : FALLBACK_THEME_SETTINGS.productCardButtonMode;

  const rawDesktopBanner =
    toSafeString(raw.mainBannerImage) ||
    toSafeString(raw.homeBannerImage) ||
    toSafeString(homeBanner?.desktop) ||
    FALLBACK_THEME_SETTINGS.homeBanner.desktop;
  const rawMobileBanner =
    toSafeString(raw.homeBannerMobileImage) ||
    toSafeString(homeBanner?.mobile) ||
    FALLBACK_THEME_SETTINGS.homeBanner.mobile;
  const safeDesktopBanner = await normalizeBannerMediaUrl(rawDesktopBanner);
  const safeMobileBanner = await normalizeBannerMediaUrl(rawMobileBanner);
  const leftBannerTopImage = await normalizeBannerMediaUrl(toSafeString(raw.leftBannerTopImage));
  const leftBannerBottomImage = await normalizeBannerMediaUrl(toSafeString(raw.leftBannerBottomImage));
  const rightBannerTopImage = await normalizeBannerMediaUrl(toSafeString(raw.rightBannerTopImage));
  const rightBannerBottomImage = await normalizeBannerMediaUrl(toSafeString(raw.rightBannerBottomImage));
  const siteBackgroundImage = await normalizeBannerMediaUrl(
    toSafeString(raw.siteBackgroundImage) || toSafeString(raw.themeBackgroundImage),
  );
  const campaignBackgroundRaw = normalizeMediaUrl(toSafeString(raw.campaignBackgroundImage));
  const campaignBackgroundMobileRaw = normalizeMediaUrl(toSafeString(raw.campaignBackgroundMobileImage));
  const campaignBackgroundImage = isPublicMediaUrl(campaignBackgroundRaw) ? campaignBackgroundRaw : "";
  const campaignBackgroundMobileImage = isPublicMediaUrl(campaignBackgroundMobileRaw)
    ? campaignBackgroundMobileRaw
    : "";
  const homeBannersRaw = Array.isArray(raw.homeBanners) ? raw.homeBanners : [];
  const homeBanners: HomeHeroBannerItem[] = [];
  for (const [index, item] of homeBannersRaw.entries()) {
    const banner = toSafeObject(item);
    if (!banner) continue;
    const desktop = await normalizeBannerMediaUrl(toSafeString(banner.imageUrl));
    if (!desktop) continue;
    const mobile = (await normalizeBannerMediaUrl(toSafeString(banner.mobileImageUrl))) || desktop;
    homeBanners.push({
      imageUrl: desktop,
      mobileImageUrl: mobile,
      link: toSafeString(banner.link),
      altText: toSafeString(banner.altText),
      title: toSafeString(banner.title),
      subtitle: toSafeString(banner.subtitle),
      ctaLabel: toSafeString(banner.ctaLabel),
      ctaHref: toSafeString(banner.ctaHref),
      enabled: toSafeBoolean(banner.enabled, true),
      sortOrder: toSafeNumber(banner.sortOrder, index + 1),
      imageFit: sanitizePromoImageFit(banner.imageFit, "contain"),
      objectPosition: sanitizePromoObjectPosition(banner.objectPosition),
      mobileImageFit: sanitizePromoImageFit(banner.mobileImageFit, "contain"),
      mobileObjectPosition: sanitizePromoObjectPosition(banner.mobileObjectPosition),
    });
  }

  const homeRightPromoCardsRaw = Array.isArray(raw.homeRightPromoCards) ? raw.homeRightPromoCards : [];
  const homeRightPromoCards: HomePromoCardItem[] = [];
  for (const [index, item] of homeRightPromoCardsRaw.entries()) {
    const card = toSafeObject(item);
    if (!card) continue;
    const imageUrl = await normalizeBannerMediaUrl(toSafeString(card.imageUrl));
    homeRightPromoCards.push({
      imageUrl: imageUrl || "",
      link: toSafeString(card.link) || toSafeString(card.href),
      title: toSafeString(card.title),
      description: toSafeString(card.description),
      altText: toSafeString(card.altText),
      objectPosition: sanitizePromoObjectPosition(card.objectPosition),
      imageFit: sanitizePromoImageFit(card.imageFit, "cover"),
      enabled: toSafeBoolean(card.enabled, true),
      sortOrder: toSafeNumber(card.sortOrder, index + 1),
    });
  }

  const homeBottomPromoCardsRaw = Array.isArray(raw.homeBottomPromoCards) ? raw.homeBottomPromoCards : [];
  const homeBottomPromoCards: HomePromoCardItem[] = [];
  for (const [index, item] of homeBottomPromoCardsRaw.entries()) {
    const card = toSafeObject(item);
    if (!card) continue;
    const imageUrl = await normalizeBannerMediaUrl(toSafeString(card.imageUrl));
    homeBottomPromoCards.push({
      imageUrl: imageUrl || "",
      link: toSafeString(card.link) || toSafeString(card.href),
      title: toSafeString(card.title),
      description: toSafeString(card.description),
      altText: toSafeString(card.altText),
      objectPosition: sanitizePromoObjectPosition(card.objectPosition),
      imageFit: sanitizePromoImageFit(card.imageFit, "contain"),
      enabled: toSafeBoolean(card.enabled, true),
      sortOrder: toSafeNumber(card.sortOrder, index + 1),
    });
  }
  const normalized: ThemeSettings = {
    primaryColor: toSafeString(raw.primaryColor) || FALLBACK_THEME_SETTINGS.primaryColor,
    primaryHoverColor: toSafeString(raw.primaryHoverColor) || FALLBACK_THEME_SETTINGS.primaryHoverColor,
    secondaryColor: toSafeString(raw.secondaryColor) || FALLBACK_THEME_SETTINGS.secondaryColor,
    ctaColor: toSafeString(raw.ctaColor) || FALLBACK_THEME_SETTINGS.ctaColor,
    ctaHoverColor: toSafeString(raw.ctaHoverColor) || FALLBACK_THEME_SETTINGS.ctaHoverColor,
    ratingColor: toSafeString(raw.ratingColor) || FALLBACK_THEME_SETTINGS.ratingColor,
    cardBorderColor: toSafeString(raw.cardBorderColor) || FALLBACK_THEME_SETTINGS.cardBorderColor,
    pageBackground: toSafeString(raw.pageBackground) || FALLBACK_THEME_SETTINGS.pageBackground,
    heroTitle: toSafeString(raw.heroTitle) || FALLBACK_THEME_SETTINGS.heroTitle,
    heroSubtitle: toSafeString(raw.heroSubtitle) || FALLBACK_THEME_SETTINGS.heroSubtitle,
    mainBannerImage: safeDesktopBanner,
    mainBannerHref: toSafeString(raw.mainBannerHref) || toSafeString(raw.heroCtaHref),
    mainBannerTitle: toSafeString(raw.mainBannerTitle) || toSafeString(raw.heroTitle),
    mainBannerSubtitle: toSafeString(raw.mainBannerSubtitle) || toSafeString(raw.heroSubtitle),
    leftBannerTopImage,
    leftBannerTopHref: toSafeString(raw.leftBannerTopHref),
    leftBannerBottomImage,
    leftBannerBottomHref: toSafeString(raw.leftBannerBottomHref),
    rightBannerTopImage,
    rightBannerTopHref: toSafeString(raw.rightBannerTopHref),
    rightBannerBottomImage,
    rightBannerBottomHref: toSafeString(raw.rightBannerBottomHref),
    campaignBackgroundEnabled: toSafeBoolean(
      raw.campaignBackgroundEnabled,
      FALLBACK_THEME_SETTINGS.campaignBackgroundEnabled,
    ),
    campaignBackgroundImage,
    campaignBackgroundMobileImage,
    enableSiteBackgroundImage: toSafeBoolean(raw.enableSiteBackgroundImage, FALLBACK_THEME_SETTINGS.enableSiteBackgroundImage),
    siteBackgroundImage,
    homeBannerImage: safeDesktopBanner,
    homeBannerMobileImage: safeMobileBanner || safeDesktopBanner,
    showHeroBanner: toSafeBoolean(raw.showHeroBanner, FALLBACK_THEME_SETTINGS.showHeroBanner),
    heroCtaLabel: toSafeString(raw.heroCtaLabel) || FALLBACK_THEME_SETTINGS.heroCtaLabel,
    heroCtaHref: toSafeString(raw.heroCtaHref) || FALLBACK_THEME_SETTINGS.heroCtaHref,
    enableFlashSaleSection: toSafeBoolean(raw.enableFlashSaleSection, FALLBACK_THEME_SETTINGS.enableFlashSaleSection),
    homeBanners: homeBanners.slice(0, 4),
    homeRightPromoCards:
      homeRightPromoCards.length > 0 ? homeRightPromoCards.slice(0, 4) : FALLBACK_THEME_SETTINGS.homeRightPromoCards,
    homeBottomPromoCards:
      homeBottomPromoCards.length > 0 ? homeBottomPromoCards.slice(0, 5) : FALLBACK_THEME_SETTINGS.homeBottomPromoCards,
    enableFeaturedSection: toSafeBoolean(
      raw.enableFeaturedSection,
      toSafeBoolean(toggleSections?.showFeaturedProducts, FALLBACK_THEME_SETTINGS.enableFeaturedSection),
    ),
    enableNewSection: toSafeBoolean(
      raw.enableNewSection,
      toSafeBoolean(toggleSections?.showNewProducts, FALLBACK_THEME_SETTINGS.enableNewSection),
    ),
    enableBestSellerSection: toSafeBoolean(
      raw.enableBestSellerSection,
      toSafeBoolean(toggleSections?.showBestSellerProducts, FALLBACK_THEME_SETTINGS.enableBestSellerSection),
    ),
    enableBrandSection: toSafeBoolean(
      raw.enableBrandSection,
      toSafeBoolean(toggleSections?.showBrandStrip, FALLBACK_THEME_SETTINGS.enableBrandSection),
    ),
    enableBlogSection: toSafeBoolean(
      raw.enableBlogSection,
      toSafeBoolean(toggleSections?.showBlogSection, FALLBACK_THEME_SETTINGS.enableBlogSection),
    ),
    productCardButtonMode,
    productCardButtonText: normalizeProductCardButtonText(raw.productCardButtonText),
    productDetailPrimaryButtonText:
      toSafeString(raw.productDetailPrimaryButtonText) ||
      FALLBACK_THEME_SETTINGS.productDetailPrimaryButtonText,
    showAddToCartButton: toSafeBoolean(raw.showAddToCartButton, FALLBACK_THEME_SETTINGS.showAddToCartButton),
    showBuyNowButton: toSafeBoolean(raw.showBuyNowButton, FALLBACK_THEME_SETTINGS.showBuyNowButton),
    homeBanner: {
      desktop: safeDesktopBanner,
      mobile: safeMobileBanner || safeDesktopBanner,
    },
    toggleSections: {
      showFeaturedProducts: toSafeBoolean(
        raw.enableFeaturedSection,
        toSafeBoolean(toggleSections?.showFeaturedProducts, FALLBACK_THEME_SETTINGS.toggleSections.showFeaturedProducts),
      ),
      showBestSellerProducts: toSafeBoolean(
        raw.enableBestSellerSection,
        toSafeBoolean(toggleSections?.showBestSellerProducts, FALLBACK_THEME_SETTINGS.toggleSections.showBestSellerProducts),
      ),
      showNewProducts: toSafeBoolean(
        raw.enableNewSection,
        toSafeBoolean(toggleSections?.showNewProducts, FALLBACK_THEME_SETTINGS.toggleSections.showNewProducts),
      ),
      showBlogSection: toSafeBoolean(
        raw.enableBlogSection,
        toSafeBoolean(toggleSections?.showBlogSection, FALLBACK_THEME_SETTINGS.toggleSections.showBlogSection),
      ),
      showBrandStrip: toSafeBoolean(
        raw.enableBrandSection,
        toSafeBoolean(toggleSections?.showBrandStrip, FALLBACK_THEME_SETTINGS.toggleSections.showBrandStrip),
      ),
      showTestimonials: toSafeBoolean(
        toggleSections?.showTestimonials,
        FALLBACK_THEME_SETTINGS.toggleSections.showTestimonials,
      ),
    },
  };

  return normalized;
}

const getWebsiteSettingsInternal = async (): Promise<WebsiteSettings> => {
  const [websiteValue, socialValue] = await Promise.all([
    getSettingValue<unknown>("website_settings"),
    getSettingValue<unknown>("social_links"),
  ]);
  return normalizeWebsiteSettings(websiteValue, socialValue);
};

const getThemeSettingsInternal = async (): Promise<ThemeSettings> => {
  const themeValue = await getSettingValue<unknown>("theme_settings");
  return normalizeThemeSettings(themeValue);
};

// Deduplicate repeated calls within the same RSC request/render pass.
export const getWebsiteSettings = cache(getWebsiteSettingsInternal);
export const getThemeSettings = cache(getThemeSettingsInternal);

export async function getSocialLinks(): Promise<SocialLink[]> {
  const website = await getWebsiteSettings();
  return website.socialLinks;
}
