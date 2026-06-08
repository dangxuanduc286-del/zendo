import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";

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

const VALID_TYPES = ["PRODUCT", "CATEGORY", "BRAND", "POST", "PAGE", "COUPON"] as const;
type SearchType = (typeof VALID_TYPES)[number];

function parseType(raw: string | null): SearchType | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if ((VALID_TYPES as readonly string[]).includes(upper)) return upper as SearchType;
  return null;
}

function clampLimit(value: number): number {
  return Math.max(1, Math.min(50, Number.isFinite(value) ? value : 10));
}

interface SearchResultItem {
  id: string;
  name: string;
  slug: string;
  url: string;
  thumbnail: string | null;
  type: SearchType;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = sanitizeQuery(searchParams.get("q"));
    const typeFilter = parseType(searchParams.get("type"));
    const limit = clampLimit(Number(searchParams.get("limit")) || 10);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const items: SearchResultItem[] = [];

    // ── Helper: search single type ──────────────────────────────────
    async function searchType(
      type: SearchType,
      take: number,
      skip: number,
    ): Promise<void> {
      switch (type) {
        case "PRODUCT": {
          const rows = await db!.product.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                select: { url: true, isPrimary: true, sortOrder: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
              },
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: r.name,
              slug: r.slug,
              url: `/san-pham/${r.slug}`,
              thumbnail: r.images[0]?.url ?? null,
              type: "PRODUCT",
            });
          }
          break;
        }

        case "CATEGORY": {
          const rows = await db!.category.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: r.name,
              slug: r.slug,
              url: `/danh-muc/${r.slug}`,
              thumbnail: null,
              type: "CATEGORY",
            });
          }
          break;
        }

        case "BRAND": {
          const rows = await db!.brand.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: r.name,
              slug: r.slug,
              url: `/thuong-hieu/${r.slug}`,
              thumbnail: r.logoUrl ?? null,
              type: "BRAND",
            });
          }
          break;
        }

        case "POST": {
          const rows = await db!.post.findMany({
            where: {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: r.title,
              slug: r.slug,
              url: `/bai-viet/${r.slug}`,
              thumbnail: r.thumbnailUrl ?? null,
              type: "POST",
            });
          }
          break;
        }

        case "PAGE": {
          const rows = await db!.page.findMany({
            where: {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: r.title,
              slug: r.slug,
              url: `/${r.slug}`,
              thumbnail: null,
              type: "PAGE",
            });
          }
          break;
        }

        case "COUPON": {
          const rows = await db!.coupon.findMany({
            where: {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              code: true,
              name: true,
            },
            orderBy: [{ updatedAt: "desc" }],
            take,
            skip,
          });
          for (const r of rows) {
            items.push({
              id: r.id,
              name: `${r.code}${r.name ? ` - ${r.name}` : ""}`,
              slug: r.code,
              url: `/ma-giam-gia/${r.code}`,
              thumbnail: null,
              type: "COUPON",
            });
          }
          break;
        }
      }
    }

    if (typeFilter) {
      // Search only the specified type with full pagination
      await searchType(typeFilter, limit, offset);
    } else {
      // No type filter: search each type with a small limit, capped overall
      const perType = Math.max(1, Math.min(3, Math.floor(limit / 3)));
      const types: SearchType[] = ["PRODUCT", "POST", "PAGE", "CATEGORY", "BRAND", "COUPON"];
      for (const t of types) {
        if (items.length >= limit) break;
        const remain = limit - items.length;
        await searchType(t, Math.min(perType, remain), 0);
      }
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
