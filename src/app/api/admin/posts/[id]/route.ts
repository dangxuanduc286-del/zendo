import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { postFormSchema } from "../../../../../lib/admin-post";
import { slugify } from "../../../../../lib/slug";
import { sanitizePostThumbnailUrl } from "../../../../../lib/media";

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
  postId: string,
): Promise<string> {
  if (!db) return requestedSlug;
  const base = slugify(requestedSlug);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const exists = await db.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists || exists.id === postId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapPost(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnailUrl: string | null;
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
    excerpt: row.excerpt ?? "",
    content: row.content,
    thumbnail: sanitizePostThumbnailUrl(row.thumbnailUrl ?? ""),
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(
  _: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const row = await db.post.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        thumbnailUrl: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy bài viết." }, { status: 404 });
    }
    return NextResponse.json({ item: mapPost(row) });
  } catch {
    return NextResponse.json({ message: "Không thể tải bài viết." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await Promise.resolve(params);
    const postId = resolvedParams.id;
    const body = (await request.json()) as unknown;
    const parsed = postFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." },
        { status: 400 },
      );
    }
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const found = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, publishedAt: true },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy bài viết." }, { status: 404 });
    }

    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug, postId);
    const thumbnailUrl = sanitizePostThumbnailUrl(values.thumbnail || "");
    const updated = await db.post.update({
      where: { id: postId },
      data: {
        title: values.title,
        slug: uniqueSlug,
        excerpt: values.excerpt || null,
        content: values.content,
        thumbnailUrl: thumbnailUrl || null,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        status: values.status,
        publishedAt:
          values.status === "PUBLISHED" ? found.publishedAt ?? new Date() : null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        thumbnailUrl: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ item: mapPost(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật bài viết." }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    await db.post.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa bài viết." }, { status: 500 });
  }
}

