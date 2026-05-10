import { z } from "zod";
import type { SocialLink } from "./settings";
import { safeParseJson } from "./safe-json";
import { isPublicMediaUrl } from "./media-url";

const mediaFieldSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || isPublicMediaUrl(value), "Ảnh phải thuộc media.zendo.vn.");

const socialLinkSchema = z.object({
  platform: z.string().trim().min(1, "Nền tảng là bắt buộc.").max(40),
  label: z.string().trim().min(1, "Nhãn hiển thị là bắt buộc.").max(80),
  url: z.string().trim().url("URL mạng xã hội không hợp lệ."),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
});

export const websiteSettingsFormSchema = z.object({
  siteName: z.string().trim().min(2, "Tên website phải có ít nhất 2 ký tự.").max(120),
  slogan: z.string().trim().max(180).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
  siteUrl: z.string().trim().url("URL website không hợp lệ."),
  canonicalBaseUrl: z.string().trim().url("Canonical base URL không hợp lệ."),
  logoUrl: mediaFieldSchema.optional().or(z.literal("")),
  footerLogoUrl: mediaFieldSchema.optional().or(z.literal("")),
  productPlaceholderImage: mediaFieldSchema.optional().or(z.literal("")),
  faviconUrl: mediaFieldSchema.optional().or(z.literal("")),
  hotline: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.string().trim().email("Email không hợp lệ.").optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  footerText: z.string().trim().max(300).optional().or(z.literal("")),
  defaultSeoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  defaultSeoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  defaultSeoKeywords: z.string().trim().max(500).optional().or(z.literal("")),
  defaultOgImage: mediaFieldSchema.optional().or(z.literal("")),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  socialLinksJson: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = safeParseJson<unknown>(value, null, "admin-settings:social-links-refine");
      const result = z.array(socialLinkSchema).safeParse(parsed);
      return result.success;
    }, "Liên kết mạng xã hội phải là mảng JSON hợp lệ."),
});

export const themeSettingsFormSchema = z.object({
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Màu chính phải là mã màu hex (#RRGGBB)."),
  secondaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Màu phụ phải là mã màu hex (#RRGGBB)."),
  heroTitle: z.string().trim().max(200).optional().or(z.literal("")),
  heroSubtitle: z.string().trim().max(300).optional().or(z.literal("")),
  homeBannerImage: mediaFieldSchema.optional().or(z.literal("")),
  homeBannerMobileImage: mediaFieldSchema.optional().or(z.literal("")),
  mainBannerImage: mediaFieldSchema.optional().or(z.literal("")),
  mainBannerHref: z.string().trim().max(300).optional().or(z.literal("")),
  mainBannerTitle: z.string().trim().max(160).optional().or(z.literal("")),
  mainBannerSubtitle: z.string().trim().max(220).optional().or(z.literal("")),
  leftBannerTopImage: mediaFieldSchema.optional().or(z.literal("")),
  leftBannerTopHref: z.string().trim().max(300).optional().or(z.literal("")),
  leftBannerBottomImage: mediaFieldSchema.optional().or(z.literal("")),
  leftBannerBottomHref: z.string().trim().max(300).optional().or(z.literal("")),
  rightBannerTopImage: mediaFieldSchema.optional().or(z.literal("")),
  rightBannerTopHref: z.string().trim().max(300).optional().or(z.literal("")),
  rightBannerBottomImage: mediaFieldSchema.optional().or(z.literal("")),
  rightBannerBottomHref: z.string().trim().max(300).optional().or(z.literal("")),
  campaignBackgroundEnabled: z.boolean(),
  campaignBackgroundImage: mediaFieldSchema.optional().or(z.literal("")),
  campaignBackgroundMobileImage: mediaFieldSchema.optional().or(z.literal("")),
  enableSiteBackgroundImage: z.boolean(),
  siteBackgroundImage: mediaFieldSchema.optional().or(z.literal("")),
  showHeroBanner: z.boolean(),
  heroCtaLabel: z.string().trim().max(80).optional().or(z.literal("")),
  heroCtaHref: z.string().trim().max(300).optional().or(z.literal("")),
  homeBannersJson: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = safeParseJson<unknown>(value, null, "admin-settings:theme-home-banners");
      return Array.isArray(parsed);
    }, "JSON banner trang chủ không hợp lệ."),
  enableFlashSaleSection: z.boolean(),
  enableFeaturedSection: z.boolean(),
  enableNewSection: z.boolean(),
  enableBestSellerSection: z.boolean(),
  enableBrandSection: z.boolean(),
  enableBlogSection: z.boolean(),
  homeRightPromoCardsJson: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = safeParseJson<unknown>(value, null, "admin-settings:home-right-promo-cards");
      return Array.isArray(parsed);
    }, "JSON banner phải là mảng."),
  homeBottomPromoCardsJson: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = safeParseJson<unknown>(value, null, "admin-settings:home-bottom-promo-cards");
      return Array.isArray(parsed);
    }, "JSON banner phải là mảng."),
  productCardButtonMode: z.enum(["solid", "outline"]),
  productCardButtonText: z.string().trim().min(1).max(60),
  productDetailPrimaryButtonText: z.string().trim().min(1).max(60),
  showAddToCartButton: z.boolean(),
  showBuyNowButton: z.boolean(),
});

export type WebsiteSettingsFormValues = z.infer<typeof websiteSettingsFormSchema>;
export type ThemeSettingsFormValues = z.infer<typeof themeSettingsFormSchema>;

export function parseSocialLinksJson(raw: string): SocialLink[] {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<unknown>(raw, [], "admin-settings:parse-social-links");
  const result = z.array(socialLinkSchema).safeParse(parsed);
  if (!result.success) return [];
  return result.data.map((item) => ({
    platform: item.platform,
    label: item.label,
    url: item.url,
    icon: item.icon || undefined,
  }));
}

const socialLinksJsonField = websiteSettingsFormSchema.shape.socialLinksJson;

const homeInfoCardsJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:home-info-cards");
    const schema = z.array(
      z.object({
        title: z.string().trim().min(1).max(80),
        subtitle: z.string().trim().max(120).optional().or(z.literal("")),
        icon: z.string().trim().max(40).optional().or(z.literal("")),
        href: z.string().trim().max(300).optional().or(z.literal("")),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON thẻ lợi ích không hợp lệ.");

const homeChipsJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:home-chips");
    const schema = z.array(
      z.object({
        label: z.string().trim().min(1).max(80),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON chip ưu đãi không hợp lệ.");

const homeCategoryChipsJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:home-category-chips");
    const schema = z.array(
      z.object({
        label: z.string().trim().min(1).max(80),
        slug: z.string().trim().max(120).optional().or(z.literal("")),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON chip danh mục không hợp lệ.");

const dealsSectionsJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:deals-sections");
    const schema = z.array(
      z.object({
        id: z.string().trim().min(1).max(80),
        type: z.enum([
          "flash_sale",
          "voucher_hot",
          "deal_under_99k",
          "freeship",
          "trending",
          "deep_discount",
        ]),
        enabled: z.boolean(),
        title: z.string().trim().min(1).max(120),
        subtitle: z.string().trim().max(220).optional().or(z.literal("")),
        theme: z
          .object({
            preset: z
              .enum(["flash-sale", "luxury", "tet", "neon", "minimal", "dark-sale"])
              .optional()
              .or(z.literal("")),
            background: z.string().trim().max(80).optional().or(z.literal("")),
            textColor: z.string().trim().max(80).optional().or(z.literal("")),
            accentColor: z.string().trim().max(80).optional().or(z.literal("")),
          })
          .optional(),
        banner: z
          .object({
            desktopImage: z.string().trim().max(500).optional().or(z.literal("")),
            mobileImage: z.string().trim().max(500).optional().or(z.literal("")),
            link: z.string().trim().max(300).optional().or(z.literal("")),
          })
          .optional(),
        countdown: z
          .object({
            enabled: z.boolean(),
            startsAt: z.string().trim().max(40).optional().or(z.literal("")),
            endsAt: z.string().trim().max(40).optional().or(z.literal("")),
          })
          .optional(),
        productSource: z
          .object({
            type: z.enum(["manual", "sale", "featured", "trending", "under_price", "category", "newest"]),
            productIds: z.array(z.string().trim().min(1).max(80)).optional(),
            categoryIds: z.array(z.string().trim().min(1).max(80)).optional(),
            limit: z.number().int().min(0).max(60).optional(),
            maxPrice: z.number().min(0).max(200000000).optional(),
            minDiscountPercent: z.number().min(0).max(99).optional(),
          })
          .optional(),
        voucherSource: z
          .object({
            couponIds: z.array(z.string().trim().min(1).max(80)).optional(),
          })
          .optional(),
        experiment: z
          .object({
            experimentId: z.string().trim().min(1).max(80),
            variantId: z.string().trim().min(1).max(80),
            enabled: z.boolean(),
          })
          .optional(),
        sortOrder: z.number().int().min(0).max(999),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "Cấu hình Ưu đãi (Deals) không hợp lệ.");

const footerGroupsJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:footer-groups");
    const schema = z.array(
      z.object({
        title: z.string().trim().min(1).max(80),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        links: z.array(
          z.object({
            label: z.string().trim().min(1).max(80),
            href: z.string().trim().min(1).max(300),
            enabled: z.boolean().optional(),
            sortOrder: z.number().int().min(0).max(999).optional(),
          }),
        ),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON nhóm link footer không hợp lệ.");

const floatingCtasJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:floating-ctas");
    const schema = z.array(
      z.object({
        label: z.string().trim().min(1).max(80),
        href: z.string().trim().min(1).max(300),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON CTA nổi không hợp lệ.");

const headerMenuJsonField = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = safeParseJson<unknown>(value, null, "admin-settings:header-menu");
    const schema = z.array(
      z.object({
        label: z.string().trim().min(1).max(80),
        href: z.string().trim().min(1).max(300),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
      }),
    );
    return schema.safeParse(parsed).success;
  }, "JSON menu header không hợp lệ.");

export const websiteSectionGeneralSchema = z.object({
  section: z.literal("general"),
  siteName: z.string().trim().min(2, "Tên website phải có ít nhất 2 ký tự.").max(120),
  slogan: z.string().trim().max(180).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
  siteUrl: z.string().trim().url("URL website không hợp lệ."),
  canonicalBaseUrl: z.string().trim().url("Canonical base URL không hợp lệ."),
  logoUrl: mediaFieldSchema.optional().or(z.literal("")),
  footerLogoUrl: mediaFieldSchema.optional().or(z.literal("")),
  productPlaceholderImage: mediaFieldSchema.optional().or(z.literal("")),
  faviconUrl: mediaFieldSchema.optional().or(z.literal("")),
  hotline: z.string().trim().max(60).optional().or(z.literal("")),
  zalo: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.union([z.literal(""), z.string().trim().email("Email không hợp lệ.")]),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  defaultSeoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  defaultSeoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  defaultSeoKeywords: z.string().trim().max(500).optional().or(z.literal("")),
  defaultOgImage: mediaFieldSchema.optional().or(z.literal("")),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  socialLinksJson: socialLinksJsonField,
});

export const footerTrustBannerItemSchema = z.object({
  imageUrl: z.string().trim().max(2048),
  link: z.string().trim().max(500),
  title: z.string().trim().max(160),
  altText: z.string().trim().max(200),
  objectPosition: z.string().trim().max(120),
  imageFit: z.enum(["contain", "cover"]),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(1).max(4),
});

export const websiteSectionStorefrontSchema = z.object({
  section: z.literal("storefront"),
  showAnnouncementBar: z.boolean(),
  announcementText: z.string().trim().max(500).optional().or(z.literal("")),
  showStorefrontTopbar: z.boolean(),
  topbarLeftText: z.string().trim().max(160).optional().or(z.literal("")),
  topbarShippingText: z.string().trim().max(160).optional().or(z.literal("")),
  topbarCommitmentText: z.string().trim().max(160).optional().or(z.literal("")),
  showHeaderSearch: z.boolean(),
  showHeaderCartIcon: z.boolean(),
  showHeaderAdminMenu: z.boolean(),
  headerDesktopCategoryLimit: z.number().int().min(1).max(20),
  headerMobileCategoryLimit: z.number().int().min(1).max(30),
  showTopHighlights: z.boolean(),
  showHomeFeatureBlocks: z.boolean(),
  showBottomTrustBlock: z.boolean(),
  showHomeWhyChoose: z.boolean(),
  showFooterLinkGroups: z.boolean(),
  productGridColumnsDesktop: z.number().int().min(4).max(6),
  homeInfoCardsJson: homeInfoCardsJsonField,
  homeQuickChipsJson: homeChipsJsonField,
  homeCategoryChipsJson: homeCategoryChipsJsonField,
  dealsSectionsJson: dealsSectionsJsonField,
  headerMenuJson: headerMenuJsonField,
  footerGroupsJson: footerGroupsJsonField,
  floatingCtasJson: floatingCtasJsonField,
  productDetailEnabled: z.boolean(),
  buyNowLabel: z.string().trim().max(80).optional().or(z.literal("")),
  addToCartLabel: z.string().trim().max(80).optional().or(z.literal("")),
  showBestPriceNote: z.boolean(),
  bestPriceLabel: z.string().trim().max(120).optional().or(z.literal("")),
  showDiscountBadge: z.boolean(),
  descriptionTitle: z.string().trim().max(120).optional().or(z.literal("")),
  readMoreLabel: z.string().trim().max(80).optional().or(z.literal("")),
  reviewTitle: z.string().trim().max(120).optional().or(z.literal("")),
  reviewEmptyText: z.string().trim().max(240).optional().or(z.literal("")),
  verifiedPurchaseLabel: z.string().trim().max(120).optional().or(z.literal("")),
  soldLabel: z.string().trim().max(80).optional().or(z.literal("")),
  ratingLabel: z.string().trim().max(80).optional().or(z.literal("")),
  policyOfficialLabel: z.string().trim().max(120).optional().or(z.literal("")),
  policyReturnLabel: z.string().trim().max(120).optional().or(z.literal("")),
  policyShippingLabel: z.string().trim().max(120).optional().or(z.literal("")),
  policyWarrantyLabel: z.string().trim().max(120).optional().or(z.literal("")),
  showPolicyRow: z.boolean(),
  showReviewSection: z.boolean(),
  showRelatedProducts: z.boolean(),
  hideTechnicalSpecs: z.boolean(),
  footerTrustBanners: z.array(footerTrustBannerItemSchema).length(4),
});

export const websiteSectionFooterSchema = z.object({
  section: z.literal("footer"),
  footerBrandName: z.string().trim().max(120).optional().or(z.literal("")),
  footerBrandDescription: z.string().trim().max(500).optional().or(z.literal("")),
  hotline: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.union([z.literal(""), z.string().trim().email("Email không hợp lệ.")]),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  footerText: z.string().trim().max(300).optional().or(z.literal("")),
  showFooterSocialLinks: z.boolean(),
  footerFacebookUrl: z.union([z.literal(""), z.string().trim().url("URL Facebook không hợp lệ.")]),
  footerInstagramUrl: z.union([z.literal(""), z.string().trim().url("URL Instagram không hợp lệ.")]),
  footerTiktokUrl: z.union([z.literal(""), z.string().trim().url("URL TikTok không hợp lệ.")]),
  footerYoutubeUrl: z.union([z.literal(""), z.string().trim().url("URL YouTube không hợp lệ.")]),
  footerZaloUrl: z.union([z.literal(""), z.string().trim().url("URL Zalo không hợp lệ.")]),
  footerHtml: z.string().trim().max(50000).optional().or(z.literal("")),
});

const trustItemSchema = z.object({
  title: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

export const websiteSectionTrustSchema = z.object({
  section: z.literal("trust"),
  trustBarItems: z.array(trustItemSchema).max(4),
});

export const websiteSectionCommerceSchema = z.object({
  section: z.literal("commerce"),
  businessHours: z.string().trim().max(500).optional().or(z.literal("")),
  mapUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  taxCode: z.string().trim().max(50).optional().or(z.literal("")),
  defaultProductWarranty: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const websiteSectionAnalyticsSchema = z.object({
  section: z.literal("analytics"),
  trackingEnabled: z.boolean(),
  ga4ScriptEnabled: z.boolean(),
  metaPixelScriptEnabled: z.boolean(),
  remarketingEventsEnabled: z.boolean(),
  popupEnabled: z.boolean(),
  popupTitle: z.string().trim().max(160).optional().or(z.literal("")),
  popupContent: z.string().trim().max(500).optional().or(z.literal("")),
  popupImageUrl: mediaFieldSchema.optional().or(z.literal("")),
  popupLink: z.string().trim().max(300).optional().or(z.literal("")),
  popupDelayMs: z.number().int().min(0).max(30000),
  popupFrequencyHours: z.number().int().min(1).max(168),
  gtmContainerId: z.string().trim().max(40).optional().or(z.literal("")),
  ga4MeasurementId: z.string().trim().max(40).optional().or(z.literal("")),
  metaPixelId: z.string().trim().max(40).optional().or(z.literal("")),
  clarityProjectId: z.string().trim().max(60).optional().or(z.literal("")),
  headScripts: z.string().trim().max(50000).optional().or(z.literal("")),
  bodyScripts: z.string().trim().max(50000).optional().or(z.literal("")),
});

const accountUrlField = z.string().trim().max(300).optional().or(z.literal(""));
const accountTextField = z.string().trim().max(220).optional().or(z.literal(""));

export const websiteSectionCustomerAccountSchema = z.object({
  section: z.literal("customerAccount"),
  showOverview: z.boolean(),
  showOrders: z.boolean(),
  showOrderTimeline: z.boolean(),
  showProfile: z.boolean(),
  showAddresses: z.boolean(),
  showCoupons: z.boolean(),
  showNotifications: z.boolean(),
  showSupport: z.boolean(),
  showWarranty: z.boolean(),
  showReturnRequest: z.boolean(),
  showWishlist: z.boolean(),
  showRecentlyViewed: z.boolean(),
  showRecommendedProducts: z.boolean(),
  showAffiliate: z.boolean(),
  showSecurity: z.boolean(),
  showPurchaseHistory: z.boolean(),
  purchaseHistoryTitle: accountTextField,
  emptyPurchaseHistoryText: z.string().trim().max(400).optional().or(z.literal("")),
  purchaseHistoryPageSize: z.number().int().min(5).max(100),
  enableOrderDetail: z.boolean(),
  enableCancelOrder: z.boolean(),
  enableReorder: z.boolean(),
  enableReviewAfterPurchase: z.boolean(),
  enableOrderSearch: z.boolean(),
  enableOrderDateFilter: z.boolean(),
  enableOrderStatusFilter: z.boolean(),
  cancelOrderTimeLimitMinutes: z.number().int().min(0).max(10080),
  orderSupportText: z.string().trim().max(600).optional().or(z.literal("")),
  orderDetailTitle: accountTextField,
  accountTitle: accountTextField,
  accountSubtitle: z.string().trim().max(320).optional().or(z.literal("")),
  welcomeMessage: z.string().trim().max(320).optional().or(z.literal("")),
  emptyOrderText: accountTextField,
  shoppingCtaText: z.string().trim().max(80).optional().or(z.literal("")),
  notificationTitle: accountTextField,
  couponTitle: accountTextField,
  supportTitle: accountTextField,
  warrantyTitle: accountTextField,
  returnRequestTitle: accountTextField,
  continueShoppingUrl: accountUrlField,
  orderLookupUrl: accountUrlField,
  supportPhone: z.string().trim().max(80).optional().or(z.literal("")),
  supportZaloUrl: accountUrlField,
  supportMessengerUrl: accountUrlField,
  returnPolicyUrl: accountUrlField,
  warrantyPolicyUrl: accountUrlField,
  affiliateTitle: accountTextField.optional(),
  affiliateSubtitle: z.string().trim().max(320).optional().or(z.literal("")),
  affiliateSupportText: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateTermsUrl: accountUrlField.optional(),
  affiliateGuideUrl: accountUrlField.optional(),
  affiliateMinWithdrawalAmount: z.number().min(0).max(1000000000).optional(),
  affiliateDefaultCommissionText: z.string().trim().max(220).optional().or(z.literal("")),
  affiliateBannerEnabled: z.boolean().optional(),
  affiliateBannerTitle: accountTextField.optional(),
  affiliateBannerSubtitle: z.string().trim().max(320).optional().or(z.literal("")),
  affiliateBannerImageUrl: mediaFieldSchema.optional().or(z.literal("")),
  affiliateBannerButtonText: z.string().trim().max(80).optional().or(z.literal("")),
  affiliateBannerButtonUrl: accountUrlField.optional(),
  affiliateGuideTitle: accountTextField.optional(),
  affiliateGuideIntro: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep1: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep2: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep3: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep4: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep5: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep6: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep7: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateGuideStep8: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateCanBuy: z.boolean(),
  affiliateDefaultTab: z.enum(["affiliate", "overview"]),
  affiliateBlockCheckoutMessage: z.string().trim().max(500).optional().or(z.literal("")),
  affiliateShowPurchaseHistory: z.boolean(),
  affiliateShowBuyerStats: z.boolean(),
  affiliateShowShoppingCta: z.boolean(),
  affiliateShowVoucher: z.boolean(),
  affiliateShowAddressBook: z.boolean(),
  affiliateShowSupport: z.boolean(),
  affiliateShowWithdrawals: z.boolean(),
  affiliateShowGuide: z.boolean(),
  bannerEnabled: z.boolean(),
  bannerTitle: accountTextField,
  bannerSubtitle: z.string().trim().max(320).optional().or(z.literal("")),
  bannerImageUrl: mediaFieldSchema.optional().or(z.literal("")),
  bannerButtonText: z.string().trim().max(80).optional().or(z.literal("")),
  bannerButtonUrl: accountUrlField,
});

export const websiteSectionPatchSchema = z.discriminatedUnion("section", [
  websiteSectionGeneralSchema,
  websiteSectionStorefrontSchema,
  websiteSectionFooterSchema,
  websiteSectionTrustSchema,
  websiteSectionCommerceSchema,
  websiteSectionAnalyticsSchema,
  websiteSectionCustomerAccountSchema,
]);

export type WebsiteSectionPatch = z.infer<typeof websiteSectionPatchSchema>;

export function parseHomeInfoCardsJson(
  raw: string,
): Array<{ title: string; subtitle: string; icon: string; href: string; enabled: boolean; sortOrder: number }> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-home-info-cards");
  return parsed
    .map((item, index) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      subtitle: typeof item.subtitle === "string" ? item.subtitle.trim() : "",
      icon: typeof item.icon === "string" ? item.icon.trim() : "",
      href: typeof item.href === "string" ? item.href.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .filter((item) => item.title)
    .slice(0, 8);
}

export function parseHomeChipsJson(
  raw: string,
): Array<{ label: string; enabled: boolean; sortOrder: number }> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-home-chips");
  return parsed
    .map((item, index) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .filter((item) => item.label)
    .slice(0, 12);
}

export function parseHomeCategoryChipsJson(
  raw: string,
): Array<{ label: string; slug: string; enabled: boolean; sortOrder: number }> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-home-category-chips");
  return parsed
    .map((item, index) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      slug: typeof item.slug === "string" ? item.slug.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .filter((item) => item.label)
    .slice(0, 12);
}

export function parseFooterGroupsJson(
  raw: string,
): Array<{
  title: string;
  enabled: boolean;
  sortOrder: number;
  links: Array<{ label: string; href: string; enabled: boolean; sortOrder: number }>;
}> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-footer-groups");
  return parsed
    .map((item, index) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return null;
      const linksRaw = Array.isArray(item.links) ? item.links : [];
      const links = linksRaw
        .map((link, linkIndex) => {
          if (!link || typeof link !== "object") return null;
          const row = link as Record<string, unknown>;
          const label = typeof row.label === "string" ? row.label.trim() : "";
          const href = typeof row.href === "string" ? row.href.trim() : "";
          if (!label || !href) return null;
          return {
            label,
            href,
            enabled: typeof row.enabled === "boolean" ? row.enabled : true,
            sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : linkIndex + 1,
          };
        })
        .filter((row): row is { label: string; href: string; enabled: boolean; sortOrder: number } => Boolean(row));
      return {
        title,
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
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

export function parseFloatingCtasJson(
  raw: string,
): Array<{ label: string; href: string; enabled: boolean; sortOrder: number }> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-floating-ctas");
  return parsed
    .map((item, index) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      href: typeof item.href === "string" ? item.href.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .filter((row) => row.label && row.href)
    .slice(0, 5);
}

export function parseDealsSectionsJson(raw: string): Array<Record<string, unknown>> {
  if (!raw.trim()) return [];
  return safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-deals-sections");
}

export function parseHeaderMenuJson(
  raw: string,
): Array<{ label: string; href: string; enabled: boolean; sortOrder: number }> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-header-menu");
  return parsed
    .map((item, index) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      href: typeof item.href === "string" ? item.href.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .filter((item) => item.label && item.href)
    .slice(0, 8);
}

function sanitizeHomeBannerObjectPositionJson(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "center center";
  const allowed = new Set(["center center", "left center", "right center", "center top", "center bottom"]);
  return allowed.has(normalized) ? normalized : "center center";
}

function sanitizeHomeBannerImageFitJson(value: unknown, fallback: "contain" | "cover"): "contain" | "cover" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "cover") return "cover";
  if (normalized === "contain") return "contain";
  return fallback;
}

export function parseHomeBannersJson(
  raw: string,
): Array<{
  imageUrl: string;
  mobileImageUrl: string;
  link: string;
  altText?: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  enabled: boolean;
  sortOrder: number;
  imageFit: "contain" | "cover";
  objectPosition: string;
  mobileImageFit: "contain" | "cover";
  mobileObjectPosition: string;
}> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-home-banners");
  return parsed
    .map((item, index) => ({
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl.trim() : "",
      mobileImageUrl: typeof item.mobileImageUrl === "string" ? item.mobileImageUrl.trim() : "",
      link: typeof item.link === "string" ? item.link.trim() : "",
      altText: typeof item.altText === "string" ? item.altText.trim() : undefined,
      title: typeof item.title === "string" ? item.title.trim() : "",
      subtitle: typeof item.subtitle === "string" ? item.subtitle.trim() : "",
      ctaLabel: typeof item.ctaLabel === "string" ? item.ctaLabel.trim() : "",
      ctaHref: typeof item.ctaHref === "string" ? item.ctaHref.trim() : "",
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
      imageFit: sanitizeHomeBannerImageFitJson(item.imageFit, "contain"),
      objectPosition: sanitizeHomeBannerObjectPositionJson(item.objectPosition),
      mobileImageFit: sanitizeHomeBannerImageFitJson(item.mobileImageFit, "contain"),
      mobileObjectPosition: sanitizeHomeBannerObjectPositionJson(item.mobileObjectPosition),
    }))
    .filter((item) => item.imageUrl)
    .slice(0, 4);
}

export function parseHomePromoCardsJson(
  raw: string,
  limit: number,
): Array<{
  imageUrl: string;
  link: string;
  title: string;
  description: string;
  altText?: string;
  objectPosition?: string;
  imageFit?: "contain" | "cover";
  enabled: boolean;
  sortOrder: number;
}> {
  if (!raw.trim()) return [];
  const parsed = safeParseJson<Array<Record<string, unknown>>>(raw, [], "admin-settings:parse-home-promo-cards");
  return parsed
    .map((item, index) => {
      const linkFromHref = typeof item.href === "string" ? item.href.trim() : "";
      const linkFromLink = typeof item.link === "string" ? item.link.trim() : "";
      const imageFit: "contain" | "cover" =
        typeof item.imageFit === "string" && item.imageFit.trim().toLowerCase() === "cover" ? "cover" : "contain";
      return {
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl.trim() : "",
        link: linkFromLink || linkFromHref,
        title: typeof item.title === "string" ? item.title.trim() : "",
        description: typeof item.description === "string" ? item.description.trim() : "",
        altText: typeof item.altText === "string" ? item.altText.trim() : undefined,
        objectPosition: typeof item.objectPosition === "string" ? item.objectPosition.trim().toLowerCase() : undefined,
        imageFit,
        enabled: typeof item.enabled === "boolean" ? item.enabled : true,
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
      };
    })
    .filter((item) => Boolean(item.enabled || item.title || item.link || item.imageUrl))
    .slice(0, limit);
}

