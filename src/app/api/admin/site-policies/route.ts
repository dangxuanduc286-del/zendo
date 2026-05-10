import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "../../../../lib/auth";
import { sitePolicyFormSchema } from "../../../../lib/admin-site-policy";
import { sanitizeSitePolicyHtml } from "../../../../lib/site-policy-sanitize";
import { SITE_POLICIES_CACHE_TAG } from "../../../../lib/site-policy-queries";
import { slugify } from "../../../../lib/slug";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function isAdminStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const rows = await db.sitePolicy.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        type: r.type,
        content: r.content,
        excerpt: r.excerpt ?? "",
        isPublished: r.isPublished,
        sortOrder: r.sortOrder,
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách chính sách." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const body = (await request.json()) as unknown;
    const parsed = sitePolicyFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    }
    const slug = slugify(parsed.data.slug);
    const clash = await db.sitePolicy.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ message: "Slug đã được dùng cho chính sách khác." }, { status: 409 });
    }
    const safeHtml = sanitizeSitePolicyHtml(parsed.data.content);
    const row = await db.sitePolicy.create({
      data: {
        title: parsed.data.title.trim(),
        slug,
        type: parsed.data.type,
        content: safeHtml,
        excerpt: (parsed.data.excerpt ?? "").trim(),
        isPublished: parsed.data.isPublished,
        sortOrder: parsed.data.sortOrder,
      },
    });
    revalidateTag(SITE_POLICIES_CACHE_TAG);
    return NextResponse.json({
      item: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: row.type,
        content: row.content,
        excerpt: row.excerpt,
        isPublished: row.isPublished,
        sortOrder: row.sortOrder,
        deletedAt: null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể tạo chính sách." }, { status: 500 });
  }
}
