import type { CouponStatus } from "@prisma/client";
import { cached, cachedPreview, DEALS_COUPONS_TAG, DEALS_TAG, REVALIDATE_COUPONS_SECONDS } from "./cache";
import type { DealsSectionConfig } from "../settings";
import { serializeCoupon, type SerializedDealCoupon } from "./serializers";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../db");
    return dbModule.db;
  } catch {
    return null;
  }
}


export type DealCoupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: unknown;
  maxDiscountAmount: unknown | null;
  minOrderAmount: unknown | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
};

const getCouponsByIdsCached = cached(
  ["deals:coupons:ids"],
  async (ids: string[]) => {
    const db = await getDbClient();
    if (!db) return [] as DealCoupon[];
    const cleaned = ids.filter(Boolean).slice(0, 50);
    if (!cleaned.length) return [];
    const rows = await db.coupon.findMany({
      where: { id: { in: cleaned } },
      orderBy: [{ updatedAt: "desc" }],
      take: Math.min(12, cleaned.length),
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        value: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
    });
    const mapped = rows as unknown as DealCoupon[];
    const byId = new Map(mapped.map((c) => [c.id, c]));
    return cleaned.map((id) => byId.get(id)).filter((v): v is DealCoupon => Boolean(v));
  },
  { revalidate: REVALIDATE_COUPONS_SECONDS, tags: [DEALS_TAG, DEALS_COUPONS_TAG] },
);

const getCouponsByIdsPreviewCached = cachedPreview(
  ["deals-preview:coupons:ids"],
  async (ids: string[]) => getCouponsByIdsCached(ids),
  { revalidate: 10 },
);

const getActiveCouponsCached = cached(
  ["deals:coupons:active"],
  async () => {
    const db = await getDbClient();
    if (!db) return [] as DealCoupon[];
    const now = new Date();
    const rows = await db.coupon.findMany({
      where: {
        status: "ACTIVE" as CouponStatus,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        value: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        startsAt: true,
        endsAt: true,
        status: true,
      },
    });
    return rows as unknown as DealCoupon[];
  },
  { revalidate: REVALIDATE_COUPONS_SECONDS, tags: [DEALS_TAG, DEALS_COUPONS_TAG] },
);

const getActiveCouponsPreviewCached = cachedPreview(
  ["deals-preview:coupons:active"],
  async () => getActiveCouponsCached(),
  { revalidate: 10 },
);

export async function resolveDealsSectionCoupons(
  section: DealsSectionConfig,
  opts?: { preview?: boolean },
): Promise<SerializedDealCoupon[]> {
  if (section.type !== "voucher_hot") return [];
  const ids = (section.voucherSource?.couponIds ?? []).filter(Boolean);
  const preview = Boolean(opts?.preview);
  const result = ids.length
    ? await (preview ? getCouponsByIdsPreviewCached(ids) : getCouponsByIdsCached(ids))
    : await (preview ? getActiveCouponsPreviewCached() : getActiveCouponsCached());
  return result.map(serializeCoupon);
}

