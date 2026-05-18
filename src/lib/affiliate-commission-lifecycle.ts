import type { AffiliateCommissionStatus, Prisma } from "@prisma/client";
import {
  commissionStatusMayAutoCancel,
  orderDisqualifiesAffiliateCommission,
} from "@/lib/affiliate/commission-hold";

type DbLike = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

/** Tạo AffiliateCommission PENDING khi có ref hợp lệ và chương trình AFF bật. */
export async function createPendingAffiliateCommissionForOrder(
  tx: DbLike,
  opts: {
    orderId: string;
    affiliateProfileId: string;
    totalAmount: number | bigint | { toString(): string };
    defaultCommissionPct: number;
  },
): Promise<void> {
  const profile = await tx.affiliateProfile.findUnique({
    where: { id: opts.affiliateProfileId },
    select: { commissionRate: true },
  });
  const globalPct =
    typeof opts.defaultCommissionPct === "number" && Number.isFinite(opts.defaultCommissionPct)
      ? opts.defaultCommissionPct
      : 5;
  const pct = profile?.commissionRate != null ? Number(profile.commissionRate) : globalPct;
  const pctSafe = Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : globalPct;

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
