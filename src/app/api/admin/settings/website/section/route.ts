import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../../../lib/auth";
import {
  parseFloatingCtasJson,
  parseFooterGroupsJson,
  parseHeaderMenuJson,
  parseHomeCategoryChipsJson,
  parseHomeChipsJson,
  parseHomeInfoCardsJson,
  parseSocialLinksJson,
  parseDealsSectionsJson,
  websiteSectionPatchSchema,
} from "../../../../../../lib/admin-settings";
import { getWebsiteSettings } from "../../../../../../lib/settings";
import { composeWebsiteDbPayload } from "../../../../../../lib/website-settings-compose";
import { normalizeBannerMediaUrl, normalizeMediaUrl } from "../../../../../../lib/media-url";
import { invalidateDealsCaches } from "../../../../../../lib/deals/invalidate";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

async function revalidateStorefrontPaths(
  db: Awaited<ReturnType<typeof getDbClient>>,
): Promise<void> {
  if (!db) return;
  const [categoryRows, pageRows, postRows] = await Promise.all([
    db.category.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
      take: 80,
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
      take: 80,
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
      take: 80,
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const paths = new Set<string>([
    "/",
    "/cua-hang",
    "/san-pham",
    "/bai-viet",
    "/lien-he",
    "/gioi-thieu",
    "/tra-cuu-don-hang",
    "/tai-khoan",
  ]);
  for (const row of categoryRows) paths.add(`/danh-muc/${row.slug}`);
  for (const row of pageRows) paths.add(`/${row.slug}`);
  for (const row of postRows) paths.add(`/bai-viet/${row.slug}`);

  for (const path of paths) revalidatePath(path);
  revalidateTag("storefront-settings");
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn chưa đăng nhập quản trị." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = websiteSectionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu phần cài đặt không hợp lệ." },
        { status: 400 },
      );
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }

    const data = parsed.data;
    const existingRow = await db.setting.findUnique({
      where: { key: "website_settings" },
      select: { value: true },
    });
    const existingValue = existingRow?.value;
    const existingFlat =
      existingValue && typeof existingValue === "object" && !Array.isArray(existingValue)
        ? (existingValue as Record<string, unknown>)
        : {};
    const restExisting = { ...existingFlat };
    delete restExisting.socialLinks;

    let socialLinks = (await getWebsiteSettings()).socialLinks;
    let patchForMerge: Record<string, unknown>;

    switch (data.section) {
      case "general": {
        const { section, socialLinksJson, ...rest } = data;
        void section;
        socialLinks = parseSocialLinksJson(socialLinksJson);
        const normalizedOgImage = await normalizeBannerMediaUrl(rest.defaultOgImage || "");
        if ((rest.defaultOgImage || "").trim() && !normalizedOgImage) {
          return NextResponse.json(
            { message: "Ảnh OG mặc định không hợp lệ hoặc không thể truy cập từ media công khai." },
            { status: 400 },
          );
        }
        patchForMerge = {
          ...rest,
          logoUrl: normalizeMediaUrl(rest.logoUrl || ""),
          footerLogoUrl: normalizeMediaUrl(rest.footerLogoUrl || rest.logoUrl || ""),
          productPlaceholderImage: normalizeMediaUrl(rest.productPlaceholderImage || ""),
          faviconUrl: normalizeMediaUrl(rest.faviconUrl || ""),
          defaultOgImage: normalizedOgImage,
        };
        break;
      }
      case "storefront": {
        const {
          section,
          homeInfoCardsJson,
          footerTrustBanners,
          homeQuickChipsJson,
          homeCategoryChipsJson,
          dealsSectionsJson,
          headerMenuJson,
          footerGroupsJson,
          floatingCtasJson,
          productDetailEnabled,
          buyNowLabel,
          addToCartLabel,
          showBestPriceNote,
          bestPriceLabel,
          showDiscountBadge,
          descriptionTitle,
          readMoreLabel,
          reviewTitle,
          reviewEmptyText,
          verifiedPurchaseLabel,
          soldLabel,
          ratingLabel,
          policyOfficialLabel,
          policyReturnLabel,
          policyShippingLabel,
          policyWarrantyLabel,
          showPolicyRow,
          showReviewSection,
          showRelatedProducts,
          hideTechnicalSpecs,
          ...rest
        } = data;
        void section;
        patchForMerge = {
          ...rest,
          footerTrustBanners: footerTrustBanners.map((item) => ({
            ...item,
            imageUrl: normalizeMediaUrl(item.imageUrl ?? ""),
          })),
          homeInfoCards: parseHomeInfoCardsJson(homeInfoCardsJson),
          homeQuickChips: parseHomeChipsJson(homeQuickChipsJson),
          homeCategoryChips: parseHomeCategoryChipsJson(homeCategoryChipsJson),
          dealsSections: parseDealsSectionsJson(dealsSectionsJson),
          headerNavItems: parseHeaderMenuJson(headerMenuJson),
          footerLinkGroups: parseFooterGroupsJson(footerGroupsJson),
          floatingCtas: parseFloatingCtasJson(floatingCtasJson),
          productDetailSettings: {
            enabled: productDetailEnabled,
            buyNowLabel,
            addToCartLabel,
            showBestPriceNote,
            bestPriceLabel,
            showDiscountBadge,
            descriptionTitle,
            readMoreLabel,
            reviewTitle,
            reviewEmptyText,
            verifiedPurchaseLabel,
            soldLabel,
            ratingLabel,
            policyOfficialLabel,
            policyReturnLabel,
            policyShippingLabel,
            policyWarrantyLabel,
            showPolicyRow,
            showReviewSection,
            showRelatedProducts,
            hideTechnicalSpecs,
          },
        };
        break;
      }
      case "footer": {
        const { section, ...rest } = data;
        void section;
        patchForMerge = { ...rest };
        break;
      }
      case "trust": {
        const { section, ...rest } = data;
        void section;
        patchForMerge = { ...rest };
        break;
      }
      case "commerce": {
        const { section, ...rest } = data;
        void section;
        patchForMerge = { ...rest };
        break;
      }
      case "analytics": {
        const { section, ...rest } = data;
        void section;
        patchForMerge = { ...rest };
        break;
      }
      case "customerAccount": {
        const {
          section,
          bannerEnabled,
          bannerTitle,
          bannerSubtitle,
          bannerImageUrl,
          bannerButtonText,
          bannerButtonUrl,
          affiliateBannerEnabled,
          affiliateBannerTitle,
          affiliateBannerSubtitle,
          affiliateBannerImageUrl,
          affiliateBannerButtonText,
          affiliateBannerButtonUrl,
          ...rest
        } = data;
        void section;
        patchForMerge = {
          customerAccountSettings: {
            ...rest,
            affiliateMinWithdrawalAmount:
              typeof rest.affiliateMinWithdrawalAmount === "number"
                ? rest.affiliateMinWithdrawalAmount
                : 100000,
            banner: {
              enabled: bannerEnabled,
              title: bannerTitle,
              subtitle: bannerSubtitle,
              imageUrl: normalizeMediaUrl(bannerImageUrl || ""),
              buttonText: bannerButtonText,
              buttonUrl: bannerButtonUrl,
            },
            affiliateBanner: {
              enabled: typeof affiliateBannerEnabled === "boolean" ? affiliateBannerEnabled : false,
              title: affiliateBannerTitle || "",
              subtitle: affiliateBannerSubtitle || "",
              imageUrl: normalizeMediaUrl(affiliateBannerImageUrl || ""),
              buttonText: affiliateBannerButtonText || "",
              buttonUrl: affiliateBannerButtonUrl || "",
            },
          },
        };
        break;
      }
      default:
        patchForMerge = {};
    }

    const merged: Record<string, unknown> = { ...restExisting, ...patchForMerge };
    const websiteSettings = composeWebsiteDbPayload(merged, socialLinks);
    const websiteJson = JSON.parse(JSON.stringify(websiteSettings)) as import("@prisma/client").Prisma.InputJsonValue;

    await db.$transaction([
      db.setting.upsert({
        where: { key: "website_settings" },
        update: {
          value: websiteJson,
          group: "website",
          description: "Website settings",
          isPublic: true,
        },
        create: {
          key: "website_settings",
          value: websiteJson,
          group: "website",
          description: "Website settings",
          isPublic: true,
        },
      }),
      db.setting.upsert({
        where: { key: "social_links" },
        update: {
          value: socialLinks,
          group: "website",
          description: "Social links",
          isPublic: true,
        },
        create: {
          key: "social_links",
          value: socialLinks,
          group: "website",
          description: "Social links",
          isPublic: true,
        },
      }),
    ]);

    await revalidateStorefrontPaths(db);
    revalidatePath("/admin/website-appearance");
    invalidateDealsCaches();
    if (data.section === "analytics") {
      revalidatePath("/admin/analytics");
    }
    if (data.section === "commerce") {
      revalidatePath("/shop");
      revalidateTag("product");
    }
    if (data.section === "customerAccount") {
      revalidatePath("/tai-khoan");
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật cài đặt. Vui lòng thử lại." }, { status: 500 });
  }
}
