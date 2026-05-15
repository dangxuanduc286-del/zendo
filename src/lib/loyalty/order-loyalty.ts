import { Prisma, type PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const ORDER_EARN = "ORDER_EARN";
const ORDER_REFUND_DEDUCT = "ORDER_REFUND_DEDUCT";

/** Cộng điểm khi đơn đã thanh toán (PAID) và chưa hủy / chưa hoàn tiền. Không bắt buộc đã giao — tránh lệch kỳ vọng “đã thanh toán mà không có điểm”. */
export function orderQualifiesForLoyaltyGrant(orderStatus: string, paymentStatus: string): boolean {
  if (paymentStatus !== "PAID") return false;
  return orderStatus !== "CANCELED" && orderStatus !== "REFUNDED";
}

export function computeLoyaltyPointsFromOrderTotalVnd(totalAmount: number): number {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return 0;
  return Math.floor(totalAmount / 10_000);
}

export function memberRankFromPoints(points: number): "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" {
  if (points >= 5000) return "DIAMOND";
  if (points >= 1000) return "GOLD";
  if (points >= 200) return "SILVER";
  return "BRONZE";
}

type OrderLoyaltyRow = {
  id: string;
  code: string;
  customerId: string | null;
  totalAmount: Prisma.Decimal;
  orderStatus: string;
  paymentStatus: string;
  loyaltyRewardGrantedAt: Date | null;
  loyaltyRewardRevokedAt: Date | null;
};

/** Membership / điểm thưởng chỉ cho khách mua; không áp dụng tài khoản có hồ sơ CTV (AffiliateProfile gắn customer). */
async function customerHasAffiliateProfile(tx: Tx, customerId: string): Promise<boolean> {
  const row = await tx.affiliateProfile.findFirst({
    where: {
      customerId,
      status: { in: ["ACTIVE", "PAUSED", "LOCKED"] },
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function grantOrderLoyalty(tx: Tx, order: OrderLoyaltyRow): Promise<void> {
  if (!order.customerId) return;
  if (await customerHasAffiliateProfile(tx, order.customerId)) return;
  if (order.loyaltyRewardGrantedAt != null) return;
  if (!orderQualifiesForLoyaltyGrant(order.orderStatus, order.paymentStatus)) return;

  const totalVnd = Number(order.totalAmount);
  const pts = computeLoyaltyPointsFromOrderTotalVnd(totalVnd);
  if (pts <= 0) return;

  const stamp = await tx.order.updateMany({
    where: {
      id: order.id,
      customerId: { not: null },
      loyaltyRewardGrantedAt: null,
      loyaltyRewardRevokedAt: null,
      paymentStatus: "PAID",
      orderStatus: { notIn: ["CANCELED", "REFUNDED"] },
    },
    data: { loyaltyRewardGrantedAt: new Date() },
  });
  if (stamp.count === 0) return;

  const customerId = order.customerId;
  const cur = await tx.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  });
  if (!cur) return;

  const nextPoints = cur.loyaltyPoints + pts;
  const rank = memberRankFromPoints(nextPoints);

  await tx.customer.update({
    where: { id: customerId },
    data: {
      loyaltyPoints: nextPoints,
      memberRank: rank,
      lifetimeSpent: { increment: order.totalAmount },
      completedOrders: { increment: 1 },
    },
  });

  await tx.loyaltyTransaction.create({
    data: {
      customerId,
      orderId: order.id,
      points: pts,
      type: ORDER_EARN,
      description: `+${pts.toLocaleString("vi-VN")} điểm từ đơn #${order.code} (đã thanh toán)`,
    },
  });
}

async function revokeOrderLoyalty(tx: Tx, order: OrderLoyaltyRow): Promise<void> {
  if (!order.customerId) return;
  if (order.loyaltyRewardGrantedAt == null) return;
  if (order.loyaltyRewardRevokedAt != null) return;

  const earn = await tx.loyaltyTransaction.findFirst({
    where: { orderId: order.id, type: ORDER_EARN },
    select: { id: true, points: true },
  });

  await tx.order.update({
    where: { id: order.id },
    data: { loyaltyRewardRevokedAt: new Date() },
  });

  if (!earn || earn.points <= 0) return;

  const customerId = order.customerId;
  const cur = await tx.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true, completedOrders: true, lifetimeSpent: true },
  });
  if (!cur) return;

  const deduct = earn.points;
  const nextPoints = Math.max(0, cur.loyaltyPoints - deduct);
  const nextCompleted = Math.max(0, cur.completedOrders - 1);
  const spent = Number(order.totalAmount);
  const nextLifetime = Math.max(0, Number(cur.lifetimeSpent) - spent);

  await tx.customer.update({
    where: { id: customerId },
    data: {
      loyaltyPoints: nextPoints,
      memberRank: memberRankFromPoints(nextPoints),
      completedOrders: nextCompleted,
      lifetimeSpent: new Prisma.Decimal(Math.max(0, nextLifetime).toFixed(2)),
    },
  });

  const deductReason =
    order.orderStatus === "REFUNDED"
      ? "hoàn tiền"
      : order.orderStatus === "CANCELED"
        ? "hủy đơn"
        : "điều chỉnh đơn";

  await tx.loyaltyTransaction.create({
    data: {
      customerId,
      orderId: order.id,
      points: -deduct,
      type: ORDER_REFUND_DEDUCT,
      description: `-${deduct.toLocaleString("vi-VN")} điểm do đơn #${order.code} (${deductReason})`,
    },
  });
}

/**
 * Gọi sau khi Order đã được cập nhật trạng thái (admin PATCH, hủy đơn tài khoản, v.v.).
 * Idempotent: mỗi đơn chỉ cộng một lần; hủy / hoàn chỉ trừ một lần.
 */
export async function applyOrderLoyaltyEffects(db: PrismaClient, orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        code: true,
        customerId: true,
        totalAmount: true,
        orderStatus: true,
        paymentStatus: true,
        loyaltyRewardGrantedAt: true,
        loyaltyRewardRevokedAt: true,
      },
    });
    if (!order) return;

    if (order.orderStatus === "REFUNDED" || order.orderStatus === "CANCELED") {
      await revokeOrderLoyalty(tx, order);
      return;
    }

    await grantOrderLoyalty(tx, order);
  });
}
