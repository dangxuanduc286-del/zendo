import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../lib/auth";
import { brandFormSchema } from "../../../../lib/admin-brand";
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
    const exists = await db.brand.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapBrand(row: {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: normalizeMediaUrl(row.logoUrl ?? ""),
    description: row.description ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    isActive: row.status === "PUBLISHED",
    productCount: Number(row._count?.products ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 401 });
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const statusFilter = url.searchParams.get("status")?.trim() ?? "";
    const status =
      statusFilter === "active" ? "PUBLISHED" : statusFilter === "inactive" ? "ARCHIVED" : "";

    const rows = await db.brand.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      items: rows.map(mapBrand),
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách thương hiệu." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = brandFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug);
    const logoUrl = normalizeMediaUrl(values.logo || "");

    const created = await db.brand.create({
      data: {
        name: values.name,
        slug: uniqueSlug,
        logoUrl: logoUrl || null,
        description: values.description ? values.description : null,
        seoTitle: values.seoTitle ? values.seoTitle : null,
        seoDescription: values.seoDescription ? values.seoDescription : null,
        status: values.isActive ? "PUBLISHED" : "ARCHIVED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true },
        },
      },
    });

    revalidatePath("/admin/brands");
    revalidatePath("/");
    revalidatePath("/cua-hang");
    revalidatePath(`/thuong-hieu/${created.slug}`);
    revalidateTag("storefront-settings");

    return NextResponse.json({ item: mapBrand(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo thương hiệu." }, { status: 500 });
  }
}
