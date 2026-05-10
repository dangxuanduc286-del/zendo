import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { couponFormSchema } from "../../../../../lib/admin-coupon";

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

function mapCoupon(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "PERCENT" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  scope: "ORDER" | "SHIPPING";
  value: unknown;
  maxDiscountAmount: unknown;
  minOrderAmount: unknown;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED";
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    discountType: row.type,
    scope: row.scope,
    currency: "VND" as const,
    discountValue: Number(row.value),
    maxDiscountValue: row.maxDiscountAmount ? Number(row.maxDiscountAmount) : null,
    minOrderValue: row.minOrderAmount ? Number(row.minOrderAmount) : null,
    usageLimit: row.usageLimit,
    usagePerCustomer: row.usagePerCustomer,
    usedCount: row.usedCount,
    startAt: row.startsAt ? row.startsAt.toISOString() : "",
    endAt: row.endsAt ? row.endsAt.toISOString() : "",
    isActive: row.status === "ACTIVE",
    status: row.status,
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
    const row = await db.coupon.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        scope: true,
        value: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        usageLimit: true,
        usagePerCustomer: true,
        usedCount: true,
        startsAt: true,
        endsAt: true,
        status: true,
        updatedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy mã giảm giá." }, { status: 404 });
    }
    return NextResponse.json({ item: mapCoupon(row) });
  } catch {
    return NextResponse.json({ message: "Không thể tải mã giảm giá." }, { status: 500 });
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
    const couponId = resolvedParams.id;
    const body = (await request.json()) as unknown;
    const parsed = couponFormSchema.safeParse(body);
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

    const found = await db.coupon.findUnique({ where: { id: couponId }, select: { id: true } });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy mã giảm giá." }, { status: 404 });
    }

    const values = parsed.data;
    const code = values.code.toUpperCase();
    const duplicate = await db.coupon.findUnique({ where: { code }, select: { id: true } });
    if (duplicate && duplicate.id !== couponId) {
      return NextResponse.json({ message: "Ma coupon da ton tai." }, { status: 409 });
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data: {
        code,
        name: values.name,
        description: values.description || null,
        type: values.discountType,
        scope: values.scope,
        value: values.discountValue,
        maxDiscountAmount: values.maxDiscountValue ?? null,
        minOrderAmount: values.minOrderValue ?? null,
        usageLimit: values.usageLimit ?? null,
        usagePerCustomer: values.usagePerCustomer ?? null,
        startsAt: values.startAt ? new Date(values.startAt) : null,
        endsAt: values.endAt ? new Date(values.endAt) : null,
        status: values.isActive ? "ACTIVE" : "DISABLED",
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        scope: true,
        value: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        usageLimit: true,
        usagePerCustomer: true,
        usedCount: true,
        startsAt: true,
        endsAt: true,
        status: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ item: mapCoupon(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật mã giảm giá." }, { status: 500 });
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
    await db.coupon.delete({ where: { id: resolvedParams.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa mã giảm giá." }, { status: 500 });
  }
}

