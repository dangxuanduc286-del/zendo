import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { PageLinkType } from "@prisma/client";

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

// ─── Helpers ─────────────────────────────────────────────────────

const VALID_LINK_TYPES: PageLinkType[] = [
  "PRODUCT",
  "CATEGORY",
  "BRAND",
  "POST",
  "PAGE",
  "COUPON",
  "LANDING_PAGE",
];

function isValidLinkType(value: string): value is PageLinkType {
  return (VALID_LINK_TYPES as readonly string[]).includes(value);
}

/**
 * Kiểm tra referenceId có tồn tại trong bảng tương ứng với linkType hay không.
 */
async function validateReference(
  db: NonNullable<Awaited<ReturnType<typeof getDbClient>>>,
  linkType: PageLinkType,
  referenceId: string,
): Promise<string | null> {
  switch (linkType) {
    case "PRODUCT": {
      const row = await db.product.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Sản phẩm (${referenceId}) không tồn tại.`;
    }
    case "CATEGORY": {
      const row = await db.category.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Danh mục (${referenceId}) không tồn tại.`;
    }
    case "BRAND": {
      const row = await db.brand.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Thương hiệu (${referenceId}) không tồn tại.`;
    }
    case "POST": {
      const row = await db.post.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Bài viết (${referenceId}) không tồn tại.`;
    }
    case "PAGE": {
      const row = await db.page.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Trang (${referenceId}) không tồn tại.`;
    }
    case "COUPON": {
      const row = await db.coupon.findUnique({
        where: { id: referenceId },
        select: { id: true },
      });
      return row ? null : `Mã giảm giá (${referenceId}) không tồn tại.`;
    }
    case "LANDING_PAGE":
      // Landing page không có bảng riêng → chấp nhận referenceId là slug hoặc bỏ qua
      return null;
    default:
      return `Loại liên kết không hợp lệ: ${linkType}`;
  }
}

// ─── GET ──────────────────────────────────────────────────────────
// Trả về danh sách SEO links đã liên kết với trang
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

    const pageId = resolvedParams.id;

    // Kiểm tra trang tồn tại
    const page = await db.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) {
      return NextResponse.json(
        { message: "Không tìm thấy trang nội dung." },
        { status: 404 },
      );
    }

    const rows = await db.pageLinkRelation.findMany({
      where: { pageId },
      orderBy: [{ sortOrder: "asc" }],
    });

    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json(
      { message: "Không thể tải danh sách SEO links." },
      { status: 500 },
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────
// Thay thế toàn bộ danh sách SEO links (idempotent, transactional)
interface PutBodyLink {
  linkType: string;
  referenceId: string;
  title: string;
  slug: string;
  url: string;
  thumbnail?: string | null;
  anchorText?: string | null;
  sortOrder?: number;
}

interface PutBody {
  links: PutBodyLink[];
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

    const pageId = resolvedParams.id;

    // Parse body
    const body = (await request.json()) as PutBody;
    if (!body.links || !Array.isArray(body.links)) {
      return NextResponse.json(
        { message: "Body phải chứa mảng 'links'." },
        { status: 400 },
      );
    }

    // Validate từng link
    for (let i = 0; i < body.links.length; i++) {
      const link = body.links[i];
      if (!link.linkType || typeof link.linkType !== "string") {
        return NextResponse.json(
          { message: `Link #${i} thiếu 'linkType'.` },
          { status: 400 },
        );
      }
      if (!isValidLinkType(link.linkType)) {
        return NextResponse.json(
          {
            message: `Link #${i}: 'linkType' không hợp lệ: ${link.linkType}. Cho phép: ${VALID_LINK_TYPES.join(", ")}.`,
          },
          { status: 400 },
        );
      }
      if (!link.referenceId || typeof link.referenceId !== "string") {
        return NextResponse.json(
          { message: `Link #${i} thiếu 'referenceId'.` },
          { status: 400 },
        );
      }
      if (!link.title || typeof link.title !== "string") {
        return NextResponse.json(
          { message: `Link #${i} thiếu 'title'.` },
          { status: 400 },
        );
      }
      if (!link.slug || typeof link.slug !== "string") {
        return NextResponse.json(
          { message: `Link #${i} thiếu 'slug'.` },
          { status: 400 },
        );
      }
      if (!link.url || typeof link.url !== "string") {
        return NextResponse.json(
          { message: `Link #${i} thiếu 'url'.` },
          { status: 400 },
        );
      }
    }

    // Kiểm tra trang tồn tại
    const page = await db.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) {
      return NextResponse.json(
        { message: "Không tìm thấy trang nội dung." },
        { status: 404 },
      );
    }

    // Kiểm tra referenceId tồn tại (trừ LANDING_PAGE)
    for (let i = 0; i < body.links.length; i++) {
      const link = body.links[i];
      if (link.linkType === "LANDING_PAGE") continue;
      const err = await validateReference(db, link.linkType as PageLinkType, link.referenceId);
      if (err) {
        return NextResponse.json(
          { message: `Link #${i} (${link.linkType}): ${err}` },
          { status: 400 },
        );
      }
    }

    // Dùng transaction: xoá cũ, tạo mới
    const data = body.links.map((link, i) => ({
      pageId,
      linkType: link.linkType as PageLinkType,
      referenceId: link.referenceId,
      title: link.title,
      slug: link.slug,
      url: link.url,
      thumbnail: link.thumbnail ?? null,
      anchorText: link.anchorText ?? null,
      sortOrder: link.sortOrder ?? i,
      isActive: true,
    }));

    await db.$transaction(async (tx) => {
      await tx.pageLinkRelation.deleteMany({ where: { pageId } });
      if (data.length > 0) {
        await tx.pageLinkRelation.createMany({ data });
      }
    });

    // Trả về danh sách mới
    const rows = await db.pageLinkRelation.findMany({
      where: { pageId },
      orderBy: [{ sortOrder: "asc" }],
    });

    return NextResponse.json({ items: rows });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật SEO links.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
