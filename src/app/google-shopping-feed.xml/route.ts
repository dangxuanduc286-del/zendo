import { NextResponse } from "next/server";
import { resolveProductImageUrl } from "@/lib/product-image";
import { resolveSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 1800;

type FeedProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: { toString(): string } | number | string;
  salePrice: { toString(): string } | number | string | null;
  stockQuantity: number;
  category: { name: string };
  brand: { name: string } | null;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
};

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("@/lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function siteOrigin(): string {
  return resolveSiteUrl().replace(/\/+$/, "");
}

function xmlEscape(value: string): string {
  const amp = String.fromCharCode(38, 97, 109, 112, 59);
  const lt = String.fromCharCode(38, 108, 116, 59);
  const gt = String.fromCharCode(38, 103, 116, 59);
  const quot = String.fromCharCode(38, 113, 117, 111, 116, 59);
  const apos = String.fromCharCode(38, 97, 112, 111, 115, 59);

  return value
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateForGoogle(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function formatVnd(value: FeedProduct["basePrice"] | FeedProduct["salePrice"]): string {
  const numberValue = Number(value ?? 0);
  const safe = Number.isFinite(numberValue) && numberValue > 0 ? Math.round(numberValue) : 0;
  return `${safe.toFixed(2)} VND`;
}

function absoluteUrl(pathOrUrl: string, base: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "";
  try {
    return new URL(raw, base).toString();
  } catch {
    return "";
  }
}

function resolveFeedProductImage(product: FeedProduct, base: string): string {
  return absoluteUrl(resolveProductImageUrl(product.images, product.name), base);
}

function productDescription(product: FeedProduct): string {
  const source = product.description || product.shortDescription || product.name;
  return truncateForGoogle(stripHtml(source), 5000) || product.name;
}

function productTitle(product: FeedProduct): string {
  return truncateForGoogle(product.name, 150);
}

function productBrand(product: FeedProduct): string {
  return truncateForGoogle(product.brand?.name || "Zendo", 70);
}

function buildProductItem(product: FeedProduct, base: string): string {
  const link = `${base}/san-pham/${encodeURIComponent(product.slug)}`;
  const imageLink = resolveFeedProductImage(product, base);
  const availability = product.stockQuantity > 0 ? "in_stock" : "out_of_stock";
  const salePrice = product.salePrice && Number(product.salePrice) > 0 && Number(product.salePrice) < Number(product.basePrice)
    ? formatVnd(product.salePrice)
    : "";

  const lines = [
    "  <item>",
    `    <g:id>${xmlEscape(product.sku || product.id)}</g:id>`,
    `    <g:title>${xmlEscape(productTitle(product))}</g:title>`,
    `    <g:description>${xmlEscape(productDescription(product))}</g:description>`,
    `    <g:link>${xmlEscape(link)}</g:link>`,
    `    <g:image_link>${xmlEscape(imageLink || link)}</g:image_link>`,
    `    <g:availability>${availability}</g:availability>`,
    `    <g:price>${xmlEscape(formatVnd(product.basePrice))}</g:price>`,
  ];

  if (salePrice) {
    lines.push(`    <g:sale_price>${xmlEscape(salePrice)}</g:sale_price>`);
  }

  lines.push(
    `    <g:brand>${xmlEscape(productBrand(product))}</g:brand>`,
    "    <g:condition>new</g:condition>",
    `    <g:product_type>${xmlEscape(product.category.name)}</g:product_type>`,
    `    <g:mpn>${xmlEscape(product.sku || product.id)}</g:mpn>`,
    "  </item>",
  );

  return lines.join("\n");
}

async function loadActiveProducts(): Promise<FeedProduct[]> {
  const db = await getDbClient();
  if (!db) return [];

  return db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      shortDescription: true,
      description: true,
      basePrice: true,
      salePrice: true,
      stockQuantity: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      images: {
        select: { url: true, isPrimary: true, sortOrder: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });
}

function buildFeed(products: FeedProduct[], base: string): string {
  const items = products.map((product) => buildProductItem(product, base)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Zendo.vn Product Feed</title>
  <link>${xmlEscape(base)}</link>
  <description>Google Merchant Center product feed for Zendo.vn</description>
${items}
</channel>
</rss>`;
}

export async function GET(): Promise<NextResponse> {
  const base = siteOrigin();
  const products = await loadActiveProducts();
  const xml = buildFeed(products, base);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
      "X-Product-Count": String(products.length),
    },
  });
}
