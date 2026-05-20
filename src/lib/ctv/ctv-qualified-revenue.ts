import { CTV_REVENUE_WINDOW_DAYS } from "./ctv-membership-tier-types";
import { computeCtvRankRevenueFromOrders } from "./ctv-membership-tier-logic";
import { db } from "@/lib/db";

type DbLike = Pick<typeof db, "order">;

/** Doanh thu 30 ngày (đơn PAID + COMPLETED/DELIVERED), có thể loại trừ một đơn đang tạo. */
export async function computeCtvQualifiedRevenue30d(
  affiliateProfileId: string,
  options?: { excludeOrderId?: string; asOf?: Date; dbClient?: DbLike },
): Promise<number> {
  const client = options?.dbClient ?? db;
  const asOf = options?.asOf ?? new Date();
  const cutoff = new Date(asOf.getTime() - CTV_REVENUE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const orders = await client.order.findMany({
    where: {
      affiliateProfileId,
      paymentStatus: "PAID",
      orderStatus: { in: ["COMPLETED", "DELIVERED"] },
      createdAt: { gte: cutoff, lte: asOf },
      ...(options?.excludeOrderId ? { id: { not: options.excludeOrderId } } : {}),
    },
    select: {
      orderStatus: true,
      paymentStatus: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  const normalized = orders.map((o) => ({
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt,
  }));

  return computeCtvRankRevenueFromOrders(normalized, CTV_REVENUE_WINDOW_DAYS);
}
