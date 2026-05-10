import type { Prisma } from "@prisma/client";
import { cached, cachedPreview, DEALS_CATEGORY_TAG, DEALS_MANUAL_TAG, DEALS_SALE_TAG, DEALS_TAG, DEALS_TRENDING_TAG, REVALIDATE_CATEGORY_SECONDS, REVALIDATE_MANUAL_SECONDS, REVALIDATE_SALE_SECONDS, REVALIDATE_TRENDING_SECONDS } from "./cache";
import type { DealsSectionConfig } from "../settings";
import type { ProductCardData } from "../../components/storefront/product-card";
import { resolveMediaUrl } from "../media";
import { memoizeArgsPerRequest } from "../runtime/request-cache";
import { getStorefrontDbClient } from "../storefront-db";

async function getDbClient() {
  return getStorefrontDbClient();
}


type DealProductModel = {
  id: string;
  name: string;
  slug: string;
  basePrice: unknown;
  salePrice: unknown;
  soldCount: number;
  isFeatured: boolean;
};

type DealProductImageRow = { productId: string; url: string; isPrimary: boolean; sortOrder: number };

function primaryImage(images: DealProductImageRow[]): string {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((image) => image.isPrimary) ?? sorted[0];
  return resolveMediaUrl(primary?.url ?? "");
}

function toCardProduct(product: DealProductModel, images: DealProductImageRow[]): ProductCardData {
  const salePriceValue = product.salePrice == null ? null : Number(product.salePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(images),
    basePrice: Number(product.basePrice),
    salePrice: Number.isFinite(salePriceValue as number) ? salePriceValue : null,
    soldCount: product.soldCount ?? 0,
    isFeatured: product.isFeatured,
    isNew: false,
  };
}

function getEffectivePrice(product: ProductCardData): number {
  const base = Number(product.basePrice);
  const sale = product.salePrice == null ? null : Number(product.salePrice);
  if (sale != null && Number.isFinite(sale) && sale > 0) return sale;
  return Number.isFinite(base) ? base : Number.POSITIVE_INFINITY;
}

function discountPercent(product: ProductCardData): number {
  const base = Number(product.basePrice);
  const sale = product.salePrice == null ? null : Number(product.salePrice);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (sale == null || !Number.isFinite(sale) || sale <= 0) return 0;
  if (sale >= base) return 0;
  return Math.round(((base - sale) / base) * 100);
}

const productImageOrderBy: Prisma.ProductImageOrderByWithRelationInput[] = [{ isPrimary: "desc" }, { sortOrder: "asc" }];
const baseSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  salePrice: true,
  soldCount: true,
  isFeatured: true,
};

async function fetchProductImagesForIds(
  db: NonNullable<Awaited<ReturnType<typeof getDbClient>>>,
  productIds: string[],
): Promise<Map<string, DealProductImageRow[]>> {
  const ids = productIds.filter(Boolean).slice(0, 200);
  const map = new Map<string, DealProductImageRow[]>();
  if (!ids.length) return map;
  const rows = await db.productImage.findMany({
    where: { productId: { in: ids } },
    select: { productId: true, url: true, isPrimary: true, sortOrder: true },
    orderBy: productImageOrderBy,
    take: Math.min(600, ids.length * 3),
  });
  for (const row of rows) {
    const arr = map.get(row.productId) ?? [];
    arr.push(row);
    map.set(row.productId, arr);
  }
  for (const [pid, arr] of map) {
    map.set(pid, arr.slice(0, 3));
  }
  return map;
}

/**
 * Request-level dedupe: same ids list used multiple times in one RSC request.
 * Normalizes ids into a stable key and reuses the underlying Prisma call.
 */
const fetchProductImagesForIdsMemo = memoizeArgsPerRequest(
  async (
    db: NonNullable<Awaited<ReturnType<typeof getDbClient>>>,
    productIds: string[],
  ): Promise<Map<string, DealProductImageRow[]>> => {
    const normalized = productIds
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, 200);
    const stableKey = normalized.slice().sort().join("|");
    return fetchProductImagesForIds(db, stableKey ? stableKey.split("|") : []);
  },
);

const getManualProductsCached = cached(
  ["deals:manual"],
  async (ids: string[], limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const cleaned = ids.filter(Boolean).slice(0, 200);
    if (!cleaned.length) return [];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", id: { in: cleaned } },
      select: baseSelect,
      take: Math.min(limit, cleaned.length),
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    const mapped = rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
    const byId = new Map(mapped.map((p) => [p.id, p]));
    return cleaned.map((id) => byId.get(id)).filter((v): v is ProductCardData => Boolean(v)).slice(0, limit);
  },
  { revalidate: REVALIDATE_MANUAL_SECONDS, tags: [DEALS_TAG, DEALS_MANUAL_TAG] },
);

const getManualProductsPreviewCached = cachedPreview(
  ["deals-preview:manual"],
  async (ids: string[], limit: number) => getManualProductsCached(ids, limit),
  { revalidate: 10 },
);

const getTrendingProductsCached = cached(
  ["deals:trending"],
  async (limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ soldCount: "desc" }, { updatedAt: "desc" }],
      select: baseSelect,
      take: limit,
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    return rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
  },
  { revalidate: REVALIDATE_TRENDING_SECONDS, tags: [DEALS_TAG, DEALS_TRENDING_TAG] },
);

const getTrendingProductsPreviewCached = cachedPreview(
  ["deals-preview:trending"],
  async (limit: number) => getTrendingProductsCached(limit),
  { revalidate: 10 },
);

const getFeaturedProductsCached = cached(
  ["deals:featured"],
  async (limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", isFeatured: true },
      orderBy: [{ updatedAt: "desc" }],
      select: baseSelect,
      take: limit,
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    return rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
  },
  { revalidate: REVALIDATE_SALE_SECONDS, tags: [DEALS_TAG, DEALS_SALE_TAG] },
);

const getFeaturedProductsPreviewCached = cachedPreview(
  ["deals-preview:featured"],
  async (limit: number) => getFeaturedProductsCached(limit),
  { revalidate: 10 },
);

const getNewestProductsCached = cached(
  ["deals:newest"],
  async (limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }],
      select: baseSelect,
      take: limit,
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    return rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
  },
  { revalidate: REVALIDATE_SALE_SECONDS, tags: [DEALS_TAG, DEALS_SALE_TAG] },
);

const getNewestProductsPreviewCached = cachedPreview(
  ["deals-preview:newest"],
  async (limit: number) => getNewestProductsCached(limit),
  { revalidate: 10 },
);

const getUnderPriceProductsCached = cached(
  ["deals:under_price"],
  async (maxPrice: number, limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const rows = await db.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ salePrice: { lte: maxPrice } }, { salePrice: null, basePrice: { lte: maxPrice } }],
      },
      orderBy: [{ updatedAt: "desc" }],
      select: baseSelect,
      take: limit,
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    return rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
  },
  { revalidate: REVALIDATE_SALE_SECONDS, tags: [DEALS_TAG, DEALS_SALE_TAG] },
);

const getUnderPriceProductsPreviewCached = cachedPreview(
  ["deals-preview:under_price"],
  async (maxPrice: number, limit: number) => getUnderPriceProductsCached(maxPrice, limit),
  { revalidate: 10 },
);

const getCategoryProductsCached = cached(
  ["deals:category"],
  async (categoryIds: string[], limit: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const ids = categoryIds.filter(Boolean).slice(0, 50);
    if (!ids.length) return [];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", categoryId: { in: ids } },
      orderBy: [{ updatedAt: "desc" }],
      select: baseSelect,
      take: limit,
    });
    const imagesByProduct = await fetchProductImagesForIdsMemo(db, rows.map((r) => r.id));
    return rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
  },
  { revalidate: REVALIDATE_CATEGORY_SECONDS, tags: [DEALS_TAG, DEALS_CATEGORY_TAG] },
);

const getCategoryProductsPreviewCached = cachedPreview(
  ["deals-preview:category"],
  async (categoryIds: string[], limit: number) => getCategoryProductsCached(categoryIds, limit),
  { revalidate: 10 },
);

const getSaleProductsCached = cached(
  ["deals:sale"],
  async (limit: number, minDiscountPercent: number) => {
    const db = await getDbClient();
    if (!db) return [] as ProductCardData[];
    const rows = await db.product.findMany({
      where: { status: "ACTIVE", salePrice: { not: null } },
      orderBy: [{ updatedAt: "desc" }],
      select: baseSelect,
      take: Math.min(60, limit * 4),
    });
    const imagesByProduct = await fetchProductImagesForIds(db, rows.map((r) => r.id));
    const mapped = rows.map((row) => toCardProduct(row as unknown as DealProductModel, imagesByProduct.get(row.id) ?? []));
    return mapped
      .filter((p) => getEffectivePrice(p) < Number(p.basePrice))
      .filter((p) => (minDiscountPercent ? discountPercent(p) >= minDiscountPercent : true))
      .slice(0, limit);
  },
  { revalidate: REVALIDATE_SALE_SECONDS, tags: [DEALS_TAG, DEALS_SALE_TAG] },
);

const getSaleProductsPreviewCached = cachedPreview(
  ["deals-preview:sale"],
  async (limit: number, minDiscountPercent: number) => getSaleProductsCached(limit, minDiscountPercent),
  { revalidate: 10 },
);

export async function resolveDealsSectionProducts(
  section: DealsSectionConfig,
  opts?: { preview?: boolean },
): Promise<ProductCardData[]> {
  const source = section.productSource;
  if (!source) return [];
  const limit = Math.max(1, Math.min(60, Number(source.limit ?? 12) || 12));
  const preview = Boolean(opts?.preview);

  let result: ProductCardData[] = [];
  switch (source.type) {
    case "manual":
      result = await (preview
        ? getManualProductsPreviewCached(source.productIds ?? [], limit)
        : getManualProductsCached(source.productIds ?? [], limit));
      break;
    case "featured":
      result = await (preview ? getFeaturedProductsPreviewCached(limit) : getFeaturedProductsCached(limit));
      break;
    case "newest":
      result = await (preview ? getNewestProductsPreviewCached(limit) : getNewestProductsCached(limit));
      break;
    case "trending":
      result = await (preview ? getTrendingProductsPreviewCached(limit) : getTrendingProductsCached(limit));
      break;
    case "under_price": {
      const maxPrice = Math.max(0, Number(source.maxPrice ?? 99000) || 99000);
      result = await (preview
        ? getUnderPriceProductsPreviewCached(maxPrice, limit)
        : getUnderPriceProductsCached(maxPrice, limit));
      break;
    }
    case "category":
      result = await (preview
        ? getCategoryProductsPreviewCached(source.categoryIds ?? [], limit)
        : getCategoryProductsCached(source.categoryIds ?? [], limit));
      break;
    case "sale":
    default: {
      const minDiscount = Math.max(0, Math.min(95, Number(source.minDiscountPercent ?? 0) || 0));
      result = await (preview ? getSaleProductsPreviewCached(limit, minDiscount) : getSaleProductsCached(limit, minDiscount));
      break;
    }
  }

  return result;
}

