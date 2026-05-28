import "server-only";

import { db } from "@/lib/db";
import { ADMIN_SUPPORT_DM_PAGE_HREF } from "@/lib/support-dm/admin-inbox-nav";
import { publishAdminOperationalEventSafe } from "@/lib/admin/admin-operational-events";

const PAYOUT_PENDING_HREF = "/admin/affiliates/payout-accounts?mode=accounts&status=PENDING";
const PAYOUT_CHANGE_PENDING_HREF = "/admin/affiliates/payout-accounts?mode=change-requests&status=PENDING";
const WITHDRAWAL_HREF = "/admin/collaborators?tab=rut-tien";
const CTV_APPLICATION_HREF = "/admin/collaborators?tab=yeu-cau-ctv";

function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.floor(amount)));
}

async function resolveCustomerLabel(customerId: string): Promise<string> {
  const row = await db.customer.findUnique({
    where: { id: customerId },
    select: { fullName: true, email: true, phone: true },
  });
  const name = row?.fullName?.trim();
  if (name) return name;
  const email = row?.email?.trim();
  if (email) return email;
  const phone = row?.phone?.trim();
  if (phone) return phone;
  return "Khách hàng";
}

export async function notifyAdminAffiliateApplicationSubmitted(args: {
  applicationId: string;
  customerId: string;
  applicantName: string;
}): Promise<void> {
  const actor = args.applicantName.trim() || (await resolveCustomerLabel(args.customerId));
  await publishAdminOperationalEventSafe({
    category: "CTV_APPLICATION",
    eventType: "CTV_APPLICATION_SUBMITTED",
    title: "Đăng ký CTV mới",
    summary: `${actor} gửi yêu cầu đăng ký làm cộng tác viên.`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "AffiliateApplication",
    entityId: args.applicationId,
    actionHref: CTV_APPLICATION_HREF,
    dedupeKey: `ctv_app:${args.applicationId}`,
  });
}

export async function notifyAdminPayoutAccountSubmitted(args: {
  payoutAccountId: string;
  customerId: string;
}): Promise<void> {
  const actor = await resolveCustomerLabel(args.customerId);
  await publishAdminOperationalEventSafe({
    category: "PAYOUT_ACCOUNT",
    eventType: "PAYOUT_ACCOUNT_SUBMITTED",
    title: "Đăng ký TK nhận tiền",
    summary: `${actor} đăng ký tài khoản nhận tiền.`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "AffiliatePayoutAccount",
    entityId: args.payoutAccountId,
    actionHref: PAYOUT_PENDING_HREF,
    dedupeKey: `payout_sub:${args.payoutAccountId}`,
  });
}

export async function notifyAdminPayoutChangeRequestSubmitted(args: {
  changeRequestId: string;
  customerId: string;
}): Promise<void> {
  const actor = await resolveCustomerLabel(args.customerId);
  await publishAdminOperationalEventSafe({
    category: "PAYOUT_ACCOUNT",
    eventType: "PAYOUT_CHANGE_REQUEST_SUBMITTED",
    title: "Yêu cầu đổi TK nhận tiền",
    summary: `${actor} gửi yêu cầu thay đổi tài khoản ngân hàng.`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "AffiliatePayoutAccountChangeRequest",
    entityId: args.changeRequestId,
    actionHref: PAYOUT_CHANGE_PENDING_HREF,
    dedupeKey: `payout_chg:${args.changeRequestId}`,
  });
}

export async function notifyAdminWithdrawalSubmitted(args: {
  withdrawalId: string;
  affiliateProfileId: string;
  amountVnd: number;
}): Promise<void> {
  const profile = await db.affiliateProfile.findUnique({
    where: { id: args.affiliateProfileId },
    select: { customerId: true, refCode: true, customer: { select: { fullName: true, email: true, phone: true } } },
  });
  const customerId = profile?.customerId ?? null;
  const actor =
    profile?.customer?.fullName?.trim() ||
    profile?.customer?.email?.trim() ||
    profile?.customer?.phone?.trim() ||
    profile?.refCode ||
    "CTV";
  await publishAdminOperationalEventSafe({
    category: "WITHDRAWAL",
    eventType: "WITHDRAWAL_SUBMITTED",
    title: "Yêu cầu rút tiền",
    summary: `${actor} gửi yêu cầu rút ${formatVnd(args.amountVnd)}₫.`,
    actorLabel: actor,
    actorCustomerId: customerId,
    entity: "AffiliateWithdrawalRequest",
    entityId: args.withdrawalId,
    actionHref: WITHDRAWAL_HREF,
    dedupeKey: `withdrawal:${args.withdrawalId}`,
    metadata: { amountVnd: args.amountVnd, refCode: profile?.refCode ?? null },
  });
}

export async function notifyAdminOrderCreated(args: {
  orderId: string;
  orderCode: string;
  customerId: string | null;
  customerName: string | null;
  totalAmount: number;
}): Promise<void> {
  const actor = args.customerName?.trim() || (args.customerId ? await resolveCustomerLabel(args.customerId) : "Khách");
  await publishAdminOperationalEventSafe({
    category: "ORDER",
    eventType: "ORDER_CREATED",
    title: "Đơn hàng mới",
    summary: `Đơn #${args.orderCode} được tạo (${formatVnd(args.totalAmount)}₫).`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "Order",
    entityId: args.orderId,
    actionHref: `/admin/orders/${args.orderId}`,
    dedupeKey: `order_created:${args.orderId}`,
    metadata: { orderCode: args.orderCode, totalAmount: args.totalAmount },
  });
}

export async function notifyAdminCustomerRegistered(args: {
  customerId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
}): Promise<void> {
  const actor = args.fullName?.trim() || args.email?.trim() || args.phone?.trim() || "Khách hàng mới";
  await publishAdminOperationalEventSafe({
    category: "CUSTOMER",
    eventType: "CUSTOMER_REGISTERED",
    title: "Khách hàng mới",
    summary: `${actor} đăng ký tài khoản.`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "Customer",
    entityId: args.customerId,
    actionHref: `/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(actor)}`,
    dedupeKey: `customer_reg:${args.customerId}`,
  });
}

export async function notifyAdminSupportCustomerMessage(args: {
  customerId: string;
  messageId: string;
  channel: "dm" | "ticket";
  preview: string;
}): Promise<void> {
  const actor = await resolveCustomerLabel(args.customerId);
  const preview = args.preview.trim().slice(0, 120);
  await publishAdminOperationalEventSafe({
    category: "SUPPORT",
    eventType: args.channel === "dm" ? "SUPPORT_DM_MESSAGE" : "SUPPORT_TICKET_MESSAGE",
    title: args.channel === "dm" ? "Tin nhắn hỗ trợ mới" : "Ticket hỗ trợ mới",
    summary: preview ? `${actor}: ${preview}` : `${actor} gửi tin nhắn hỗ trợ.`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: args.channel === "dm" ? "SupportDmMessage" : "SupportTicketMessage",
    entityId: args.messageId,
    actionHref: ADMIN_SUPPORT_DM_PAGE_HREF,
    dedupeKey: `support_${args.channel}:${args.messageId}`,
  });
}

export async function notifyAdminOrderRefunded(args: {
  orderId: string;
  orderCode: string;
  customerId: string | null;
  customerName: string | null;
}): Promise<void> {
  const actor = args.customerName?.trim() || (args.customerId ? await resolveCustomerLabel(args.customerId) : "Khách");
  await publishAdminOperationalEventSafe({
    category: "PAYMENT",
    eventType: "ORDER_REFUNDED",
    title: "Hoàn tiền đơn hàng",
    summary: `Đơn #${args.orderCode} được hoàn tiền (${actor}).`,
    actorLabel: actor,
    actorCustomerId: args.customerId,
    entity: "Order",
    entityId: args.orderId,
    actionHref: `/admin/orders/${args.orderId}`,
    dedupeKey: `order_refund:${args.orderId}`,
  });
}
