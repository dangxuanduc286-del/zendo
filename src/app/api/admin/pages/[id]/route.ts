import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { pageFormSchema } from "../../../../../lib/admin-page";
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

async function ensureUniqueSlug(
  db: Awaited<ReturnType<typeof getDbClient>>,
  requestedSlug: string,
  pageId: string,
): Promise<string> {
  if (!db) return requestedSlug;
  const base = slugify(requestedSlug);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const exists = await db.page.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists || exists.id === pageId) return candidate;
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

export async function GET(_: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const { id } = await Promise.resolve(params);
    const row = await db.page.findUnique({
      where: { id },
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
    if (!row) return NextResponse.json({ message: "Không tìm thấy trang nội dung." }, { status: 404 });
    return NextResponse.json({ item: mapPage(row) });
  } catch {
    return NextResponse.json({ message: "Không thể tải trang nội dung." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const { id } = await Promise.resolve(params);
    const parsed = pageFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." }, { status: 400 });
    }
    const found = await db.page.findUnique({ where: { id }, select: { id: true, publishedAt: true } });
    if (!found) return NextResponse.json({ message: "Không tìm thấy trang nội dung." }, { status: 404 });
    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug, id);
    const updated = await db.page.update({
      where: { id },
      data: {
        title: values.title,
        slug: uniqueSlug,
        content: values.content,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        status: values.status,
        publishedAt: values.status === "PUBLISHED" ? found.publishedAt ?? new Date() : null,
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
    return NextResponse.json({ item: mapPage(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật trang nội dung." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const { id } = await Promise.resolve(params);
    await db.page.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa trang nội dung." }, { status: 500 });
  }
}

