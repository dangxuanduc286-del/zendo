import { memoizePerRequest } from "../runtime/request-cache";
import { getStorefrontDbClient } from "../storefront-db";
import { getProductReviewMetricsMap } from "./product-review-metrics";

const HOME_DATA_AUDIT_ENABLED = process.env.HOME_DATA_AUDIT === "1";

function createHomeDataAuditLogger() {
  const requestStartMs = performance.now();
  return {
    start(label: string) {
      if (!HOME_DATA_AUDIT_ENABLED) return;
      console.log(
        `[home-data-audit] ${JSON.stringify({ phase: "start", label, atMs: Math.round(performance.now() - requestStartMs) })}`,
      );
    },
    end(label: string, extra: Record<string, unknown> = {}) {
      if (!HOME_DATA_AUDIT_ENABLED) return;
      console.log(
        `[home-data-audit] ${JSON.stringify({ phase: "end", label, durationMs: Math.round(performance.now() - requestStartMs), ...extra })}`,
      );
    },
  };
}

export type HomeCategoryRow = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  _count: { products: number };
};

export type HomeProductRow = {
  id: string;
  name: string;
  slug: string;
  basePrice: unknown;
  salePrice: unknown;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  stockQuantity: number;
  soldCount: number;
  imageUrl: string;
};

export type HomePostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnailUrl: string | null;
};

export type HomeProductMetrics = {
  reviewCount: number;
  ratingAverage: number | null;
};

/** One memoized bundle per RSC request: categories + flagged products + posts + review metrics. */
export const loadStorefrontHomeData = memoizePerRequest(async (): Promise<{
  categoryRows: HomeCategoryRow[];
  productRows: HomeProductRow[];
  postRows: HomePostRow[];
  metricsMap: Map<string, HomeProductMetrics>;
}> => {
  const audit = createHomeDataAuditLogger();
  const db = await getStorefrontDbClient();
  if (!db) {
    return {
      categoryRows: [],
      productRows: [],
      postRows: [],
      metricsMap: new Map(),
    };
  }

  audit.start("categories query");
  const categoriesPromise = db.category
    .findMany({
      where: { status: "PUBLISHED", parentId: null, showOnHome: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        _count: { select: { products: true } },
      },
    })
    .finally(() => audit.end("categories query"));

  audit.start("products query");
  const productsPromise = db.product
    .findMany({
      where: {
        status: "ACTIVE",
        OR: [{ isFeatured: true }, { isNew: true }, { isBestSeller: true }],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 36,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        isFeatured: true,
        isNew: true,
        isBestSeller: true,
        stockQuantity: true,
        soldCount: true,
      },
    })
    .finally(() => audit.end("products query"));

  audit.start("posts query");
  const postsPromise = db.post
    .findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 4,
      select: { id: true, title: true, slug: true, excerpt: true, thumbnailUrl: true },
    })
    .finally(() => audit.end("posts query"));

  const [categoryRows, productRows, postRows] = await Promise.all([categoriesPromise, productsPromise, postsPromise]);

  const productModels = productRows as Array<Omit<HomeProductRow, "imageUrl">>;
  const ids = productModels.map((p) => p.id).filter(Boolean);

  audit.start("banner query");
  const imageRowsPromise = ids.length
    ? db.productImage.findMany({
        where: { productId: { in: ids } },
        select: { productId: true, url: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: Math.min(240, Math.max(ids.length * 4, ids.length)),
      })
    : Promise.resolve([] as Array<{ productId: string; url: string | null }>);

  audit.start("homepage aggregation");
  const metricsMapPromise = getProductReviewMetricsMap(db, ids) as Promise<Map<string, HomeProductMetrics>>;

  const [imageRows, metricsMap] = await Promise.all([imageRowsPromise, metricsMapPromise]);
  audit.end("banner query", { rows: imageRows.length, productIds: ids.length });
  audit.end("homepage aggregation", { productIds: ids.length });

  const firstImageByProduct = new Map<string, string>();
  for (const row of imageRows) {
    if (!row.productId) continue;
    if (firstImageByProduct.has(row.productId)) continue;
    firstImageByProduct.set(row.productId, row.url ?? "");
  }

  const allSectionProducts: HomeProductRow[] = productModels.map((p) => ({
    ...p,
    imageUrl: firstImageByProduct.get(p.id) ?? "",
  }));

  return {
    categoryRows: categoryRows as HomeCategoryRow[],
    productRows: allSectionProducts,
    postRows: postRows as HomePostRow[],
    metricsMap,
  };
});
