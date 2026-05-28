import type { CustomerAccountNotificationCategory } from "@prisma/client";
import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";

export const AFFILIATE_PAYOUT_NOTIFICATION_HREF = "/tai-khoan?tab=affiliate&sub=withdrawal#affiliate-payout-account";
export const AFFILIATE_WITHDRAWAL_NOTIFICATION_HREF = "/tai-khoan?tab=affiliate&sub=withdrawal";

const COMMISSION: CustomerAccountNotificationCategory = "COMMISSION";

const payoutMeta = (): Record<string, unknown> => ({ type: "AFFILIATE_PAYOUT_FLOW" });
const withdrawalMeta = (status: string, amountVnd: number): Record<string, unknown> => ({
  type: "AFFILIATE_WITHDRAWAL_FLOW",
  status,
  amountVnd,
});

function formatVnd(amountVnd: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(amountVnd)))}₫`;
}

function bodyWithOptionalReason(base: string, rejectionReason?: string | null): string {
  const reason = sanitizeCustomerNotificationText(rejectionReason ?? "", 1200);
  if (!reason) return base;
  return `${base}\nLý do: ${reason}`;
}

export async function publishAffiliatePayoutAccountSubmitted(args: { customerId: string; payoutAccountId: string }): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_sub:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: "Tài khoản nhận tiền của bạn đang chờ xác minh.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliatePayoutAccountApproved(args: { customerId: string; payoutAccountId: string }): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_appr:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: "Tài khoản nhận tiền đã được xác minh.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliatePayoutAccountRejected(args: {
  customerId: string;
  payoutAccountId: string;
  rejectionReason?: string | null;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_payout_rej:${args.payoutAccountId}`,
    title: "Tài khoản nhận tiền",
    body: bodyWithOptionalReason("Tài khoản nhận tiền bị từ chối.", args.rejectionReason),
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliatePayoutChangeRequestSubmitted(args: { customerId: string; changeRequestId: string }): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_sub:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: "Yêu cầu thay đổi tài khoản ngân hàng đã được gửi.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliatePayoutChangeRequestApproved(args: { customerId: string; changeRequestId: string }): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_appr:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: "Yêu cầu thay đổi tài khoản ngân hàng đã được duyệt.",
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliatePayoutChangeRequestRejected(args: {
  customerId: string;
  changeRequestId: string;
  rejectionReason?: string | null;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_chg_rej:${args.changeRequestId}`,
    title: "Đổi tài khoản ngân hàng",
    body: bodyWithOptionalReason("Yêu cầu thay đổi tài khoản ngân hàng bị từ chối.", args.rejectionReason),
    actionHref: AFFILIATE_PAYOUT_NOTIFICATION_HREF,
    metadata: payoutMeta(),
  });
}

export async function publishAffiliateWithdrawalSubmitted(args: {
  customerId: string;
  withdrawalId: string;
  amountVnd: number;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_withdrawal_sub:${args.withdrawalId}`,
    title: "Yêu cầu rút tiền",
    body: `Yêu cầu rút ${formatVnd(args.amountVnd)} đã được gửi và đang chờ xử lý.`,
    actionHref: AFFILIATE_WITHDRAWAL_NOTIFICATION_HREF,
    metadata: withdrawalMeta("PENDING", args.amountVnd),
  });
}

export async function publishAffiliateWithdrawalApproved(args: {
  customerId: string;
  withdrawalId: string;
  amountVnd: number;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_withdrawal_appr:${args.withdrawalId}`,
    title: "Rút tiền đã được duyệt",
    body: `Yêu cầu rút ${formatVnd(args.amountVnd)} đã được duyệt.`,
    actionHref: AFFILIATE_WITHDRAWAL_NOTIFICATION_HREF,
    metadata: withdrawalMeta("APPROVED", args.amountVnd),
  });
}

export async function publishAffiliateWithdrawalPaid(args: {
  customerId: string;
  withdrawalId: string;
  amountVnd: number;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_withdrawal_paid:${args.withdrawalId}`,
    title: "Rút tiền đã thanh toán",
    body: `Yêu cầu rút ${formatVnd(args.amountVnd)} đã được thanh toán.`,
    actionHref: AFFILIATE_WITHDRAWAL_NOTIFICATION_HREF,
    metadata: withdrawalMeta("PAID", args.amountVnd),
  });
}

export async function publishAffiliateWithdrawalRejected(args: {
  customerId: string;
  withdrawalId: string;
  amountVnd: number;
  rejectionReason?: string | null;
}): Promise<void> {
  await publishCustomerAccountNotification({
    customerId: args.customerId,
    category: COMMISSION,
    dedupeKey: `aff_withdrawal_rej:${args.withdrawalId}`,
    title: "Rút tiền bị từ chối",
    body: bodyWithOptionalReason(`Yêu cầu rút ${formatVnd(args.amountVnd)} bị từ chối.`, args.rejectionReason),
    actionHref: AFFILIATE_WITHDRAWAL_NOTIFICATION_HREF,
    metadata: withdrawalMeta("REJECTED", args.amountVnd),
  });
}
