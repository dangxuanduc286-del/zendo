import type { PrismaClient } from "@prisma/client";
import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";
import { broadcastCustomerNotifications } from "@/lib/customer-notification-broadcast";

export const SYSTEM_NOTIFICATION_VERSION = 1;

export type SystemNotificationSeverity = "info" | "warning" | "critical";

export function publishCustomerPasswordChanged(args: { customerId: string }): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: "SYSTEM",
    dedupeKey: `system:pwd:${args.customerId}:${Date.now()}`.slice(0, 180),
    title: "Mật khẩu đã được đổi",
    body: "Mật khẩu tài khoản của bạn vừa được cập nhật. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.",
    actionHref: "/tai-khoan?tab=security",
    metadata: {
      type: "SYSTEM_CUSTOMER",
      systemType: "PASSWORD_CHANGED",
      severity: "warning" satisfies SystemNotificationSeverity,
      deepLink: "/tai-khoan?tab=security",
      notificationVersion: SYSTEM_NOTIFICATION_VERSION,
    },
  });
}

export function publishCustomerNewSignIn(args: { customerId: string; deviceHint?: string | null }): void {
  const hint = sanitizeCustomerNotificationText(args.deviceHint ?? "", 120);
  const hourBucket = new Date().toISOString().slice(0, 13);
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: "SYSTEM",
    dedupeKey: `system:signin:${args.customerId}:${hourBucket}`.slice(0, 180),
    title: "Đăng nhập mới",
    body: hint ? `Phát hiện đăng nhập mới: ${hint}.` : "Có phiên đăng nhập mới vào tài khoản của bạn.",
    actionHref: "/tai-khoan?tab=security",
    metadata: {
      type: "SYSTEM_CUSTOMER",
      systemType: "NEW_SIGN_IN",
      severity: "info",
      deepLink: "/tai-khoan?tab=security",
      deviceHint: hint || undefined,
      notificationVersion: SYSTEM_NOTIFICATION_VERSION,
    },
  });
}

/** Gửi thông báo hệ thống khi chính sách đã xuất bản được cập nhật (async, không chặn response admin). */
export async function broadcastSitePolicyUpdate(
  db: PrismaClient,
  row: { id: string; title: string; slug: string },
): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await broadcastCustomerNotifications({
    db,
    category: "SYSTEM",
    audience: "ALL",
    dedupeKeyPrefix: `policy:${row.id}:${stamp}`,
    title: `Chính sách: ${row.title}`,
    body: "Nội dung chính sách trên Zendo.vn đã được cập nhật. Vui lòng xem lại khi thuận tiện.",
    actionHref: `/chinh-sach/${encodeURIComponent(row.slug)}`,
    metadata: {
      type: "SYSTEM_CUSTOMER",
      systemType: "POLICY_UPDATED",
      severity: "info",
      deepLink: `/chinh-sach/${row.slug}`,
      policyId: row.id,
      notificationVersion: SYSTEM_NOTIFICATION_VERSION,
    },
  });
}
