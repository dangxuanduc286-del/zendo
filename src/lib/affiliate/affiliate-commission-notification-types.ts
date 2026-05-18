/** Loại thông báo hoa hồng CTV — dùng trong metadata (client + server). */

export const AFFILIATE_COMMISSION_NOTIFICATION_TYPE = {
  WAITING_RELEASE: "COMMISSION_WAITING_RELEASE",
  AVAILABLE: "COMMISSION_AVAILABLE",
  CANCELED: "COMMISSION_CANCELED",
} as const;

export type AffiliateCommissionNotificationType =
  (typeof AFFILIATE_COMMISSION_NOTIFICATION_TYPE)[keyof typeof AFFILIATE_COMMISSION_NOTIFICATION_TYPE];

export function isAffiliateCommissionLifecycleNotificationType(
  value: unknown,
): value is AffiliateCommissionNotificationType {
  return (
    value === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.WAITING_RELEASE ||
    value === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.AVAILABLE ||
    value === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.CANCELED
  );
}

export function readAffiliateCommissionNotificationType(
  metadata: Record<string, unknown> | null | undefined,
): AffiliateCommissionNotificationType | null {
  if (!metadata || typeof metadata !== "object") return null;
  const t = metadata.type;
  return isAffiliateCommissionLifecycleNotificationType(t) ? t : null;
}

export type CommissionLifecycleNotificationVisual = {
  icon: string;
  label: string;
  unreadBorder: string;
  unreadBg: string;
  accentText: string;
};

export function commissionLifecycleNotificationVisual(
  type: AffiliateCommissionNotificationType,
): CommissionLifecycleNotificationVisual {
  switch (type) {
    case AFFILIATE_COMMISSION_NOTIFICATION_TYPE.WAITING_RELEASE:
      return {
        icon: "🛡️",
        label: "Đang chờ mở khóa",
        unreadBorder: "border-cyan-200",
        unreadBg: "bg-cyan-50/90",
        accentText: "text-cyan-800",
      };
    case AFFILIATE_COMMISSION_NOTIFICATION_TYPE.AVAILABLE:
      return {
        icon: "💰",
        label: "Đã mở khóa",
        unreadBorder: "border-emerald-200",
        unreadBg: "bg-emerald-50/90",
        accentText: "text-emerald-800",
      };
    case AFFILIATE_COMMISSION_NOTIFICATION_TYPE.CANCELED:
      return {
        icon: "⚠️",
        label: "Đã hủy",
        unreadBorder: "border-rose-200",
        unreadBg: "bg-rose-50/90",
        accentText: "text-rose-800",
      };
    default:
      return {
        icon: "💹",
        label: "Hoa hồng",
        unreadBorder: "border-[#BFDBFE]",
        unreadBg: "bg-[#EFF6FF]",
        accentText: "text-[#2563EB]",
      };
  }
}
