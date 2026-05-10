import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { categoryFormSchema } from "../../../../lib/admin-category";
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
    const exists = await db.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  parentId: string | null;
  sortOrder: number;
  showOnHome: boolean;
  children?: Array<{ id: string }>;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    level: row.parentId ? (2 as const) : (1 as const),
    sortOrder: row.sortOrder,
    childCount: row.children?.length ?? 0,
    image: normalizeMediaUrl(row.imageUrl ?? ""),
    shortDescription: row.description ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    isActive: row.status === "PUBLISHED",
    showOnHome: row.showOnHome,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildCategoryTree(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    parentId: string | null;
    sortOrder: number;
    showOnHome: boolean;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    updatedAt: Date;
    children: Array<{ id: string }>;
  }>,
) {
  const mapped = rows.map(mapCategory);
  const byParent = new Map<string, typeof mapped>();
  for (const item of mapped) {
    const key = item.parentId ?? "__ROOT__";
    const bucket = byParent.get(key) ?? [];
    bucket.push(item);
    byParent.set(key, bucket);
  }
  const roots = byParent.get("__ROOT__") ?? [];
  return roots.map((parent) => ({
    ...parent,
    children: byParent.get(parent.id) ?? [],
  }));
}

export async function GET(): Promise<NextResponse> {
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
    // Do not seed categories in request handlers; seed only via prisma/seed.ts.

    const rows = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        parentId: true,
        sortOrder: true,
        showOnHome: true,
        status: true,
        updatedAt: true,
        children: { select: { id: true } },
      },
    });

    const tree = buildCategoryTree(rows);

    return NextResponse.json({
      items: tree,
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách danh mục." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const parsed = categoryFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." },
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
    const imageUrl = normalizeMediaUrl(values.image || "");
    const parentId = values.parentId?.trim() || null;

    if (parentId) {
      const parent = await db.category.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      });
      if (!parent) {
        return NextResponse.json({ message: "Danh mục cha không tồn tại." }, { status: 400 });
      }
      if (parent.parentId) {
        return NextResponse.json(
          { message: "Chỉ hỗ trợ danh mục tối đa 2 cấp (cha/con)." },
          { status: 400 },
        );
      }
    }

    const created = await db.category.create({
      data: {
        name: values.name,
        slug: uniqueSlug,
        parentId,
        sortOrder: values.sortOrder,
        imageUrl: imageUrl || null,
        description: values.shortDescription ? values.shortDescription : null,
        seoTitle: values.seoTitle ? values.seoTitle : null,
        seoDescription: values.seoDescription ? values.seoDescription : null,
        status: values.isActive ? "PUBLISHED" : "ARCHIVED",
        showOnHome: values.showOnHome ?? true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        parentId: true,
        sortOrder: true,
        showOnHome: true,
        children: { select: { id: true } },
        status: true,
        updatedAt: true,
      },
    });


    return NextResponse.json({ item: mapCategory(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo danh mục." }, { status: 500 });
  }
}
