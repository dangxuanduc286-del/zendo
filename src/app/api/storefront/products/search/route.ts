import { NextResponse } from "next/server";

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

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const db = await getDbClient();
    if (!db) return NextResponse.json({ items: [] }, { status: 200 });

    const { searchParams } = new URL(request.url);
    const q = sanitizeQuery(searchParams.get("q"));
    if (q.length < 2) return NextResponse.json({ items: [] }, { status: 200 });

    const rows = await db.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    });

    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.salePrice ?? row.basePrice ?? 0),
      imageUrl: row.images[0]?.url || "",
    }));
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
