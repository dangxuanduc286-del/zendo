import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { bannerFormSchema } from "../../../../../lib/admin-banner";
import { slugify } from "../../../../../lib/slug";
import { normalizeMediaUrl } from "../../../../../lib/media-url";

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
  bannerId: string,
): Promise<string> {
  if (!db) return requestedSlug;
  const base = slugify(requestedSlug);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const exists = await db.banner.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists || exists.id === bannerId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapBanner(row: {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  targetUrl: string | null;
  position: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    imageDesktop: normalizeMediaUrl(row.imageUrl),
    imageMobile: normalizeMediaUrl(row.mobileImageUrl ?? ""),
    linkUrl: row.targetUrl ?? "",
    position: row.position ?? "",
    isActive: row.status === "ACTIVE",
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
    const row = await db.banner.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        mobileImageUrl: true,
        targetUrl: true,
        position: true,
        status: true,
        updatedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy banner." }, { status: 404 });
    }
    return NextResponse.json({ item: mapBanner(row) });
  } catch {
    return NextResponse.json({ message: "Không thể tải banner." }, { status: 500 });
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
    const bannerId = resolvedParams.id;
    const body = (await request.json()) as unknown;
    const parsed = bannerFormSchema.safeParse(body);
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
    const found = await db.banner.findUnique({ where: { id: bannerId }, select: { id: true } });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy banner." }, { status: 404 });
    }
    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug, bannerId);
    const imageDesktop = normalizeMediaUrl(values.imageDesktop);
    const imageMobile = normalizeMediaUrl(values.imageMobile || "");
    if (!imageDesktop) {
      return NextResponse.json({ message: "Ảnh desktop không hợp lệ." }, { status: 400 });
    }
    const updated = await db.banner.update({
      where: { id: bannerId },
      data: {
        title: values.title,
        slug: uniqueSlug,
        imageUrl: imageDesktop,
        mobileImageUrl: imageMobile || null,
        targetUrl: values.linkUrl || null,
        position: values.position || null,
        status: values.isActive ? "ACTIVE" : "INACTIVE",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        mobileImageUrl: true,
        targetUrl: true,
        position: true,
        status: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ item: mapBanner(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật banner." }, { status: 500 });
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
    await db.banner.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa banner." }, { status: 500 });
  }
}

