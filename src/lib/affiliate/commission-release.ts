import type { Prisma } from "@prisma/client";
import {
  COMMISSION_HOLD_DAYS,
  computeCommissionUnlockAt,
  orderDisqualifiesAffiliateCommission,
} from "./commission-hold";

type DbLike = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

const RELEASE_BATCH_SIZE = 100;

export type CommissionReleaseBatchResult = {
  scanned: number;
  released: number;
  cancelled: number;
  skipped: number;
};

/** Admin duyệt → giữ 7 ngày (WAITING_RELEASE), chưa cộng ví khả dụng. */
export async function approveAffiliateCommissionToHold(
  db: DbLike,
  commissionId: string,
): Promise<{ orderId: string }> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      status: true,
      orderId: true,
      order: { select: { orderStatus: true, paymentStatus: true } },
    },
  });
  if (!row) throw new Error("Không tìm thấy hoa hồng.");
  if (row.status !== "PENDING") {
    throw new Error("Chỉ có thể duyệt hoa hồng đang chờ duyệt.");
  }
  if (orderDisqualifiesAffiliateCommission(row.order)) {
    throw new Error("Không thể duyệt hoa hồng khi đơn đã hủy, hoàn tiền hoặc thanh toán thất bại.");
  }

  const approvedAt = new Date();
  const unlockAt = computeCommissionUnlockAt(approvedAt);

  await db.affiliateCommission.update({
    where: { id: commissionId },
    data: {
      status: "WAITING_RELEASE",
      approvedAt,
      unlockAt,
      availableAt: null,
      releasedAt: null,
    },
  });

  const { publishCommissionWaitingReleaseNotification } = await import(
    "@/lib/affiliate/affiliate-commission-notifications"
  );
  void publishCommissionWaitingReleaseNotification(db, commissionId);

  return { orderId: row.orderId };
}

export async function cancelAffiliateCommissionIfAllowed(
  db: DbLike,
  commissionId: string,
): Promise<void> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: { id: true, status: true },
  });
  if (!row) throw new Error("Không tìm thấy hoa hồng.");
  if (row.status === "PAID") {
    throw new Error("Không thể hủy hoa hồng đã thanh toán.");
  }
  if (row.status === "CANCELLED") return;
  if (
    row.status !== "PENDING" &&
    row.status !== "APPROVED" &&
    row.status !== "WAITING_RELEASE" &&
    row.status !== "AVAILABLE"
  ) {
    throw new Error("Không thể hủy hoa hồng ở trạng thái hiện tại.");
  }
  const shouldNotify =
    row.status === "WAITING_RELEASE" || row.status === "AVAILABLE" || row.status === "APPROVED";

  await db.affiliateCommission.update({
    where: { id: commissionId },
    data: { status: "CANCELLED" },
  });

  if (shouldNotify) {
    const { publishCommissionCanceledNotification } = await import(
      "@/lib/affiliate/affiliate-commission-notifications"
    );
    void publishCommissionCanceledNotification(db, commissionId, "admin");
  }
}

/** Một dòng WAITING_RELEASE đủ điều kiện → AVAILABLE (idempotent). */
export async function tryReleaseAffiliateCommission(
  db: DbLike,
  commissionId: string,
  now = new Date(),
): Promise<"released" | "cancelled" | "skipped"> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      status: true,
      unlockAt: true,
      order: { select: { orderStatus: true, paymentStatus: true } },
    },
  });
  if (!row || row.status !== "WAITING_RELEASE") return "skipped";
  if (!row.unlockAt || row.unlockAt.getTime() > now.getTime()) return "skipped";

  if (orderDisqualifiesAffiliateCommission(row.order)) {
    const cancelled = await db.affiliateCommission.updateMany({
      where: { id: commissionId, status: "WAITING_RELEASE" },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count > 0) {
      const { publishCommissionCanceledNotification } = await import(
        "@/lib/affiliate/affiliate-commission-notifications"
      );
      void publishCommissionCanceledNotification(db, commissionId, "refund");
    }
    return cancelled.count > 0 ? "cancelled" : "skipped";
  }

  const released = await db.affiliateCommission.updateMany({
    where: { id: commissionId, status: "WAITING_RELEASE" },
    data: {
      status: "AVAILABLE",
      availableAt: now,
      releasedAt: now,
    },
  });
  if (released.count > 0) {
    const { publishCommissionAvailableNotification } = await import(
      "@/lib/affiliate/affiliate-commission-notifications"
    );
    void publishCommissionAvailableNotification(db, commissionId);
  }
  return released.count > 0 ? "released" : "skipped";
}

/** Cron: mở khóa hoa hồng đủ 7 ngày; hủy nếu đơn refund/cancel. */
export async function releaseDueAffiliateCommissions(
  db: DbLike,
  options?: { now?: Date; limit?: number },
): Promise<CommissionReleaseBatchResult> {
  const now = options?.now ?? new Date();
  const limit = Math.min(500, Math.max(1, options?.limit ?? RELEASE_BATCH_SIZE));

  const due = await db.affiliateCommission.findMany({
    where: {
      status: "WAITING_RELEASE",
      unlockAt: { lte: now },
    },
    orderBy: { unlockAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let released = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const row of due) {
    const outcome = await tryReleaseAffiliateCommission(db, row.id, now);
    if (outcome === "released") released += 1;
    else if (outcome === "cancelled") cancelled += 1;
    else skipped += 1;
  }

  return { scanned: due.length, released, cancelled, skipped };
}

export { COMMISSION_HOLD_DAYS };
