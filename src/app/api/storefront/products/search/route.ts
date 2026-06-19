import { NextResponse } from "next/server";
import { getProductReviewMetricsMap } from "../../../../../lib/storefront/product-review-metrics";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function sanitizeQuery(value: string | null): string {
  return (value || "").trim().slice(0, 80);
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const db = await getDbClient();
    if (!db) return NextResponse.json({ items: [] }, { status: 200 });

    const { searchParams } = new URL(request.url);
    const q = sanitizeQuery(searchParams.get("q"));
    const normalizedQuery = normalizeSearchText(q);
    if (!normalizedQuery) return NextResponse.json({ items: [] }, { status: 200 });

    const rows = await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ updatedAt: "desc" }],
      take: 120,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        basePrice: true,
        salePrice: true,
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    });

    const matchedRows = rows
      .map((row) => {
        const haystack = normalizeSearchText([row.name, row.slug, row.shortDescription ?? ""].join(" "));
        const score = haystack.includes(normalizedQuery)
          ? 3
          : normalizeSearchText(row.name).includes(normalizedQuery)
            ? 4
            : normalizeSearchText(row.slug).includes(normalizedQuery)
              ? 2
              : normalizeSearchText(row.shortDescription ?? "").includes(normalizedQuery)
                ? 1
                : 0;
        return { row, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ row }) => row);

    const metricsMap = await getProductReviewMetricsMap(db, matchedRows.map((row) => row.id));
    const items = matchedRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.salePrice ?? row.basePrice ?? 0),
      imageUrl: row.images[0]?.url || "",
      ratingAverage: metricsMap.get(row.id)?.ratingAverage ?? null,
      reviewCount: metricsMap.get(row.id)?.reviewCount ?? 0,
    }));
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
