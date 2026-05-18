import "server-only";

import type { Prisma } from "@prisma/client";
import { formatVnd } from "@/lib/currency";
import { publishCustomerAccountNotification } from "@/lib/customer-account-notifications";
import { COMMISSION_HOLD_DAYS, formatCommissionUnlockDateVi } from "@/lib/affiliate/commission-hold";
import { AFFILIATE_COMMISSION_NOTIFICATION_TYPE } from "@/lib/affiliate/affiliate-commission-notification-types";

const AFFILIATE_EARNINGS_HREF = "/tai-khoan?tab=affiliate&sub=earnings";

type DbLike = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

function formatOrderCodeDisplay(code: string): string {
  const t = code.trim();
  if (t.length <= 12) return t;
  return `…${t.slice(-10)}`;
}

async function resolveActiveAffiliateCustomerId(
  db: DbLike,
  affiliateProfileId: string,
): Promise<string | null> {
  const row = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { customerId: true, status: true },
  });
  if (!row?.customerId || row.status !== "ACTIVE") return null;
  return row.customerId;
}

function buildLifecycleMeta(args: {
  type: (typeof AFFILIATE_COMMISSION_NOTIFICATION_TYPE)[keyof typeof AFFILIATE_COMMISSION_NOTIFICATION_TYPE];
  commissionId: string;
  orderId: string;
  orderCode: string;
  commissionAmount: number;
  unlockAt?: string | null;
}): Record<string, unknown> {
  return {
    type: args.type,
    commissionId: args.commissionId,
    orderId: args.orderId,
    orderCode: args.orderCode,
    commissionAmount: args.commissionAmount,
    unlockAt: args.unlockAt ?? null,
    actionWalletHref: AFFILIATE_EARNINGS_HREF,
  };
}

export async function publishCommissionWaitingReleaseNotification(
  db: DbLike,
  commissionId: string,
): Promise<void> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      amount: true,
      unlockAt: true,
      affiliateProfileId: true,
      order: { select: { id: true, code: true } },
    },
  });
  if (!row) return;

  const customerId = await resolveActiveAffiliateCustomerId(db, row.affiliateProfileId);
  if (!customerId) return;

  const amount = Number(row.amount ?? 0);
  const orderCode = formatOrderCodeDisplay(row.order.code);
  const unlockLabel = row.unlockAt ? formatCommissionUnlockDateVi(row.unlockAt) : "";

  const title = "Hoa hồng đang được giữ";
  const body = [
    `Hoa hồng ${formatVnd(amount)} từ đơn #${orderCode} đang được giữ ${COMMISSION_HOLD_DAYS} ngày để kiểm tra hoàn trả đơn hàng.`,
    unlockLabel ? `Dự kiến mở khóa: ${unlockLabel}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:comm:hold:${row.id}`,
    title,
    body,
    actionHref: AFFILIATE_EARNINGS_HREF,
    metadata: buildLifecycleMeta({
      type: AFFILIATE_COMMISSION_NOTIFICATION_TYPE.WAITING_RELEASE,
      commissionId: row.id,
      orderId: row.order.id,
      orderCode: row.order.code,
      commissionAmount: amount,
      unlockAt: row.unlockAt?.toISOString() ?? null,
    }),
  });
}

export async function publishCommissionAvailableNotification(
  db: DbLike,
  commissionId: string,
): Promise<void> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      amount: true,
      availableAt: true,
      affiliateProfileId: true,
      order: { select: { id: true, code: true } },
    },
  });
  if (!row || row.availableAt == null) return;

  const customerId = await resolveActiveAffiliateCustomerId(db, row.affiliateProfileId);
  if (!customerId) return;

  const amount = Number(row.amount ?? 0);
  const orderCode = formatOrderCodeDisplay(row.order.code);

  const title = "Hoa hồng đã mở khóa";
  const body = `🎉 Hoa hồng ${formatVnd(amount)} từ đơn #${orderCode} đã được mở khóa và cộng vào hoa hồng khả dụng. Bạn có thể rút sau khi đối soát theo chính sách.`;

  await publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:comm:avail:${row.id}`,
    title,
    body,
    actionHref: AFFILIATE_EARNINGS_HREF,
    metadata: buildLifecycleMeta({
      type: AFFILIATE_COMMISSION_NOTIFICATION_TYPE.AVAILABLE,
      commissionId: row.id,
      orderId: row.order.id,
      orderCode: row.order.code,
      commissionAmount: amount,
    }),
  });
}

export async function publishCommissionCanceledNotification(
  db: DbLike,
  commissionId: string,
  reason: "refund" | "cancel" | "admin" = "refund",
): Promise<void> {
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      amount: true,
      affiliateProfileId: true,
      order: { select: { id: true, code: true } },
    },
  });
  if (!row) return;

  const customerId = await resolveActiveAffiliateCustomerId(db, row.affiliateProfileId);
  if (!customerId) return;

  const amount = Number(row.amount ?? 0);
  const orderCode = formatOrderCodeDisplay(row.order.code);

  const title = "Hoa hồng đã bị hủy";
  const body =
    reason === "admin"
      ? `Hoa hồng ${formatVnd(amount)} từ đơn #${orderCode} đã bị hủy theo quyết định đối soát.`
      : `Hoa hồng ${formatVnd(amount)} từ đơn #${orderCode} đã bị hủy do đơn hàng phát sinh hoàn trả hoặc hủy đơn.`;

  await publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `aff:comm:cancel:${row.id}`,
    title,
    body,
    actionHref: AFFILIATE_EARNINGS_HREF,
    metadata: buildLifecycleMeta({
      type: AFFILIATE_COMMISSION_NOTIFICATION_TYPE.CANCELED,
      commissionId: row.id,
      orderId: row.order.id,
      orderCode: row.order.code,
      commissionAmount: amount,
    }),
  });
}
