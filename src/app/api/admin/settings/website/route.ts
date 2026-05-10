import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../../../../../lib/auth";
import {
  parseSocialLinksJson,
  websiteSettingsFormSchema,
} from "../../../../../lib/admin-settings";
import { composeWebsiteDbPayload } from "../../../../../lib/website-settings-compose";
import { getWebsiteSettings } from "../../../../../lib/settings";
import { normalizeBannerMediaUrl, normalizeMediaUrl } from "../../../../../lib/media-url";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
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
    db.category.findMany({ where: { status: "PUBLISHED" }, select: { slug: true }, take: 80 }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true }, take: 80 }),
    db.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true }, take: 80 }),
  ]);
  const paths = new Set<string>(["/", "/cua-hang", "/bai-viet", "/lien-he", "/gioi-thieu", "/tra-cuu-don-hang"]);
  for (const row of categoryRows) paths.add(`/danh-muc/${row.slug}`);
  for (const row of pageRows) paths.add(`/${row.slug}`);
  for (const row of postRows) paths.add(`/bai-viet/${row.slug}`);
  for (const path of paths) revalidatePath(path);
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const [settings, settingRow] = await Promise.all([
      getWebsiteSettings(),
      (async () => {
        const db = await getDbClient();
        if (!db) return null;
        return db.setting.findUnique({
          where: { key: "website_settings" },
          select: { updatedAt: true },
        });
      })(),
    ]);
    return NextResponse.json({
      item: {
        ...settings,
        socialLinksJson: JSON.stringify(settings.socialLinks, null, 2),
        mediaVersion: settingRow?.updatedAt ? String(new Date(settingRow.updatedAt).getTime()) : "",
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải cài đặt website." }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = websiteSettingsFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Du lieu website settings khong hop le." },
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
    const socialLinks = parseSocialLinksJson(values.socialLinksJson);
    const normalizedOgImage = await normalizeBannerMediaUrl(values.defaultOgImage ?? "");
    if ((values.defaultOgImage ?? "").trim() && !normalizedOgImage) {
      return NextResponse.json(
        { message: "Ảnh OG mặc định không hợp lệ hoặc không thể truy cập từ media công khai." },
        { status: 400 },
      );
    }

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
    const merged: Record<string, unknown> = {
      ...restExisting,
      siteName: values.siteName,
      slogan: values.slogan ?? "",
      shortDescription: values.shortDescription ?? "",
      siteUrl: values.siteUrl,
      canonicalBaseUrl: values.canonicalBaseUrl ?? values.siteUrl,
      logoUrl: normalizeMediaUrl(values.logoUrl ?? ""),
      footerLogoUrl: normalizeMediaUrl(values.footerLogoUrl ?? values.logoUrl ?? ""),
      productPlaceholderImage: normalizeMediaUrl(values.productPlaceholderImage ?? ""),
      faviconUrl: normalizeMediaUrl(values.faviconUrl ?? ""),
      hotline: values.hotline ?? "",
      email: values.email ?? "",
      address: values.address ?? "",
      footerText: values.footerText ?? "",
      defaultSeoTitle: values.defaultSeoTitle ?? "",
      defaultSeoDescription: values.defaultSeoDescription ?? "",
      defaultSeoKeywords: values.defaultSeoKeywords ?? "",
      defaultOgImage: normalizedOgImage,
      robotsIndex: values.robotsIndex,
      robotsFollow: values.robotsFollow,
    };

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


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật cài đặt website." },
      { status: 500 },
    );
  }
}

