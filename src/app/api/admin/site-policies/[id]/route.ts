import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "../../../../../lib/auth";
import { sitePolicyFormSchema } from "../../../../../lib/admin-site-policy";
import { sanitizeSitePolicyHtml } from "../../../../../lib/site-policy-sanitize";
import { SITE_POLICIES_CACHE_TAG } from "../../../../../lib/site-policy-queries";
import { slugify } from "../../../../../lib/slug";

type ParamsInput = Promise<{ id: string }>;

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function isAdminStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export async function GET(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const row = await db.sitePolicy.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ message: "Không tìm thấy." }, { status: 404 });
    return NextResponse.json({
      item: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: row.type,
        content: row.content,
        excerpt: row.excerpt ?? "",
        isPublished: row.isPublished,
        sortOrder: row.sortOrder,
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể đọc chính sách." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const existing = await db.sitePolicy.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ message: "Không tìm thấy hoặc đã được xóa." }, { status: 404 });
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
    if (slug !== existing.slug) {
      const clash = await db.sitePolicy.findFirst({
        where: { slug, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json({ message: "Slug đã được dùng cho chính sách khác." }, { status: 409 });
      }
    }
    const safeHtml = sanitizeSitePolicyHtml(parsed.data.content);
    const row = await db.sitePolicy.update({
      where: { id },
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

    if (row.isPublished) {
      void (async () => {
        try {
          const { broadcastSitePolicyUpdate } = await import("../../../../../lib/system-account-notifications");
          await broadcastSitePolicyUpdate(db, { id: row.id, title: row.title, slug: row.slug });
        } catch {
          /* noop */
        }
      })();
    }

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
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật chính sách." }, { status: 500 });
  }
}

/** Xóa mềm: ẩn khỏi public, slug được đổi để không trùng key. */
export async function DELETE(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminStaff(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const existing = await db.sitePolicy.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ message: "Không tìm thấy hoặc đã xóa." }, { status: 404 });
    }
    const suffix = `-arch-${Date.now()}`;
    await db.sitePolicy.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isPublished: false,
        slug: `${existing.slug}${suffix}`.slice(0, 120),
      },
    });
    revalidateTag(SITE_POLICIES_CACHE_TAG);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa chính sách." }, { status: 500 });
  }
}
