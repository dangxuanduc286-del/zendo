import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { bannerFormSchema } from "../../../../lib/admin-banner";
import { slugify } from "../../../../lib/slug";
import { normalizeMediaUrl } from "../../../../lib/media-url";

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
    const exists = await db.banner.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
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

export async function GET(): Promise<NextResponse> {
  try {

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    }
    const rows = await db.banner.findMany({
      orderBy: [{ updatedAt: "desc" }],
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


    return NextResponse.json({ items: rows.map(mapBanner) });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách banner." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
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
    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug);
    const imageDesktop = normalizeMediaUrl(values.imageDesktop);
    const imageMobile = normalizeMediaUrl(values.imageMobile || "");
    if (!imageDesktop) {
      return NextResponse.json({ message: "Ảnh desktop không hợp lệ." }, { status: 400 });
    }
    const created = await db.banner.create({
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


    return NextResponse.json({ item: mapBanner(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo banner." }, { status: 500 });
  }
}

