import { db } from "../src/lib/db";
import { normalizeMediaUrl } from "../src/lib/media-url";
import { sanitizePostThumbnailUrl } from "../src/lib/media";

function normalizeOrNull(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeMediaUrl(value);
  return normalized || null;
}

async function main(): Promise<void> {
  let changed = 0;

  const categories = await db.category.findMany({ select: { id: true, imageUrl: true } });
  for (const row of categories) {
    const next = normalizeOrNull(row.imageUrl);
    if (next !== row.imageUrl) {
      await db.category.update({ where: { id: row.id }, data: { imageUrl: next } });
      changed += 1;
    }
  }

  const brands = await db.brand.findMany({ select: { id: true, logoUrl: true } });
  for (const row of brands) {
    const next = normalizeOrNull(row.logoUrl);
    if (next !== row.logoUrl) {
      await db.brand.update({ where: { id: row.id }, data: { logoUrl: next } });
      changed += 1;
    }
  }

  const banners = await db.banner.findMany({ select: { id: true, imageUrl: true, mobileImageUrl: true } });
  for (const row of banners) {
    const nextDesktop = normalizeMediaUrl(row.imageUrl);
    const nextMobile = normalizeOrNull(row.mobileImageUrl);
    if (nextDesktop !== row.imageUrl || nextMobile !== row.mobileImageUrl) {
      await db.banner.update({
        where: { id: row.id },
        data: { imageUrl: nextDesktop || row.imageUrl, mobileImageUrl: nextMobile },
      });
      changed += 1;
    }
  }

  const posts = await db.post.findMany({ select: { id: true, thumbnailUrl: true } });
  for (const row of posts) {
    const safe = sanitizePostThumbnailUrl(row.thumbnailUrl);
    const next = safe || null;
    if (next !== row.thumbnailUrl) {
      await db.post.update({ where: { id: row.id }, data: { thumbnailUrl: next } });
      changed += 1;
    }
  }

  const productImages = await db.productImage.findMany({ select: { id: true, url: true } });
  for (const row of productImages) {
    const next = normalizeMediaUrl(row.url);
    if (next && next !== row.url) {
      await db.productImage.update({ where: { id: row.id }, data: { url: next } });
      changed += 1;
    }
  }

  const websiteSetting = await db.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } });
  if (websiteSetting?.value && typeof websiteSetting.value === "object" && !Array.isArray(websiteSetting.value)) {
    const current = websiteSetting.value as Record<string, unknown>;
    const next = {
      ...current,
      logoUrl: normalizeMediaUrl(String(current.logoUrl ?? current.logo ?? "")),
      faviconUrl: normalizeMediaUrl(String(current.faviconUrl ?? "")),
      defaultOgImage: normalizeMediaUrl(String(current.defaultOgImage ?? "")),
      logo: normalizeMediaUrl(String(current.logoUrl ?? current.logo ?? "")),
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      await db.setting.update({ where: { key: "website_settings" }, data: { value: next } });
      changed += 1;
    }
  }

  const themeSetting = await db.setting.findUnique({ where: { key: "theme_settings" }, select: { value: true } });
  if (themeSetting?.value && typeof themeSetting.value === "object" && !Array.isArray(themeSetting.value)) {
    const current = themeSetting.value as Record<string, unknown>;
    const homeBannerImage = normalizeMediaUrl(String(current.homeBannerImage ?? ""));
    const next = {
      ...current,
      homeBannerImage,
      homeBanner:
        current.homeBanner && typeof current.homeBanner === "object" && !Array.isArray(current.homeBanner)
          ? {
              ...(current.homeBanner as Record<string, unknown>),
              desktop: normalizeMediaUrl(String((current.homeBanner as Record<string, unknown>).desktop ?? "")),
              mobile: normalizeMediaUrl(String((current.homeBanner as Record<string, unknown>).mobile ?? "")),
            }
          : {
              desktop: homeBannerImage,
              mobile: homeBannerImage,
            },
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      await db.setting.update({ where: { key: "theme_settings" }, data: { value: next } });
      changed += 1;
    }
  }

  console.log(`Normalized media URLs. Records changed: ${changed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
