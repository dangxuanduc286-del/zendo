import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { categoryFormSchema } from "../../../../../lib/admin-category";
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
  categoryId: string,
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
    if (!exists || exists.id === categoryId) return candidate;
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
    const categoryId = resolvedParams.id;
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const row = await db.category.findUnique({
      where: { id: categoryId },
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

    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy danh mục." }, { status: 404 });
    }

    return NextResponse.json({ item: mapCategory(row) });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh mục." }, { status: 500 });
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
    const categoryId = resolvedParams.id;
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

    const found = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy danh mục." }, { status: 404 });
    }

    const values = parsed.data;
    const uniqueSlug = await ensureUniqueSlug(db, values.slug, categoryId);
    const imageUrl = normalizeMediaUrl(values.image || "");
    const parentId = values.parentId?.trim() || null;

    if (parentId === categoryId) {
      return NextResponse.json({ message: "Không thể chọn chính danh mục làm danh mục cha." }, { status: 400 });
    }
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

    const childrenCount = await db.category.count({ where: { parentId: categoryId } });
    if (childrenCount > 0 && parentId) {
      return NextResponse.json(
        { message: "Danh mục cha đang có danh mục con, không thể chuyển thành danh mục con." },
        { status: 400 },
      );
    }

    const updated = await db.category.update({
      where: { id: categoryId },
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


    return NextResponse.json({ item: mapCategory(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật danh mục." }, { status: 500 });
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
    const categoryId = resolvedParams.id;
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const childIds = await db.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });
    const targetIds = [categoryId, ...childIds.map((item) => item.id)];
    const productsUsing = await db.product.count({
      where: { categoryId: { in: targetIds } },
    });
    if (productsUsing > 0) {
      return NextResponse.json(
        { message: "Không thể xóa vì danh mục cha/con đang được dùng bởi sản phẩm." },
        { status: 400 },
      );
    }
    await db.$transaction(async (tx) => {
      if (childIds.length) {
        await tx.category.deleteMany({ where: { id: { in: childIds.map((item) => item.id) } } });
      }
      await tx.category.delete({ where: { id: categoryId } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error && /foreign key|constraint/i.test(error.message)
        ? "Không thể xóa danh mục đang được sử dụng bởi sản phẩm."
        : "Không thể xóa danh mục.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
