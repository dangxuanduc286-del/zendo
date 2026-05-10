import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../lib/auth";
import { reviewFormSchema } from "../../../../lib/admin-review";
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

function toReviewPayload(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const source = input as Record<string, unknown>;
  const reviewImagesSource =
    source.reviewImages ??
    source.imageUrls ??
    source.images;
  return {
    ...source,
    reviewImages: Array.isArray(reviewImagesSource)
      ? reviewImagesSource.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [],
  };
}

function parseReviewedAt(value: string | undefined): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapReview(row: {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  content: string | null;
  guestName: string | null;
  guestEmail: string | null;
  reviewImages: unknown;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  createdAt: Date;
  updatedAt: Date;
  product: { name: string; slug: string };
}) {
  const reviewImages = Array.isArray(row.reviewImages)
    ? row.reviewImages
        .map((item) => normalizeMediaUrl(String(item ?? "")))
        .filter(Boolean)
        .slice(0, 5)
    : [];
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    productSlug: row.product.slug,
    rating: row.rating,
    title: row.title ?? "",
    content: row.content ?? "",
    guestName: row.guestName ?? "",
    guestEmail: row.guestEmail ?? "",
    reviewedAt: row.createdAt.toISOString(),
    reviewImages,
    imageUrls: reviewImages,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
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
    const productId = searchParams.get("productId")?.trim() ?? "";
    const rating = searchParams.get("rating")?.trim() ?? "";
    const visibility = searchParams.get("visibility")?.trim() ?? "";
    const ratingNumber = Number(rating);
    const rows = await db.review.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
                { guestName: { contains: q, mode: "insensitive" } },
                { product: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" } : {}),
        ...(productId ? { productId } : {}),
        ...(Number.isFinite(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5 ? { rating: ratingNumber } : {}),
        ...(visibility === "visible"
          ? { status: "APPROVED" as const }
          : visibility === "hidden"
            ? { status: { in: ["HIDDEN", "REJECTED"] as const } }
            : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        content: true,
        guestName: true,
        guestEmail: true,
        reviewImages: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { name: true, slug: true } },
      },
    });
    return NextResponse.json({ items: rows.map(mapReview) });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách đánh giá." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const db = await getDbClient();
    if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
    const rawBody = await request.json();
    const payload = toReviewPayload(rawBody);
    const parsed = reviewFormSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." }, { status: 400 });
    }
    const values = parsed.data;
    const reviewedAt = parseReviewedAt(values.reviewedAt);
    if (values.reviewedAt && !reviewedAt) {
      return NextResponse.json({ message: "Ngày giờ đánh giá không hợp lệ." }, { status: 400 });
    }
    const reviewImages = (values.reviewImages ?? [])
      .map((item) => normalizeMediaUrl(item))
      .filter(Boolean)
      .slice(0, 5);
    const created = await db.review.create({
      data: {
        productId: values.productId,
        rating: values.rating,
        title: values.title || null,
        content: values.content || null,
        guestName: values.guestName || null,
        guestEmail: values.guestEmail || null,
        reviewImages: reviewImages.length ? reviewImages : null,
        status: values.status,
        ...(reviewedAt ? { createdAt: reviewedAt } : {}),
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        content: true,
        guestName: true,
        guestEmail: true,
        reviewImages: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { name: true, slug: true } },
      },
    });
    revalidatePath("/admin/reviews");
    revalidatePath(`/san-pham/${created.product.slug}`);
    revalidatePath("/");
    revalidateTag("storefront-settings");
    return NextResponse.json({ item: mapReview(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo đánh giá." }, { status: 500 });
  }
}

