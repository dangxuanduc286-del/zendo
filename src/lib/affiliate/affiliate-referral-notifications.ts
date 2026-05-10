import "server-only";

import type { AffiliateCommissionStatus, PaymentStatus } from "@prisma/client";
import { formatVnd } from "@/lib/currency";
import { publishCustomerAccountNotification } from "@/lib/customer-account-notifications";
import { db } from "@/lib/db";

const AFFILIATE_ORDERS_HREF = "/tai-khoan?tab=affiliate&sub=orders";
const AFFILIATE_EARNINGS_HREF = "/tai-khoan?tab=affiliate&sub=earnings";
const AFFILIATE_WITHDRAWAL_HREF = "/tai-khoan?tab=affiliate&sub=withdrawal";

function paymentLabelVi(status: PaymentStatus | string): string {
  const s = String(status).toUpperCase();
  if (s === "PAID") return "Đã thanh toán";
  if (s === "UNPAID") return "Chưa thanh toán";
  if (s === "PENDING") return "Chờ xác nhận thanh toán";
  if (s === "FAILED") return "Thanh toán thất bại";
  if (s === "REFUNDED") return "Đã hoàn tiền";
  if (s === "PARTIALLY_REFUNDED") return "Hoàn tiền một phần";
  return status;
}

function commissionPhaseLabel(status: AffiliateCommissionStatus | string): string {
  const s = String(status).toUpperCase();
  if (s === "PENDING") return "Tạm tính";
  if (s === "APPROVED") return "Đã duyệt";
  if (s === "PAID") return "Đã thanh toán";
  if (s === "CANCELLED") return "Đã hủy";
  return s;
}

function maskBuyerName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "Khách hàng";
  const parts = t.split(/\s+/);
  if (parts.length === 1) {
    const w = parts[0]!;
    return w.length <= 2 ? `${w[0] ?? ""}*` : `${w.slice(0, 2)}…`;
  }
  return `${parts[0] ?? ""} ${(parts[parts.length - 1] ?? "").slice(0, 1)}.`;
}

async function resolveAffiliateCustomerId(affiliateProfileId: string): Promise<string | null> {
  const row = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { customerId: true, status: true },
  });
  if (!row?.customerId || row.status !== "ACTIVE") return null;
  return row.customerId;
}

async function firstPrimaryProductImageForOrder(orderId: string): Promise<string | null> {
  const items = await db.orderItem.findMany({
    where: { orderId, productId: { not: null } },
    orderBy: { id: "asc" },
    take: 6,
    select: {
      product: {
        select: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });
  for (const it of items) {
    const u = it.product?.images?.[0]?.url;
    if (u && String(u).trim()) return String(u).trim();
  }
  return null;
}

type ReferralMeta = {
  type: "AFFILIATE_REFERRAL";
  event: "ORDER_PLACED" | "ORDER_PAID" | "COMMISSION_APPROVED" | "COMMISSION_PAID";
  orderId: string;
  orderCode: string;
  orderAmount: number;
  commissionAmount: number;
  commissionStatus: string;
  commissionStatusVi: string;
  paymentStatus: string;
  paymentStatusVi: string;
  buyerLabel: string;
  firstProductImageUrl: string | null;
  actionOrderHref: string;
  actionWalletHref: string;
  actionWithdrawHref: string;
};

function buildReferralMeta(args: {
  event: ReferralMeta["event"];
  orderId: string;
  orderCode: string;
  orderAmount: number;
  commissionAmount: number;
  commissionStatus: string;
  paymentStatus: string;
  buyerLabel: string;
  firstProductImageUrl: string | null;
}): ReferralMeta {
  const qs = new URLSearchParams({ highlightOrder: args.orderCode });
  return {
    type: "AFFILIATE_REFERRAL",
    event: args.event,
    orderId: args.orderId,
    orderCode: args.orderCode,
    orderAmount: args.orderAmount,
    commissionAmount: args.commissionAmount,
    commissionStatus: args.commissionStatus,
    commissionStatusVi: commissionPhaseLabel(args.commissionStatus),
    paymentStatus: args.paymentStatus,
    paymentStatusVi: paymentLabelVi(args.paymentStatus),
    buyerLabel: args.buyerLabel,
    firstProductImageUrl: args.firstProductImageUrl,
    actionOrderHref: `${AFFILIATE_ORDERS_HREF}&${qs.toString()}`,
    actionWalletHref: AFFILIATE_EARNINGS_HREF,
    actionWithdrawHref: AFFILIATE_WITHDRAWAL_HREF,
  };
}

/** Đơn có ref CTV: thông báo khi tạo đơn + hoa hồng PENDING (dữ liệu đọc từ DB). */
export async function notifyAffiliateReferralOrderPlaced(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      totalAmount: true,
      paymentStatus: true,
      affiliateProfileId: true,
      customerFullName: true,
    },
  });
  if (!order?.affiliateProfileId) return;

  const customerId = await resolveAffiliateCustomerId(order.affiliateProfileId);
  if (!customerId) return;

  const [comm, firstImage] = await Promise.all([
    db.affiliateCommission.findUnique({
      where: {
        affiliateProfileId_orderId: { affiliateProfileId: order.affiliateProfileId, orderId: order.id },
      },
      select: { amount: true, status: true },
    }),
    firstPrimaryProductImageForOrder(order.id),
  ]);
  const commissionAmount = comm ? Number(comm.amount ?? 0) : 0;
  const commissionStatus = (comm?.status ?? "PENDING") as string;
  const orderAmount = Number(order.totalAmount ?? 0);
  const buyerLabel = maskBuyerName(order.customerFullName ?? "");

  const title = `Đơn giới thiệu ${order.code}`;
  const body = [
    `Khách (${buyerLabel}) đã đặt đơn thành công qua link CTV của bạn.`,
    `Mã đơn: ${order.code}`,
    `Giá trị đơn: ${formatVnd(orderAmount)}`,
    `Hoa hồng (${commissionPhaseLabel(commissionStatus)}): ${formatVnd(commissionAmount)}`,
    `Thanh toán đơn: ${paymentLabelVi(order.paymentStatus)}`,
  ].join("\n");

  const metadata = buildReferralMeta({
    event: "ORDER_PLACED",
    orderId: order.id,
    orderCode: order.code,
    orderAmount,
    commissionAmount,
    commissionStatus,
    paymentStatus: order.paymentStatus,
    buyerLabel,
    firstProductImageUrl: firstImage,
  });

  publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:ord:${order.id}:placed`,
    title,
    body,
    actionHref: metadata.actionOrderHref,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/** Khi đơn chuyển sang thanh toán thành công (admin cập nhật). */
export async function notifyAffiliateReferralOrderPaid(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      totalAmount: true,
      paymentStatus: true,
      affiliateProfileId: true,
      customerFullName: true,
    },
  });
  if (!order?.affiliateProfileId || order.paymentStatus !== "PAID") return;

  const customerId = await resolveAffiliateCustomerId(order.affiliateProfileId);
  if (!customerId) return;

  const [comm, firstImage] = await Promise.all([
    db.affiliateCommission.findUnique({
      where: {
        affiliateProfileId_orderId: { affiliateProfileId: order.affiliateProfileId, orderId: order.id },
      },
      select: { amount: true, status: true },
    }),
    firstPrimaryProductImageForOrder(order.id),
  ]);
  const commissionAmount = comm ? Number(comm.amount ?? 0) : 0;
  const commissionStatus = (comm?.status ?? "PENDING") as string;
  const orderAmount = Number(order.totalAmount ?? 0);
  const buyerLabel = maskBuyerName(order.customerFullName ?? "");

  const title = `Đơn ${order.code} đã thanh toán`;
  const body = [
    `Đơn hàng ${order.code} đã được thanh toán thành công.`,
    `Giá trị đơn: ${formatVnd(orderAmount)}`,
    `Hoa hồng (${commissionPhaseLabel(commissionStatus)}): ${formatVnd(commissionAmount)}`,
    `Trạng thái hoa hồng: ${commissionPhaseLabel(commissionStatus)}`,
    `Khách: ${buyerLabel}`,
  ].join("\n");

  const metadata = buildReferralMeta({
    event: "ORDER_PAID",
    orderId: order.id,
    orderCode: order.code,
    orderAmount,
    commissionAmount,
    commissionStatus,
    paymentStatus: order.paymentStatus,
    buyerLabel,
    firstProductImageUrl: firstImage,
  });

  publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:ord:${order.id}:paid`,
    title,
    body,
    actionHref: metadata.actionOrderHref,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/** Khi hoa hồng chuyển PENDING → APPROVED (giao hàng / hoàn tất đơn). */
export async function notifyAffiliateCommissionApproved(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      totalAmount: true,
      paymentStatus: true,
      affiliateProfileId: true,
      customerFullName: true,
    },
  });
  if (!order?.affiliateProfileId) return;

  const customerId = await resolveAffiliateCustomerId(order.affiliateProfileId);
  if (!customerId) return;

  const comm = await db.affiliateCommission.findUnique({
    where: {
      affiliateProfileId_orderId: { affiliateProfileId: order.affiliateProfileId, orderId: order.id },
    },
    select: { id: true, amount: true, status: true },
  });
  if (!comm || comm.status !== "APPROVED") return;

  const [firstImage] = await Promise.all([firstPrimaryProductImageForOrder(order.id)]);
  const commissionAmount = Number(comm.amount ?? 0);
  const orderAmount = Number(order.totalAmount ?? 0);
  const buyerLabel = maskBuyerName(order.customerFullName ?? "");

  const title = `Hoa hồng đã duyệt — ${order.code}`;
  const body = [
    `Hoa hồng từ đơn ${order.code} đã được duyệt.`,
    `Số tiền: ${formatVnd(commissionAmount)}`,
    `Giá trị đơn: ${formatVnd(orderAmount)}`,
    `Thanh toán đơn: ${paymentLabelVi(order.paymentStatus)}`,
    `Khách: ${buyerLabel}`,
  ].join("\n");

  const metadata = buildReferralMeta({
    event: "COMMISSION_APPROVED",
    orderId: order.id,
    orderCode: order.code,
    orderAmount,
    commissionAmount,
    commissionStatus: comm.status,
    paymentStatus: order.paymentStatus,
    buyerLabel,
    firstProductImageUrl: firstImage,
  });

  publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:comm:${comm.id}:approved`,
    title,
    body,
    actionHref: metadata.actionWalletHref,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/** Khi hoa hồng chuyển sang PAID (đối soát / đánh dấu đã trả). */
export async function notifyAffiliateCommissionPaid(commissionId: string): Promise<void> {
  const comm = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      amount: true,
      status: true,
      affiliateProfileId: true,
      order: {
        select: {
          id: true,
          code: true,
          totalAmount: true,
          paymentStatus: true,
          customerFullName: true,
        },
      },
    },
  });
  if (!comm || comm.status !== "PAID" || !comm.order) return;

  const customerId = await resolveAffiliateCustomerId(comm.affiliateProfileId);
  if (!customerId) return;

  const order = comm.order;
  const commissionAmount = Number(comm.amount ?? 0);
  const orderAmount = Number(order.totalAmount ?? 0);
  const buyerLabel = maskBuyerName(order.customerFullName ?? "");

  const title = `Đã thanh toán hoa hồng — ${order.code}`;
  const body = `Bạn vừa nhận được ${formatVnd(commissionAmount)} hoa hồng từ đơn hàng ${order.code}.\nGiá trị đơn: ${formatVnd(
    orderAmount,
  )}\nThanh toán đơn: ${paymentLabelVi(order.paymentStatus)}\nKhách: ${buyerLabel}`;

  const firstImage = await firstPrimaryProductImageForOrder(order.id);
  const metadata = buildReferralMeta({
    event: "COMMISSION_PAID",
    orderId: order.id,
    orderCode: order.code,
    orderAmount,
    commissionAmount,
    commissionStatus: comm.status,
    paymentStatus: order.paymentStatus,
    buyerLabel,
    firstProductImageUrl: firstImage,
  });

  publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:comm:${comm.id}:paid`,
    title,
    body,
    actionHref: metadata.actionWithdrawHref,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}
