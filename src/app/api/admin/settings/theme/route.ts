import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../../lib/auth";
import { parseHomeBannersJson, parseHomePromoCardsJson, themeSettingsFormSchema } from "../../../../../lib/admin-settings";
import { getThemeSettings, normalizeProductCardButtonText } from "../../../../../lib/settings";
import { isPublicMediaUrl, normalizeBannerMediaUrl, normalizeMediaUrl } from "../../../../../lib/media-url";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn chưa đăng nhập quản trị." }, { status: 401 });
    }
    const settings = await getThemeSettings();


    return NextResponse.json({ item: settings });
  } catch {
    return NextResponse.json({ message: "Không thể tải cài đặt giao diện." }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn chưa đăng nhập quản trị." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = themeSettingsFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu giao diện không hợp lệ." },
        { status: 400 },
      );
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const values = parsed.data;
    const { homeBannersJson, homeRightPromoCardsJson, homeBottomPromoCardsJson, ...restValues } = values;
    const submittedBanner = normalizeMediaUrl(values.mainBannerImage || values.homeBannerImage || "");
    const submittedMobileBanner = normalizeMediaUrl(values.homeBannerMobileImage || "");
    const homeBannerImage = await normalizeBannerMediaUrl(submittedBanner);
    const homeBannerMobileImage = await normalizeBannerMediaUrl(submittedMobileBanner);
    const leftBannerTopImage = await normalizeBannerMediaUrl(normalizeMediaUrl(values.leftBannerTopImage || ""));
    const leftBannerBottomImage = await normalizeBannerMediaUrl(normalizeMediaUrl(values.leftBannerBottomImage || ""));
    const rightBannerTopImage = await normalizeBannerMediaUrl(normalizeMediaUrl(values.rightBannerTopImage || ""));
    const rightBannerBottomImage = await normalizeBannerMediaUrl(normalizeMediaUrl(values.rightBannerBottomImage || ""));
    const siteBackgroundImage = await normalizeBannerMediaUrl(normalizeMediaUrl(values.siteBackgroundImage || ""));
    const submittedCampaignBackground = normalizeMediaUrl(values.campaignBackgroundImage || "");
    const submittedCampaignBackgroundMobile = normalizeMediaUrl(values.campaignBackgroundMobileImage || "");
    const campaignBackgroundImage = isPublicMediaUrl(submittedCampaignBackground) ? submittedCampaignBackground : "";
    const campaignBackgroundMobileImage = isPublicMediaUrl(submittedCampaignBackgroundMobile)
      ? submittedCampaignBackgroundMobile
      : "";
    if (submittedBanner && !homeBannerImage) {
      return NextResponse.json(
        { message: "URL banner không hợp lệ hoặc ảnh không tồn tại trên media.zendo.vn." },
        { status: 400 },
      );
    }
    if (submittedMobileBanner && !homeBannerMobileImage) {
      return NextResponse.json(
        { message: "URL banner mobile không hợp lệ hoặc ảnh không tồn tại trên media.zendo.vn." },
        { status: 400 },
      );
    }
    if (submittedCampaignBackground && !campaignBackgroundImage) {
      return NextResponse.json(
        { message: "URL ảnh nền desktop không hợp lệ hoặc ảnh không tồn tại trên media.zendo.vn." },
        { status: 400 },
      );
    }
    if (submittedCampaignBackgroundMobile && !campaignBackgroundMobileImage) {
      return NextResponse.json(
        { message: "URL ảnh nền mobile không hợp lệ hoặc ảnh không tồn tại trên media.zendo.vn." },
        { status: 400 },
      );
    }
    const homeBanners = parseHomeBannersJson(homeBannersJson)
      .map((item) => ({
        ...item,
        imageUrl: normalizeMediaUrl(item.imageUrl),
        mobileImageUrl: normalizeMediaUrl(item.mobileImageUrl),
      }))
      .filter((item) => item.imageUrl);

    const homeRightPromoCards = parseHomePromoCardsJson(homeRightPromoCardsJson, 4)
      .map((item) => ({
        ...item,
        imageUrl: normalizeMediaUrl(item.imageUrl),
      }));

    const homeBottomPromoCards = parseHomePromoCardsJson(homeBottomPromoCardsJson, 5)
      .map((item) => ({
        ...item,
        imageUrl: normalizeMediaUrl(item.imageUrl),
      }));
    const themeSettings = {
      ...restValues,
      ctaColor: "#F59E0B",
      productCardButtonText: normalizeProductCardButtonText(values.productCardButtonText),
      mainBannerImage: homeBannerImage,
      mainBannerHref: values.mainBannerHref || values.heroCtaHref || "",
      mainBannerTitle: values.mainBannerTitle || values.heroTitle || "",
      mainBannerSubtitle: values.mainBannerSubtitle || values.heroSubtitle || "",
      leftBannerTopImage,
      leftBannerTopHref: values.leftBannerTopHref || "",
      leftBannerBottomImage,
      leftBannerBottomHref: values.leftBannerBottomHref || "",
      rightBannerTopImage,
      rightBannerTopHref: values.rightBannerTopHref || "",
      rightBannerBottomImage,
      rightBannerBottomHref: values.rightBannerBottomHref || "",
      campaignBackgroundEnabled: values.campaignBackgroundEnabled,
      campaignBackgroundImage: values.campaignBackgroundEnabled ? campaignBackgroundImage : "",
      campaignBackgroundMobileImage:
        values.campaignBackgroundEnabled && campaignBackgroundMobileImage
          ? campaignBackgroundMobileImage
          : "",
      enableSiteBackgroundImage: values.enableSiteBackgroundImage,
      siteBackgroundImage: values.enableSiteBackgroundImage ? siteBackgroundImage : "",
      themeBackgroundImage: values.enableSiteBackgroundImage ? siteBackgroundImage : "",
      homeBannerImage,
      homeBannerMobileImage: homeBannerMobileImage || homeBannerImage,
      homeBanners,
      homeBanner: {
        desktop: homeBannerImage,
        mobile: homeBannerMobileImage || homeBannerImage,
      },
      homeRightPromoCards,
      homeBottomPromoCards,
      toggleSections: {
        showFeaturedProducts: values.enableFeaturedSection,
        showBestSellerProducts: values.enableBestSellerSection,
        showNewProducts: values.enableNewSection,
        showBlogSection: values.enableBlogSection,
        showBrandStrip: values.enableBrandSection,
        showTestimonials: false,
      },
    };
    await db.setting.upsert({
      where: { key: "theme_settings" },
      update: {
        value: themeSettings,
        group: "theme",
        description: "Theme settings",
        isPublic: true,
      },
      create: {
        key: "theme_settings",
        value: themeSettings,
        group: "theme",
        description: "Theme settings",
        isPublic: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/website-appearance");
    revalidatePath("/admin/banners");
    revalidateTag("storefront-settings");


    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật cài đặt giao diện. Vui lòng thử lại." }, { status: 500 });
  }
}

