import type { MetadataRoute } from "next";

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

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
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
    { url: `${base}/bai-viet`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/gio-hang`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/thanh-toan`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/tra-cuu-don-hang`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
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
    db.category.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
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
