import { memoizeArgsPerRequest } from "../runtime/request-cache";

export type ProductReviewMetrics = {
  reviewCount: number;
  ratingAverage: number | null;
};

type ReviewMetricsDbClient = {
  review: {
    groupBy: (args: {
      by: ["productId"];
      where: { productId: { in: string[] }; status: "APPROVED" };
      _count: { _all: true };
      _avg: { rating: true };
    }) => Promise<Array<{ productId: string; _count: { _all: number }; _avg: { rating: unknown } }>>;
  };
};

async function loadProductReviewMetrics(
  db: ReviewMetricsDbClient,
  productIds: string[],
): Promise<Map<string, ProductReviewMetrics>> {
  const ids = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
  const metricsMap = new Map<string, ProductReviewMetrics>();
  if (!ids.length) return metricsMap;

  const rows = await db.review.groupBy({
    by: ["productId"],
    where: {
      productId: { in: ids },
      status: "APPROVED",
    },
    _count: { _all: true },
    _avg: { rating: true },
  });

  for (const row of rows) {
    metricsMap.set(row.productId, {
      reviewCount: row._count._all,
      ratingAverage: row._avg.rating == null ? null : Number(row._avg.rating),
    });
  }

  return metricsMap;
}

export const getProductReviewMetricsMap = memoizeArgsPerRequest(
  async (db: ReviewMetricsDbClient, productIds: string[]): Promise<Map<string, ProductReviewMetrics>> => {
    const normalized = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))].sort();
    return loadProductReviewMetrics(db, normalized);
  },
);
