import type { PrismaClient } from "@prisma/client";
import {
  publishCustomerAccountNotification,
  sanitizeCustomerNotificationText,
} from "@/lib/customer-account-notifications";
import { broadcastCustomerNotifications } from "@/lib/customer-notification-broadcast";
import {
  loginProviderFromAccountProvider,
  loginProviderLabelVi,
  maskIpForCustomerNotification,
  parseUserAgentHints,
} from "@/lib/sign-in-notification-hints";

export const SYSTEM_NOTIFICATION_VERSION = 1;

export type SystemNotificationSeverity = "info" | "warning" | "critical";

export async function publishCustomerPasswordChanged(args: { customerId: string }): Promise<void> {
  await publishCustomerAccountNotification({
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

export async function publishCustomerNewSignIn(args: {
  customerId: string;
  /** NextAuth Account.provider — google, facebook, customer-credentials, … */
  accountProvider?: string | null;
  forwardedIp?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const { browser, os, device } = parseUserAgentHints(args.userAgent ?? null);
  const ipMasked = maskIpForCustomerNotification(args.forwardedIp);
  const providerKind = loginProviderFromAccountProvider(args.accountProvider ?? null);
  const providerVi = loginProviderLabelVi(providerKind);

  const lineMain = sanitizeCustomerNotificationText([browser, os].join(" · "), 180);
  const lineIp = ipMasked ? sanitizeCustomerNotificationText(`IP: ${ipMasked}`, 80) : "";
  const hintProvider = sanitizeCustomerNotificationText(providerVi, 120);
  const body = sanitizeCustomerNotificationText(
    `${lineMain}${lineIp ? ` · ${lineIp}` : ""}${hintProvider ? ` · ${hintProvider}` : ""}`,
    8000,
  );

  const dedupeBase = `${args.customerId}:${Date.now()}`;
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: "SYSTEM",
    dedupeKey: `system:signin:${dedupeBase}`.slice(0, 180),
    title: "Đăng nhập mới",
    body:
      body || "Có phiên đăng nhập mới vào tài khoản của bạn. Nếu đó không phải là bạn, hãy đổi mật khẩu ngay.",
    actionHref: "/tai-khoan?tab=security",
    metadata: {
      type: "SYSTEM_CUSTOMER",
      /** Đối chiếu UI account center variant NEW_SIGN_IN */
      signalType: "NEW_SIGN_IN",
      systemType: "NEW_SIGN_IN",
      severity: "info" satisfies SystemNotificationSeverity,
      deepLink: "/tai-khoan?tab=security",
      notificationVersion: SYSTEM_NOTIFICATION_VERSION,
      browser,
      os,
      device,
      ip: ipMasked,
      provider: providerKind,
      providerLabelVi: hintProvider || providerVi,
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
