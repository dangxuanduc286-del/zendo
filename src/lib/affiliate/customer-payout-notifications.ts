import type { CustomerAccountNotificationCategory } from "@prisma/client";
import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";

export const AFFILIATE_PAYOUT_NOTIFICATION_HREF = "/tai-khoan?tab=affiliate&sub=withdrawal#affiliate-payout-account";

const COMMISSION: CustomerAccountNotificationCategory = "COMMISSION";

const payoutMeta = (): Record<string, unknown> => ({ type: "AFFILIATE_PAYOUT_FLOW" });

function bodyWithOptionalReason(base: string, rejectionReason?: string | null): string {
  const reason = sanitizeCustomerNotificationText(rejectionReason ?? "", 1200);
  if (!reason) return base;
  return `${base}\nLý do: ${reason}`;
}

export function publishAffiliatePayoutAccountSubmitted(args: { customerId: string; payoutAccountId: string }): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_sub:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: "Tài khoản nhận tiền của bạn đang chờ xác minh.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export function publishAffiliatePayoutAccountApproved(args: { customerId: string; payoutAccountId: string }): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_appr:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: "Tài khoản nhận tiền đã được xác minh.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export function publishAffiliatePayoutAccountRejected(args: {
  customerId: string;
  payoutAccountId: string;
  rejectionReason?: string | null;
}): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_rej:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: bodyWithOptionalReason("Tài khoản nhận tiền bị từ chối.", args.rejectionReason),
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export function publishAffiliatePayoutChangeRequestSubmitted(args: { customerId: string; changeRequestId: string }): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_sub:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: "Yêu cầu thay đổi tài khoản ngân hàng đã được gửi.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export function publishAffiliatePayoutChangeRequestApproved(args: { customerId: string; changeRequestId: string }): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_appr:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: "Yêu cầu thay đổi tài khoản ngân hàng đã được duyệt.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export function publishAffiliatePayoutChangeRequestRejected(args: {
  customerId: string;
  changeRequestId: string;
  rejectionReason?: string | null;
}): void {
  publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_rej:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: bodyWithOptionalReason("Yêu cầu thay đổi tài khoản ngân hàng bị từ chối.", args.rejectionReason),
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

/** Awaited variant for routes that already use try/finally (still non-throwing). */
