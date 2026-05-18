import type { AffiliateCommissionStatus, OrderStatus, PaymentStatus } from "@prisma/client";

/** Số ngày giữ hoa hồng sau khi admin duyệt, trước khi mở khóa khả dụng. */
export const COMMISSION_HOLD_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addCommissionHoldDaysUTC(base: Date, days = COMMISSION_HOLD_DAYS): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export function computeCommissionUnlockAt(approvedAt: Date): Date {
  return addCommissionHoldDaysUTC(approvedAt, COMMISSION_HOLD_DAYS);
}

/** Hoa hồng có thể dùng để rút (sau khi mở khóa). APPROVED giữ cho tương thích ngắn hạn. */
export const AFFILIATE_COMMISSION_WITHDRAWABLE_STATUSES: AffiliateCommissionStatus[] = [
  "AVAILABLE",
  "APPROVED",
];

/** Hoa hồng admin có thể đánh dấu đã thanh toán / đối soát chi. */
export const AFFILIATE_COMMISSION_RECONCILIATION_PAYABLE_STATUSES: AffiliateCommissionStatus[] = [
  "AVAILABLE",
  "APPROVED",
];

export const AFFILIATE_COMMISSION_STATUS_VI: Record<AffiliateCommissionStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  WAITING_RELEASE: "Đang chờ mở khóa",
  AVAILABLE: "Khả dụng",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export function affiliateCommissionStatusLabel(status: AffiliateCommissionStatus): string {
  return AFFILIATE_COMMISSION_STATUS_VI[status] ?? status;
}

export function orderDisqualifiesAffiliateCommission(order: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}): boolean {
  if (order.orderStatus === "CANCELED" || order.orderStatus === "REFUNDED") return true;
  return (
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "REFUNDED" ||
    order.paymentStatus === "PARTIALLY_REFUNDED"
  );
}

export function canAdminApproveCommissionStatus(status: AffiliateCommissionStatus): boolean {
  return status === "PENDING";
}

export function canAdminMarkCommissionPaidStatus(status: AffiliateCommissionStatus): boolean {
  return AFFILIATE_COMMISSION_RECONCILIATION_PAYABLE_STATUSES.includes(status);
}

export function canAdminCancelCommissionStatus(status: AffiliateCommissionStatus): boolean {
  return (
    status === "PENDING" ||
    status === "APPROVED" ||
    status === "WAITING_RELEASE" ||
    status === "AVAILABLE"
  );
}

export function commissionStatusMayAutoCancel(status: AffiliateCommissionStatus): boolean {
  return status !== "PAID" && status !== "CANCELLED";
}

export type CommissionHoldCountdown = {
  unlockAt: Date;
  daysRemaining: number;
  hoursRemaining: number;
  isPastDue: boolean;
};

export function getCommissionHoldCountdown(unlockAt: Date, now = new Date()): CommissionHoldCountdown {
  const ms = unlockAt.getTime() - now.getTime();
  const isPastDue = ms <= 0;
  const abs = Math.abs(ms);
  const daysRemaining = Math.ceil(abs / MS_PER_DAY);
  const hoursRemaining = Math.ceil(abs / (60 * 60 * 1000));
  return { unlockAt, daysRemaining: isPastDue ? 0 : daysRemaining, hoursRemaining, isPastDue };
}

export function formatCommissionUnlockDateVi(unlockAt: Date): string {
  return unlockAt.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCommissionHoldRemainingVi(unlockAt: Date, now = new Date()): string {
  const { isPastDue, daysRemaining } = getCommissionHoldCountdown(unlockAt, now);
  if (isPastDue) return "Sắp mở khóa (đang xử lý hệ thống)";
  if (daysRemaining <= 1) return "Còn dưới 1 ngày để mở khóa hoa hồng";
  return `Còn ${daysRemaining} ngày để mở khóa hoa hồng`;
}
