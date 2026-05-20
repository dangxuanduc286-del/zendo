import type { AffiliateCommissionStatus, Prisma } from "@prisma/client";
import {
  commissionStatusMayAutoCancel,
  orderDisqualifiesAffiliateCommission,
} from "@/lib/affiliate/commission-hold";
import { resolveCtvCommissionRateForAffiliate } from "@/lib/ctv/ctv-commission-rate";

type DbLike = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

/** Tạo AffiliateCommission PENDING — % hoa hồng từ CtvMembershipTier (SSOT). */
export async function createPendingAffiliateCommissionForOrder(
  tx: DbLike,
  opts: {
    orderId: string;
    affiliateProfileId: string;
    totalAmount: number | bigint | { toString(): string };
    /** @deprecated Không dùng — giữ để tương thích chữ ký API checkout. */
    defaultCommissionPct?: number;
  },
): Promise<void> {
  const rate = await resolveCtvCommissionRateForAffiliate(opts.affiliateProfileId, {
    excludeOrderId: opts.orderId,
    dbClient: tx,
  });
  const pctSafe =
    Number.isFinite(rate.commissionPercent) && rate.commissionPercent >= 0 && rate.commissionPercent <= 100
      ? rate.commissionPercent
      : 0;

  const revenue = Math.max(0, Math.floor(Number(opts.totalAmount)));
  const amount = Math.max(0, Math.floor((revenue * pctSafe) / 100));

  try {
    await tx.affiliateCommission.create({
      data: {
        affiliateProfileId: opts.affiliateProfileId,
        orderId: opts.orderId,
        orderRevenue: revenue,
        commissionRate: pctSafe,
        amount,
        status: "PENDING",
      },
    });
  } catch (e: unknown) {
    const msg = typeof e === "object" && e && "code" in e ? String((e as { code?: string }).code) : "";
    if (msg === "P2002") return;
    throw e;
  }
}

/**
 * Cập nhật hoa hồng theo trạng thái đơn sau khi order thay đổi.
 * - Không tự duyệt: admin duyệt → WAITING_RELEASE (giữ 7 ngày).
 * - Hủy/hoàn: CANCELLED nếu HH chưa PAID.
 */
export async function syncAffiliateCommissionLifecycleForOrder(db: DbLike, orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      affiliateProfileId: true,
      orderStatus: true,
      paymentStatus: true,
    },
  });
  if (!order?.affiliateProfileId) return;

  const comm = await db.affiliateCommission.findUnique({
    where: {
      affiliateProfileId_orderId: {
        affiliateProfileId: order.affiliateProfileId,
        orderId,
      },
    },
    select: { id: true, status: true },
  });
  if (!comm) return;

  const status = comm.status as AffiliateCommissionStatus;

  if (orderDisqualifiesAffiliateCommission(order)) {
    if (!commissionStatusMayAutoCancel(status)) return;
    const notifyLifecycle =
      status === "WAITING_RELEASE" || status === "AVAILABLE" || status === "APPROVED";
    await db.affiliateCommission.update({
      where: { id: comm.id },
      data: { status: "CANCELLED" },
    });
    if (notifyLifecycle) {
      const { publishCommissionCanceledNotification } = await import(
        "@/lib/affiliate/affiliate-commission-notifications"
      );
      void publishCommissionCanceledNotification(db, comm.id, "refund");
    }
  }
}
