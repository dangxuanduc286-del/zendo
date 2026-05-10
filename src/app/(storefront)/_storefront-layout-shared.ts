import { getServerSession } from "next-auth";
import { defaultFooterTrustBannersSlots, getWebsiteSettings } from "../../lib/settings";
import { authOptions } from "../../lib/auth";
import { resolveMediaUrl } from "../../lib/media";
import { memoizePerRequest } from "../../lib/runtime/request-cache";
import { getStorefrontDbClient } from "../../lib/storefront-db";

/** Alias for storefront root layout / metadata (same memoized DB client). */
export { getStorefrontDbClient as getDbClient } from "../../lib/storefront-db";

export type HeaderCategoryChild = {
  id: string;
  name: string;
  slug: string;
};

export type HeaderCategory = {
  id: string;
  name: string;
  slug: string;
  children: HeaderCategoryChild[];
};

export type HeaderPage = {
  id: string;
  title: string;
  slug: string;
};

async function getHeaderCategoriesInternal(): Promise<HeaderCategory[]> {
  const db = await getStorefrontDbClient();
  if (!db) return [];
  const rows = await db.category.findMany({
    where: { status: "PUBLISHED", parentId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        where: { status: "PUBLISHED" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, slug: true },
      },
    },
  });
  return rows;
}

async function getHeaderPagesInternal(): Promise<HeaderPage[]> {
  const db = await getStorefrontDbClient();
  if (!db) return [];
  return db.page.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ updatedAt: "desc" }],
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
}

export const getHeaderCategories = memoizePerRequest(getHeaderCategoriesInternal);
export const getHeaderPages = memoizePerRequest(getHeaderPagesInternal);

export async function getSafeStorefrontSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    void error;
    return null;
  }
}

export async function getSafeWebsiteSettings() {
  try {
    return await getWebsiteSettings();
  } catch (error) {
    void error;
    return {
      siteName: "Zendo.vn",
      slogan: "",
      shortDescription: "",
      siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      canonicalBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      logoUrl: "",
      footerLogoUrl: "",
      productPlaceholderImage: "",
      faviconUrl: "",
      hotline: "",
      email: "",
      address: "",
      footerText: "",
      footerBrandName: "Zendo.vn",
      footerBrandDescription: "",
      showFooterSocialLinks: false,
      footerFacebookUrl: "",
      footerInstagramUrl: "",
      footerTiktokUrl: "",
      footerYoutubeUrl: "",
      footerZaloUrl: "",
      defaultSeoTitle: "",
      defaultSeoDescription: "",
      defaultSeoKeywords: "",
      defaultOgImage: "",
      robotsIndex: true,
      robotsFollow: true,
      searchPlaceholder: "",
      socialLinks: [],
      logo: "",
      footer: { company: "", address: "", copyright: "" },
      seoDefault: { siteName: "Zendo.vn", title: "", description: "", keywords: [], ogImage: "" },
      zalo: "",
      showAnnouncementBar: false,
      announcementText: "",
      showStorefrontTopbar: true,
      topbarLeftText: "",
      topbarShippingText: "",
      topbarCommitmentText: "",
      showHeaderSearch: true,
      showHeaderCartIcon: true,
      showHeaderAdminMenu: true,
      headerDesktopCategoryLimit: 10,
      headerMobileCategoryLimit: 12,
      showTopHighlights: false,
      showHomeFeatureBlocks: false,
      showBottomTrustBlock: true,
      footerHtml: "",
      trustBarItems: [],
      homeInfoCards: [],
      footerTrustBanners: defaultFooterTrustBannersSlots(),
      homeQuickChips: [],
      homeCategoryChips: [],
      headerNavItems: [
        { label: "Cửa hàng", href: "/cua-hang", enabled: true, sortOrder: 1 },
        { label: "Bài viết", href: "/bai-viet", enabled: true, sortOrder: 2 },
      ],
      businessHours: "",
      mapUrl: "",
      taxCode: "",
      defaultProductWarranty: "",
      analyticsEnabled: true,
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
      trackingEnabled: false,
      ga4ScriptEnabled: false,
      metaPixelScriptEnabled: false,
      remarketingEventsEnabled: false,
      popupEnabled: false,
      popupTitle: "",
      popupContent: "",
      popupImageUrl: "",
      popupLink: "",
      popupDelayMs: 2500,
      popupFrequencyHours: 12,
      gtmContainerId: "",
      ga4MeasurementId: "",
      metaPixelId: "",
      tiktokPixelEnabled: false,
      zaloPixelEnabled: false,
      tiktokPixelId: "",
      zaloPixelId: "",
      clarityProjectId: "",
      headScripts: "",
      bodyScripts: "",
    };
  }
}

export function sanitizeGa4Id(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return /^G-[A-Z0-9]+$/.test(cleaned) ? cleaned : "";
}

export function sanitizeMetaPixelId(value: string): string {
  const cleaned = value.trim().replace(/[^0-9]/g, "");
  return cleaned.length >= 5 ? cleaned : "";
}

export function sanitizeGtmId(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return /^GTM-[A-Z0-9]+$/.test(cleaned) ? cleaned : "";
}

export function sanitizeClarityId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function sanitizeGenericPixelId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function sanitizeCampaignBackgroundUrl(value: string): string {
  const normalized = resolveMediaUrl(value);
  if (!normalized) return "";
  if (/og-default\.jpg/i.test(normalized)) return "";
  if (/\/images\/seo\//i.test(normalized)) return "";
  return normalized;
}
