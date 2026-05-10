import { memoizePerRequest } from "../runtime/request-cache";
import { getStorefrontDbClient } from "../storefront-db";

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
  const db = await getStorefrontDbClient();
  if (!db) {
    return {
      categoryRows: [],
      productRows: [],
      postRows: [],
      metricsMap: new Map(),
    };
  }

  const [categoryRows, productRows, postRows] = await Promise.all([
    db.category.findMany({
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
    }),
    db.product.findMany({
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
    }),
    db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 4,
      select: { id: true, title: true, slug: true, excerpt: true, content: true, thumbnailUrl: true },
    }),
  ]);

  const productModels = productRows as Array<Omit<HomeProductRow, "imageUrl">>;
  const ids = productModels.map((p) => p.id).filter(Boolean);
  const imageRows = ids.length
    ? await db.productImage.findMany({
        where: { productId: { in: ids } },
        select: { productId: true, url: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: Math.min(2000, Math.max(ids.length * 24, ids.length)),
      })
    : [];
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

  const featuredProducts = allSectionProducts.filter((product) => product.isFeatured).slice(0, 8);
  const newestProducts = allSectionProducts.filter((product) => product.isNew).slice(0, 8);
  const bestSellerProducts = allSectionProducts.filter((product) => product.isBestSeller).slice(0, 8);
  const productIds = [...new Set([...featuredProducts, ...newestProducts, ...bestSellerProducts].map((p) => p.id))];

  const metricsMap = new Map<string, HomeProductMetrics>();
  if (productIds.length) {
    const reviewAgg = await db.review.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        status: "APPROVED",
      },
      _count: { _all: true },
      _avg: { rating: true },
    });

    for (const row of reviewAgg) {
      metricsMap.set(row.productId, {
        reviewCount: row._count._all,
        ratingAverage: row._avg.rating == null ? null : Number(row._avg.rating),
      });
    }
  }

  return {
    categoryRows: categoryRows as HomeCategoryRow[],
    productRows: allSectionProducts,
    postRows: postRows as HomePostRow[],
    metricsMap,
  };
});
