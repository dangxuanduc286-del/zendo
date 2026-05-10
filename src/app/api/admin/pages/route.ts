import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { pageFormSchema } from "../../../../lib/admin-page";
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

async function ensureUniqueSlug(
  db: Awaited<ReturnType<typeof getDbClient>>,
  requestedSlug: string,
): Promise<string> {
  if (!db) return requestedSlug;
  const base = slugify(requestedSlug);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const exists = await db.page.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapPage(row: {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const rows = await db.page.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ items: rows.map(mapPage) });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách trang nội dung." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const parsed = pageFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." }, { status: 400 });
    }
    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug);
    const created = await db.page.create({
      data: {
        title: values.title,
        slug: uniqueSlug,
        content: values.content,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        status: values.status,
        publishedAt: values.status === "PUBLISHED" ? new Date() : null,
        authorId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ item: mapPage(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo trang nội dung." }, { status: 500 });
  }
}

