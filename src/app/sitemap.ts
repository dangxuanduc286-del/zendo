import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "../lib/utils";

type SitemapItem = MetadataRoute.Sitemap[number];

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

const SITEMAP_PAGE_SLUG_BLACKLIST = new Set(["gio-hang", "thanh-toan", "tra-cuu-don-hang"]);

function appUrl(): string {
  return resolveSiteUrl().replace(/\/+$/, "");
}

/** Mỗi URL một lần; mục sau cùng thắng (pageRoutes từ DB ghi đè staticRoutes nếu trùng). */
function dedupeSitemapByUrl(items: SitemapItem[]): SitemapItem[] {
  const byUrl = new Map<string, SitemapItem>();
  for (const item of items) {
    byUrl.set(item.url, item);
  }
  return [...byUrl.values()];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const now = new Date();
  const staticRoutes: SitemapItem[] = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/cua-hang`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/san-pham-moi`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/ban-chay`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/flash-deal`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/bai-viet`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/gioi-thieu`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/lien-he`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/cau-hoi-thuong-gap`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/chinh-sach-giao-hang`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/chinh-sach-doi-tra`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/huong-dan-mua-hang`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/chinh-sach-bao-mat`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/chinh-sach-bao-hanh`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/dieu-khoan-su-dung`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
  ];

  const db = await getDbClient();
  if (!db) {
    return staticRoutes;
  }

  const [categories, products, posts, pages] = await Promise.all([
    db.category
      .findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
      .catch((): Array<{ slug: string; updatedAt: Date }> => []),
    db.product
      .findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } })
      .catch((): Array<{ slug: string; updatedAt: Date }> => []),
    db.post
      .findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
      .catch((): Array<{ slug: string; updatedAt: Date }> => []),
    db.page
      .findMany({
        where: { status: "PUBLISHED", slug: { notIn: [...SITEMAP_PAGE_SLUG_BLACKLIST] } },
        select: { slug: true, updatedAt: true },
      })
      .catch((): Array<{ slug: string; updatedAt: Date }> => []),
  ]);

  const categoryRoutes: SitemapItem[] = categories.map((item) => ({
    url: `${base}/danh-muc/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const productRoutes: SitemapItem[] = products.map((item) => ({
    url: `${base}/san-pham/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "daily",
    priority: 0.9,
  }));
  const postRoutes: SitemapItem[] = posts.map((item) => ({
    url: `${base}/bai-viet/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const pageRoutes: SitemapItem[] = pages.map((item) => ({
    url: `${base}/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const routes = dedupeSitemapByUrl([
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...postRoutes,
    ...pageRoutes,
  ]);

  return routes;
}
