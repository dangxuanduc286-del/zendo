import type { FooterTrustBanner, SocialLink } from "./settings";
import { normalizeMediaUrl } from "./media-url";

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function toTrustItems(v: unknown): { title: string; description: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = toStr(o.title);
      const description = toStr(o.description);
      return { title, description };
    })
    .filter((item): item is { title: string; description: string } => Boolean(item))
    .slice(0, 4);
}

function toNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeDefaultOgImage(value: string): string {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return "";
  if (/og-default\.jpg/i.test(normalized)) return "";
  return normalized;
}

const FOOTER_TRUST_ALLOWED_POSITION = new Set([
  "center center",
  "left center",
  "right center",
  "center top",
  "center bottom",
]);

function sanitizeFooterTrustObjectPosition(raw: unknown): string {
  const normalized = toStr(raw).toLowerCase();
  if (!normalized) return "center center";
  return FOOTER_TRUST_ALLOWED_POSITION.has(normalized) ? normalized : "center center";
}

function footerTrustBannerEmpty(sortOrder: number): FooterTrustBanner {
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

function toFooterTrustBanners(v: unknown): FooterTrustBanner[] {
  const buckets = new Map<number, FooterTrustBanner>();
  if (Array.isArray(v)) {
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const sortOrder = Math.max(1, Math.min(4, Math.floor(toNum(o.sortOrder, buckets.size + 1))));
      buckets.set(sortOrder, {
        imageUrl: normalizeMediaUrl(toStr(o.imageUrl)),
        link: toStr(o.link),
        title: toStr(o.title),
        altText: toStr(o.altText),
        objectPosition: sanitizeFooterTrustObjectPosition(o.objectPosition),
        imageFit: toStr(o.imageFit).toLowerCase() === "cover" ? "cover" : "contain",
        enabled: toBool(o.enabled, true),
        sortOrder,
      });
    }
  }
  return [1, 2, 3, 4].map((n) => buckets.get(n) ?? footerTrustBannerEmpty(n));
}

function toHomeInfoCards(
  v: unknown,
): { title: string; subtitle: string; icon: string; href: string; enabled: boolean; sortOrder: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = toStr(o.title);
      const subtitle = toStr(o.subtitle);
      if (!title) return null;
      return {
        title,
        subtitle,
        icon: toStr(o.icon),
        href: toStr(o.href),
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
      };
    })
    .filter(
      (item): item is { title: string; subtitle: string; icon: string; href: string; enabled: boolean; sortOrder: number } =>
        Boolean(item),
    )
    .slice(0, 8);
}

function toHomeChips(v: unknown): { label: string; enabled: boolean; sortOrder: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = toStr(o.label);
      if (!label) return null;
      return {
        label,
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
      };
    })
    .filter((item): item is { label: string; enabled: boolean; sortOrder: number } => Boolean(item))
    .slice(0, 12);
}

function toHomeCategoryChips(
  v: unknown,
): { label: string; slug: string; enabled: boolean; sortOrder: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = toStr(o.label);
      if (!label) return null;
      return {
        label,
        slug: toStr(o.slug),
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
      };
    })
    .filter(
      (item): item is { label: string; slug: string; enabled: boolean; sortOrder: number } =>
        Boolean(item),
    )
    .slice(0, 12);
}

function toHeaderNavItems(
  v: unknown,
): { label: string; href: string; enabled: boolean; sortOrder: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = toStr(o.label);
      const href = toStr(o.href);
      if (!label || !href) return null;
      return {
        label,
        href,
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
      };
    })
    .filter((item): item is { label: string; href: string; enabled: boolean; sortOrder: number } => Boolean(item))
    .slice(0, 8);
}

function toFooterLinkGroups(
  v: unknown,
): Array<{
  title: string;
  enabled: boolean;
  sortOrder: number;
  links: Array<{ label: string; href: string; enabled: boolean; sortOrder: number }>;
}> {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = toStr(o.title);
      const linksRaw = Array.isArray(o.links) ? o.links : [];
      if (!title) return null;
      const links = linksRaw
        .map((linkRow, linkIndex) => {
          if (!linkRow || typeof linkRow !== "object") return null;
          const l = linkRow as Record<string, unknown>;
          const label = toStr(l.label);
          const href = toStr(l.href);
          if (!label || !href) return null;
          return {
            label,
            href,
            enabled: toBool(l.enabled, true),
            sortOrder: toNum(l.sortOrder, linkIndex + 1),
          };
        })
        .filter(
          (
            row,
          ): row is { label: string; href: string; enabled: boolean; sortOrder: number } =>
            Boolean(row),
        )
        .slice(0, 20);
      return {
        title,
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
        links,
      };
    })
    .filter(
      (
        row,
      ): row is {
        title: string;
        enabled: boolean;
        sortOrder: number;
        links: Array<{ label: string; href: string; enabled: boolean; sortOrder: number }>;
      } => Boolean(row),
    )
    .slice(0, 6);
}

function toFloatingCtas(
  v: unknown,
): Array<{ label: string; href: string; enabled: boolean; sortOrder: number }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const label = toStr(o.label);
      const href = toStr(o.href);
      if (!label || !href) return null;
      return {
        label,
        href,
        enabled: toBool(o.enabled, true),
        sortOrder: toNum(o.sortOrder, index + 1),
      };
    })
    .filter((row): row is { label: string; href: string; enabled: boolean; sortOrder: number } => Boolean(row))
    .slice(0, 5);
}

function toCustomerAccountSettings(v: unknown): Record<string, unknown> {
  const raw = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const bannerRaw =
    raw.banner && typeof raw.banner === "object" && !Array.isArray(raw.banner)
      ? (raw.banner as Record<string, unknown>)
      : {};
  const affiliateBannerRaw =
    raw.affiliateBanner && typeof raw.affiliateBanner === "object" && !Array.isArray(raw.affiliateBanner)
      ? (raw.affiliateBanner as Record<string, unknown>)
      : {};

  return {
    showOverview: toBool(raw.showOverview, true),
    showOrders: toBool(raw.showOrders, true),
    showOrderTimeline: toBool(raw.showOrderTimeline, true),
    showProfile: toBool(raw.showProfile, true),
    showAddresses: toBool(raw.showAddresses, true),
    showCoupons: toBool(raw.showCoupons, true),
    showNotifications: toBool(raw.showNotifications, true),
    showSupport: toBool(raw.showSupport, true),
    showWarranty: toBool(raw.showWarranty, true),
    showReturnRequest: toBool(raw.showReturnRequest, true),
    showWishlist: toBool(raw.showWishlist, true),
    showRecentlyViewed: toBool(raw.showRecentlyViewed, true),
    showRecommendedProducts: toBool(raw.showRecommendedProducts, true),
    showAffiliate: toBool(raw.showAffiliate, true),
    showSecurity: toBool(raw.showSecurity, true),
    showPurchaseHistory: toBool(raw.showPurchaseHistory, true),
    purchaseHistoryTitle: toStr(raw.purchaseHistoryTitle) || "Lịch sử mua hàng",
    emptyPurchaseHistoryText:
      toStr(raw.emptyPurchaseHistoryText) || "Chưa có đơn hàng trong danh sách này.",
    purchaseHistoryPageSize: Math.max(5, Math.min(100, toNum(raw.purchaseHistoryPageSize, 20))),
    enableOrderDetail: toBool(raw.enableOrderDetail, true),
    enableCancelOrder: toBool(raw.enableCancelOrder, false),
    enableReorder: toBool(raw.enableReorder, true),
    enableReviewAfterPurchase: toBool(raw.enableReviewAfterPurchase, true),
    enableOrderSearch: toBool(raw.enableOrderSearch, true),
    enableOrderDateFilter: toBool(raw.enableOrderDateFilter, true),
    enableOrderStatusFilter: toBool(raw.enableOrderStatusFilter, true),
    cancelOrderTimeLimitMinutes: Math.max(0, Math.min(10080, toNum(raw.cancelOrderTimeLimitMinutes, 30))),
    orderSupportText:
      toStr(raw.orderSupportText) ||
      "Cần hỗ trợ đơn hàng? Liên hệ hotline hoặc Zalo trong mục Hỗ trợ.",
    orderDetailTitle: toStr(raw.orderDetailTitle) || "Chi tiết đơn hàng",
    accountTitle: toStr(raw.accountTitle) || "Tài khoản của tôi",
    accountSubtitle:
      toStr(raw.accountSubtitle) ||
      "Theo dõi đơn hàng, cập nhật hồ sơ và quản lý thông tin tài khoản.",
    welcomeMessage: toStr(raw.welcomeMessage) || "Chào mừng bạn quay lại Zendo.vn.",
    emptyOrderText: toStr(raw.emptyOrderText) || "Bạn chưa có đơn hàng nào.",
    shoppingCtaText: toStr(raw.shoppingCtaText) || "Mua sắm ngay",
    notificationTitle: toStr(raw.notificationTitle) || "Thông báo tài khoản",
    couponTitle: toStr(raw.couponTitle) || "Ưu đãi của bạn",
    supportTitle: toStr(raw.supportTitle) || "Hỗ trợ khách hàng",
    warrantyTitle: toStr(raw.warrantyTitle) || "Bảo hành sản phẩm",
    returnRequestTitle: toStr(raw.returnRequestTitle) || "Yêu cầu đổi trả",
    continueShoppingUrl: toStr(raw.continueShoppingUrl) || "/cua-hang",
    orderLookupUrl: toStr(raw.orderLookupUrl) || "/tra-cuu-don-hang",
    supportPhone: toStr(raw.supportPhone) || "1900 6868",
    supportZaloUrl: toStr(raw.supportZaloUrl),
    supportMessengerUrl: toStr(raw.supportMessengerUrl),
    returnPolicyUrl: toStr(raw.returnPolicyUrl) || "/chinh-sach-doi-tra",
    warrantyPolicyUrl: toStr(raw.warrantyPolicyUrl) || "/chinh-sach-bao-hanh",
    affiliateTitle: toStr(raw.affiliateTitle) || "Trung tâm CTV / Affiliate",
    affiliateSubtitle:
      toStr(raw.affiliateSubtitle) || "Theo dõi hiệu suất giới thiệu, hoa hồng và điểm thưởng của bạn.",
    affiliateSupportText:
      toStr(raw.affiliateSupportText) ||
      "Liên hệ đội ngũ hỗ trợ CTV nếu bạn cần trợ giúp về link giới thiệu và hoa hồng.",
    affiliateTermsUrl: toStr(raw.affiliateTermsUrl),
    affiliateGuideUrl: toStr(raw.affiliateGuideUrl),
    affiliateMinWithdrawalAmount: Math.max(0, toNum(raw.affiliateMinWithdrawalAmount, 100000)),
    affiliateDefaultCommissionText:
      toStr(raw.affiliateDefaultCommissionText) || "Hoa hồng được đối soát theo đơn hàng đủ điều kiện.",
    affiliateGuideTitle: toStr(raw.affiliateGuideTitle) || "Hướng dẫn chi tiết CTV / Affiliate",
    affiliateGuideIntro:
      toStr(raw.affiliateGuideIntro) ||
      "Làm theo từng bước để triển khai link giới thiệu hiệu quả và tuân thủ chính sách.",
    affiliateGuideStep1:
      toStr(raw.affiliateGuideStep1) ||
      "Lấy link giới thiệu: vào Bộ tạo link giới thiệu, chọn loại link phù hợp và tạo link có mã ref cá nhân.",
    affiliateGuideStep2:
      toStr(raw.affiliateGuideStep2) ||
      "Chia sẻ link đúng cách: chia sẻ qua Zalo, Facebook, TikTok, website hoặc nhóm khách hàng phù hợp.",
    affiliateGuideStep3:
      toStr(raw.affiliateGuideStep3) ||
      "Khách bấm link và phát sinh đơn: hệ thống ghi nhận click/đơn hợp lệ theo mã ref, chỉ tính đơn đúng điều kiện.",
    affiliateGuideStep4:
      toStr(raw.affiliateGuideStep4) ||
      "Theo dõi đơn giới thiệu: vào mục Đơn giới thiệu để theo dõi trạng thái đơn và hoa hồng dự kiến.",
    affiliateGuideStep5:
      toStr(raw.affiliateGuideStep5) ||
      "Theo dõi hoa hồng & điểm thưởng: xem trạng thái chờ duyệt, đã duyệt, đã thanh toán.",
    affiliateGuideStep6:
      toStr(raw.affiliateGuideStep6) ||
      "Yêu cầu rút tiền: vào mục Yêu cầu rút tiền, kiểm tra mức rút tối thiểu và gửi yêu cầu khi được kích hoạt.",
    affiliateGuideStep7:
      toStr(raw.affiliateGuideStep7) ||
      "Quy định/lưu ý: không spam, không tự mua gian lận, chỉ tính đơn hợp lệ; vi phạm có thể bị khóa CTV.",
    affiliateGuideStep8:
      toStr(raw.affiliateGuideStep8) ||
      "Cần hỗ trợ: liên hệ hotline, Zalo, Messenger hoặc link hướng dẫn từ cài đặt quản trị.",
    affiliateCanBuy: toBool(raw.affiliateCanBuy, false),
    affiliateDefaultTab: ((): "affiliate" | "overview" => {
      const v = toStr(raw.affiliateDefaultTab).toLowerCase();
      return v === "overview" ? "overview" : "affiliate";
    })(),
    affiliateBlockCheckoutMessage:
      toStr(raw.affiliateBlockCheckoutMessage) ||
      "Tài khoản Cộng tác viên hiện không thể đặt hàng trên website. Vui lòng liên hệ hỗ trợ nếu bạn cần mở quyền mua.",
    affiliateShowPurchaseHistory: toBool(raw.affiliateShowPurchaseHistory, false),
    affiliateShowBuyerStats: toBool(raw.affiliateShowBuyerStats, false),
    affiliateShowShoppingCta: toBool(raw.affiliateShowShoppingCta, false),
    affiliateShowVoucher: toBool(raw.affiliateShowVoucher, false),
    affiliateShowAddressBook: toBool(raw.affiliateShowAddressBook, false),
    affiliateShowSupport: toBool(raw.affiliateShowSupport, true),
    affiliateShowWithdrawals: toBool(raw.affiliateShowWithdrawals, true),
    affiliateShowGuide: toBool(raw.affiliateShowGuide, true),
    affiliateBanner: {
      enabled: toBool(affiliateBannerRaw.enabled, false),
      title: toStr(affiliateBannerRaw.title),
      subtitle: toStr(affiliateBannerRaw.subtitle),
      imageUrl: normalizeMediaUrl(toStr(affiliateBannerRaw.imageUrl)),
      buttonText: toStr(affiliateBannerRaw.buttonText),
      buttonUrl: toStr(affiliateBannerRaw.buttonUrl),
    },
    banner: {
      enabled: toBool(bannerRaw.enabled, false),
      title: toStr(bannerRaw.title),
      subtitle: toStr(bannerRaw.subtitle),
      imageUrl: normalizeMediaUrl(toStr(bannerRaw.imageUrl)),
      buttonText: toStr(bannerRaw.buttonText),
      buttonUrl: toStr(bannerRaw.buttonUrl),
    },
  };
}

function toProductDetailSettings(v: unknown): Record<string, unknown> {
  const raw = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  return {
    enabled: toBool(raw.enabled, true),
    buyNowLabel: toStr(raw.buyNowLabel) || "Mua ngay",
    addToCartLabel: toStr(raw.addToCartLabel) || "Thêm vào giỏ",
    showBestPriceNote: toBool(raw.showBestPriceNote, true),
    bestPriceLabel: toStr(raw.bestPriceLabel) || "Giá tốt nhất tại Zendo.vn",
    showDiscountBadge: toBool(raw.showDiscountBadge, true),
    descriptionTitle: toStr(raw.descriptionTitle) || "Mô tả sản phẩm",
    readMoreLabel: toStr(raw.readMoreLabel) || "Xem thêm",
    reviewTitle: toStr(raw.reviewTitle) || "Đánh giá & Nhận xét",
    reviewEmptyText: toStr(raw.reviewEmptyText) || "Sản phẩm chưa có đánh giá.",
    verifiedPurchaseLabel: toStr(raw.verifiedPurchaseLabel) || "Đã mua hàng",
    soldLabel: toStr(raw.soldLabel) || "Đã bán",
    ratingLabel: toStr(raw.ratingLabel) || "đánh giá",
    policyOfficialLabel: toStr(raw.policyOfficialLabel) || "100% Chính hãng",
    policyReturnLabel: toStr(raw.policyReturnLabel) || "Đổi trả dễ dàng",
    policyShippingLabel: toStr(raw.policyShippingLabel) || "Freeship toàn quốc",
    policyWarrantyLabel: toStr(raw.policyWarrantyLabel) || "Bảo hành chính hãng",
    showPolicyRow: toBool(raw.showPolicyRow, true),
    showReviewSection: toBool(raw.showReviewSection, true),
    showRelatedProducts: toBool(raw.showRelatedProducts, true),
    hideTechnicalSpecs: toBool(raw.hideTechnicalSpecs, true),
  };
}

/**
 * Chuẩn hóa object lưu vào Setting `website_settings` (đồng bộ footer, SEO, phần mở rộng).
 */
export function composeWebsiteDbPayload(
  base: Record<string, unknown>,
  socialLinks: SocialLink[],
): Record<string, unknown> {
  const siteName = toStr(base.siteName) || "Zendo.vn";
  const slogan = toStr(base.slogan);
  const shortDescription = toStr(base.shortDescription);
  const siteUrl = toStr(base.siteUrl) || "http://localhost:3000";
  const canonicalBaseUrl = toStr(base.canonicalBaseUrl) || siteUrl;
  const logoUrl = normalizeMediaUrl(toStr(base.logoUrl) || toStr(base.logo));
  const footerLogoUrl = normalizeMediaUrl(toStr(base.footerLogoUrl) || logoUrl);
  const productPlaceholderImage = normalizeMediaUrl(toStr(base.productPlaceholderImage));
  const faviconUrl = normalizeMediaUrl(toStr(base.faviconUrl));
  const hotline = toStr(base.hotline);
  const email = toStr(base.email);
  const address = toStr(base.address);
  const footerText = toStr(base.footerText);
  const footerBrandName = toStr(base.footerBrandName) || siteName;
  const footerBrandDescription = toStr(base.footerBrandDescription) || toStr(base.shortDescription);
  const showFooterSocialLinks = toBool(base.showFooterSocialLinks, false);
  const footerFacebookUrl = toStr(base.footerFacebookUrl);
  const footerInstagramUrl = toStr(base.footerInstagramUrl);
  const footerTiktokUrl = toStr(base.footerTiktokUrl);
  const footerYoutubeUrl = toStr(base.footerYoutubeUrl);
  const footerZaloUrl = toStr(base.footerZaloUrl);
  const defaultSeoTitle = toStr(base.defaultSeoTitle);
  const defaultSeoDescription = toStr(base.defaultSeoDescription);
  const defaultSeoKeywords = toStr(base.defaultSeoKeywords);
  const defaultOgImage = sanitizeDefaultOgImage(toStr(base.defaultOgImage));
  const robotsIndex = toBool(base.robotsIndex, true);
  const robotsFollow = toBool(base.robotsFollow, true);

  const zalo = toStr(base.zalo);
  const showAnnouncementBar = toBool(base.showAnnouncementBar, false);
  const announcementText = toStr(base.announcementText);
  const showStorefrontTopbar = toBool(base.showStorefrontTopbar, true);
  const topbarLeftText = toStr(base.topbarLeftText);
  const topbarShippingText = toStr(base.topbarShippingText);
  const topbarCommitmentText = toStr(base.topbarCommitmentText);
  const showHeaderSearch = toBool(base.showHeaderSearch, true);
  const showHeaderCartIcon = toBool(base.showHeaderCartIcon, true);
  const showHeaderAdminMenu = toBool(base.showHeaderAdminMenu, true);
  const headerDesktopCategoryLimit = Math.max(1, Math.min(20, toNum(base.headerDesktopCategoryLimit, 10)));
  const headerMobileCategoryLimit = Math.max(1, Math.min(30, toNum(base.headerMobileCategoryLimit, 12)));
  const showTopHighlights = toBool(base.showTopHighlights, false);
  const showHomeFeatureBlocks = toBool(base.showHomeFeatureBlocks, true);
  const showBottomTrustBlock = toBool(base.showBottomTrustBlock, true);
  const showHomeWhyChoose = toBool(base.showHomeWhyChoose, true);
  const showFooterLinkGroups = toBool(base.showFooterLinkGroups, true);
  const productGridColumnsDesktop = Math.max(4, Math.min(6, toNum(base.productGridColumnsDesktop, 6)));
  const footerHtml = toStr(base.footerHtml);
  const trustBarItems = toTrustItems(base.trustBarItems);
  const homeInfoCards = toHomeInfoCards(base.homeInfoCards);
  const footerTrustBanners = toFooterTrustBanners(base.footerTrustBanners);
  const homeQuickChips = toHomeChips(base.homeQuickChips);
  const homeCategoryChips = toHomeCategoryChips(base.homeCategoryChips);
  const headerNavItems = toHeaderNavItems(base.headerNavItems);
  const footerLinkGroups = toFooterLinkGroups(base.footerLinkGroups);
  const floatingCtas = toFloatingCtas(base.floatingCtas);
  const dealsSections = Array.isArray(base.dealsSections) ? base.dealsSections : [];
  const customerAccountSettings = toCustomerAccountSettings(base.customerAccountSettings);
  const productDetailSettings = toProductDetailSettings(base.productDetailSettings);
  const popupEnabled = toBool(base.popupEnabled, false);
  const popupTitle = toStr(base.popupTitle);
  const popupContent = toStr(base.popupContent);
  const popupImageUrl = normalizeMediaUrl(toStr(base.popupImageUrl));
  const popupLink = toStr(base.popupLink);
  const popupDelayMs = Math.max(0, Math.min(30000, toNum(base.popupDelayMs, 2500)));
  const popupFrequencyHours = Math.max(1, Math.min(168, toNum(base.popupFrequencyHours, 12)));
  const businessHours = toStr(base.businessHours);
  const mapUrl = toStr(base.mapUrl);
  const taxCode = toStr(base.taxCode);
  const defaultProductWarranty = toStr(base.defaultProductWarranty);
  const analyticsEnabled = toBool(base.analyticsEnabled, true);
  const timezone = toStr(base.timezone) || "Asia/Ho_Chi_Minh";
  const currency = toStr(base.currency) || "VND";
  const trackingEnabled = toBool(base.trackingEnabled, true);
  const affiliateEnabled = toBool(base.affiliateEnabled, false);
  const commissionRate = Math.max(
    0,
    Math.min(100, toNum(base.commissionRate ?? base.affiliateCommissionRate, 5)),
  );
  const payoutThreshold = Math.max(
    0,
    toNum(base.payoutThreshold ?? base.affiliatePayoutThreshold, 100000),
  );
  const cookieDuration = Math.max(
    1,
    toNum(base.cookieDuration ?? base.affiliateCookieDurationDays, 30),
  );
  const attributionRule = toStr(base.attributionRule ?? base.affiliateAttributionRule) || "last_click";
  const rewardPointEnabled = toBool(
    base.rewardPointEnabled ?? base.affiliateRewardPointsEnabled,
    false,
  );
  const withdrawalEnabled = toBool(base.withdrawalEnabled, false);
  const ctvGuideContent = toStr(base.ctvGuideContent);
  const ga4ScriptEnabled = toBool(base.ga4ScriptEnabled, true);
  const metaPixelScriptEnabled = toBool(base.metaPixelScriptEnabled, true);
  const remarketingEventsEnabled = toBool(base.remarketingEventsEnabled, true);
  const gtmContainerId = toStr(base.gtmContainerId);
  const ga4MeasurementId = toStr(base.ga4MeasurementId);
  const metaPixelId = toStr(base.metaPixelId);
  const tiktokPixelEnabled = toBool(base.tiktokPixelEnabled, true);
  const zaloPixelEnabled = toBool(base.zaloPixelEnabled, true);
  const tiktokPixelId = toStr(base.tiktokPixelId);
  const zaloPixelId = toStr(base.zaloPixelId);
  const clarityProjectId = toStr(base.clarityProjectId);
  const headScripts = toStr(base.headScripts);
  const bodyScripts = toStr(base.bodyScripts);

  const seoDefaultRaw = base.seoDefault;
  const seoObj = seoDefaultRaw && typeof seoDefaultRaw === "object" && !Array.isArray(seoDefaultRaw) ? (seoDefaultRaw as Record<string, unknown>) : {};
  const keywords = Array.isArray(seoObj.keywords)
    ? seoObj.keywords.filter((k): k is string => typeof k === "string")
    : [];

  return {
    siteName,
    slogan,
    shortDescription,
    siteUrl,
    canonicalBaseUrl,
    logoUrl,
    footerLogoUrl,
    productPlaceholderImage,
    faviconUrl,
    hotline,
    email,
    address,
    footerText,
    footerBrandName,
    footerBrandDescription,
    showFooterSocialLinks,
    footerFacebookUrl,
    footerInstagramUrl,
    footerTiktokUrl,
    footerYoutubeUrl,
    footerZaloUrl,
    defaultSeoTitle,
    defaultSeoDescription,
    defaultSeoKeywords,
    defaultOgImage,
    robotsIndex,
    robotsFollow,
    socialLinks,
    logo: logoUrl,
    footer: {
      company: footerBrandName,
      address,
      copyright: footerText,
    },
    seoDefault: {
      siteName,
      title: defaultSeoTitle || siteName,
      description: defaultSeoDescription,
      keywords: defaultSeoKeywords
        ? defaultSeoKeywords
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : keywords,
      ogImage: defaultOgImage,
    },
    zalo,
    showAnnouncementBar,
    announcementText,
    showStorefrontTopbar,
    topbarLeftText,
    topbarShippingText,
    topbarCommitmentText,
    showHeaderSearch,
    showHeaderCartIcon,
    showHeaderAdminMenu,
    headerDesktopCategoryLimit,
    headerMobileCategoryLimit,
    showTopHighlights,
    showHomeFeatureBlocks,
    showBottomTrustBlock,
    showHomeWhyChoose,
    showFooterLinkGroups,
    productGridColumnsDesktop,
    footerHtml,
    trustBarItems,
    homeInfoCards,
    footerTrustBanners,
    homeQuickChips,
    homeCategoryChips,
    headerNavItems,
    footerLinkGroups,
    floatingCtas,
    dealsSections,
    customerAccountSettings,
    productDetailSettings,
    popupEnabled,
    popupTitle,
    popupContent,
    popupImageUrl,
    popupLink,
    popupDelayMs,
    popupFrequencyHours,
    businessHours,
    mapUrl,
    taxCode,
    defaultProductWarranty,
    analyticsEnabled,
    timezone,
    currency,
    trackingEnabled,
    affiliateEnabled,
    commissionRate,
    payoutThreshold,
    cookieDuration,
    attributionRule,
    rewardPointEnabled,
    withdrawalEnabled,
    ctvGuideContent,
    // Backward-compatible fields
    affiliateCommissionRate: commissionRate,
    affiliatePayoutThreshold: payoutThreshold,
    affiliateCookieDurationDays: cookieDuration,
    affiliateAttributionRule: attributionRule,
    affiliateRewardPointsEnabled: rewardPointEnabled,
    ga4ScriptEnabled,
    metaPixelScriptEnabled,
    remarketingEventsEnabled,
    gtmContainerId,
    ga4MeasurementId,
    metaPixelId,
    tiktokPixelEnabled,
    zaloPixelEnabled,
    tiktokPixelId,
    zaloPixelId,
    clarityProjectId,
    headScripts,
    bodyScripts,
  };
}
