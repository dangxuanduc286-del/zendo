import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";

type ParamsInput = Promise<{ id: string }>;

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

// ─── GET ──────────────────────────────────────────────────────────
// Trả về danh sách sản phẩm đã liên kết với bài viết
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
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const postId = resolvedParams.id;

    // Kiểm tra bài viết tồn tại
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json(
        { message: "Không tìm thấy bài viết." },
        { status: 404 },
      );
    }

    const rows = await db.postProduct.findMany({
      where: { postId },
      orderBy: [{ sortOrder: "asc" }],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            salePrice: true,
            images: {
              select: { url: true, isPrimary: true, sortOrder: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
          },
        },
      },
    });

    const items = rows.map((row) => ({
      productId: row.productId,
      sortOrder: row.sortOrder,
      product: {
        name: row.product.name,
        slug: row.product.slug,
        price: Number(row.product.salePrice ?? row.product.basePrice ?? 0),
        imageUrl: row.product.images[0]?.url ?? "",
      },
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { message: "Không thể tải danh sách sản phẩm liên kết." },
      { status: 500 },
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────
// Thay thế toàn bộ danh sách sản phẩm liên kết (idempotent, transactional)
interface PutBodyProduct {
  productId: string;
  sortOrder?: number;
}

interface PutBody {
  products: PutBodyProduct[];
}

export async function PUT(
  request: Request,
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
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const postId = resolvedParams.id;

    // Parse body
    const body = (await request.json()) as PutBody;
    if (!body.products || !Array.isArray(body.products)) {
      return NextResponse.json(
        { message: "Body phải chứa mảng 'products'." },
        { status: 400 },
      );
    }

    // Validate input: mỗi item phải có productId
    for (const item of body.products) {
      if (!item.productId || typeof item.productId !== "string") {
        return NextResponse.json(
          { message: "Mỗi product phải có 'productId' là string." },
          { status: 400 },
        );
      }
    }

    // Kiểm tra bài viết tồn tại
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json(
        { message: "Không tìm thấy bài viết." },
        { status: 404 },
      );
    }

    // Collect productIds
    const productIds = [...new Set(body.products.map((p) => p.productId))];
    if (productIds.length === 0) {
      // Empty list: xoá hết
      await db.$transaction(async (tx) => {
        await tx.postProduct.deleteMany({ where: { postId } });
      });
      return NextResponse.json({ items: [] });
    }

    // Kiểm tra tất cả productId tồn tại (tránh dữ liệu mồ côi)
    const existingProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const existingProductIdSet = new Set(existingProducts.map((p) => p.id));
    const missingIds = productIds.filter((id) => !existingProductIdSet.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          message: `Sản phẩm không tồn tại: ${missingIds.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Dùng transaction: xoá cũ, tạo mới
    const data = body.products.map((p, i) => ({
      postId,
      productId: p.productId,
      sortOrder: p.sortOrder ?? i,
    }));

    await db.$transaction(async (tx) => {
      await tx.postProduct.deleteMany({ where: { postId } });
      if (data.length > 0) {
        await tx.postProduct.createMany({ data });
      }
    });

    // Trả về danh sách mới
    const rows = await db.postProduct.findMany({
      where: { postId },
      orderBy: [{ sortOrder: "asc" }],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            salePrice: true,
            images: {
              select: { url: true, isPrimary: true, sortOrder: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
          },
        },
      },
    });

    const items = rows.map((row) => ({
      productId: row.productId,
      sortOrder: row.sortOrder,
      product: {
        name: row.product.name,
        slug: row.product.slug,
        price: Number(row.product.salePrice ?? row.product.basePrice ?? 0),
        imageUrl: row.product.images[0]?.url ?? "",
      },
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật sản phẩm liên kết.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
