import { NextResponse } from "next/server";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

const ZENDO_CHECKOUT_COUPON_ORDER = [
  "FREESHIP30",
  "SAVE5",
  "SAVE20",
  "SAVE50",
  "SAVE10",
  "SAVE80",
  "SAVE120",
  "SAVE15VIP",
  "SAVE250",
  "SAVE25VIP",
  "SAVE350VIP",
] as const;

function toConditionLabel(minOrderValue: number | null): string {
  return minOrderValue && minOrderValue > 0
    ? `Đơn từ ${minOrderValue.toLocaleString("vi-VN")}đ`
    : "Không yêu cầu đơn tối thiểu";
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json({ items: [] });
    }

    const now = new Date();
    const rows = await db.coupon.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        code: { in: [...ZENDO_CHECKOUT_COUPON_ORDER] },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: ZENDO_CHECKOUT_COUPON_ORDER.length,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        value: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        usedCount: true,
        usageLimit: true,
        startsAt: true,
        endsAt: true,
        updatedAt: true,
      },
    });

    const byCode = new Map(rows.map((row) => [row.code, row] as const));
    const items = ZENDO_CHECKOUT_COUPON_ORDER.flatMap((code) => {
      const row = byCode.get(code);
      if (!row) return [];
      if (row.usageLimit != null && row.usedCount >= row.usageLimit) return [];
      const maxDiscountValue = row.maxDiscountAmount == null ? null : Number(row.maxDiscountAmount);
      const minOrderValue = row.minOrderAmount == null ? null : Number(row.minOrderAmount);
      return [{
        code: row.code,
        name: row.name,
        type: row.type,
        value: Number(row.value),
        maxDiscountValue,
        minOrderValue,
        createdAt: row.startsAt?.toISOString() ?? row.updatedAt.toISOString(),
        endsAt: row.endsAt?.toISOString() ?? undefined,
        description: row.description ?? "Ưu đãi theo cấu hình Admin",
        conditionLabel: toConditionLabel(minOrderValue),
      }];
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
