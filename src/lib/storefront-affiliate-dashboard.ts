import type { AffiliateCommissionStatus, AffiliateWithdrawalStatus, OrderStatus } from "@prisma/client";
import { db } from "./db";
import { getWebsiteSettings } from "./settings";
import { normalizeAffiliateSettings, resolveCtvGuideContentForDisplay } from "./admin/affiliate";

const money = (v: { toString(): string } | null | undefined): number => {
  if (v == null) return 0;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : 0;
};

/** Mã đơn hiển thị ngắn (khách mua không lộ họ tên/SĐT). */
export function formatAffiliateOrderCodeShort(code: string): string {
  const t = code.trim();
  if (t.length <= 12) return t;
  return `…${t.slice(-10)}`;
}

export function orderStatusVi(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    COMPLETED: "Hoàn thành",
    CANCELED: "Đã hủy",
    REFUNDED: "Đã hoàn tiền",
  };
  return map[status] ?? status;
}

export function affiliateCommissionStatusVi(s: AffiliateCommissionStatus): string {
  const map: Record<AffiliateCommissionStatus, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    PAID: "Đã thanh toán",
    CANCELLED: "Đã hủy",
  };
  return map[s] ?? s;
}

export function affiliateWithdrawalStatusVi(s: AffiliateWithdrawalStatus): string {
  const map: Record<AffiliateWithdrawalStatus, string> = {
    PENDING: "Chờ xử lý",
    APPROVED: "Đã duyệt",
    PAID: "Đã chi",
    REJECTED: "Từ chối",
  };
  return map[s] ?? s;
}

export type StorefrontAffiliateReferredOrderRow = {
  id: string;
  code: string;
  createdAt: string;
  orderStatus: OrderStatus;
  orderStatusVi: string;
  totalAmount: number;
  estimatedCommission: number;
  commissionStatus: AffiliateCommissionStatus;
  commissionStatusVi: string;
};

export type StorefrontAffiliateCommissionRow = {
  id: string;
  createdAt: string;
  amount: number;
  orderRevenue: number;
  status: AffiliateCommissionStatus;
  /** hiển thị + lọc tab (chữ thường) */
  statusKey: string;
  statusDisplayVi: string;
  orderCode: string;
  approvedAt: string | null;
  paidAt: string | null;
};

export type StorefrontAffiliateWithdrawalRow = {
  id: string;
  createdAt: string;
  amount: number;
  status: AffiliateWithdrawalStatus;
  statusDisplayVi: string;
  approvedAt: string | null;
  paidAt: string | null;
};

export type StorefrontAffiliateDashboardData = {
  profileId: string;
  refCode: string;
  profileStatus: "ACTIVE" | "PAUSED" | "LOCKED";
  summary: {
    totalClicks: number;
    referredOrdersCount: number;
    referralRevenue: number;
    commissionPending: number;
    commissionApprovedPool: number;
    commissionPaid: number;
    commissionCancelled: number;
    conversionRatePercent: number | null;
    withdrawableBalance: number;
  };
  referredOrders: StorefrontAffiliateReferredOrderRow[];
  commissions: StorefrontAffiliateCommissionRow[];
  withdrawals: StorefrontAffiliateWithdrawalRow[];
  productQuickLinks: Array<{ id: string; name: string; slug: string }>;
  program: {
    withdrawalEnabled: boolean;
    payoutThreshold: number;
    minWithdrawalAmount: number;
    ctvGuideResolved: string;
    affiliateCanBuy: boolean;
  };
};

/**
 * Dashboard CTV storefront — chỉ gọi từ API/RSC có session.customerId khớp.
 * Không trả field khách (tên/SĐT/email/địa chỉ): chỉ mã đơn + số tiền + trạng thái.
 */
export async function getStorefrontAffiliateDashboardForCustomer(
  sessionCustomerId: string,
): Promise<StorefrontAffiliateDashboardData | null> {
  const customerId = sessionCustomerId.trim();
  if (!customerId) return null;

  const profile = await db.affiliateProfile.findFirst({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, refCode: true, status: true },
  });
  if (!profile) return null;

  const website = await getWebsiteSettings();
  const cas = website.customerAccountSettings;
  const affiliateSettings = normalizeAffiliateSettings({
    affiliateEnabled: website.affiliateEnabled,
    commissionRate: website.commissionRate,
    payoutThreshold: website.payoutThreshold,
    cookieDuration: website.cookieDuration,
    attributionRule: website.attributionRule,
    rewardPointEnabled: website.rewardPointEnabled,
    withdrawalEnabled: website.withdrawalEnabled,
    ctvGuideContent: website.ctvGuideContent,
  });
  const ctvGuideResolved = resolveCtvGuideContentForDisplay(affiliateSettings);
  const payoutThreshold = Math.max(website.payoutThreshold ?? 0, cas.affiliateMinWithdrawalAmount ?? 0);

  const [totalClicks, orders, commissions, withdrawals, products] = await Promise.all([
    db.affiliateClick.count({ where: { affiliateProfileId: profile.id } }),
    db.order.findMany({
      where: { affiliateProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        code: true,
        createdAt: true,
        orderStatus: true,
        totalAmount: true,
        affiliateCommissions: {
          take: 1,
          select: {
            amount: true,
            status: true,
            orderRevenue: true,
          },
        },
      },
    }),
    db.affiliateCommission.findMany({
      where: { affiliateProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        amount: true,
        orderRevenue: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        order: { select: { code: true } },
      },
    }),
    db.affiliateWithdrawalRequest.findMany({
      where: { affiliateProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
      },
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: { id: true, name: true, slug: true },
    }),
  ]);

  let commissionPending = 0;
  let commissionApprovedPool = 0;
  let commissionPaid = 0;
  let commissionCancelled = 0;

  for (const row of commissions) {
    const a = money(row.amount);
    switch (row.status) {
      case "PENDING":
        commissionPending += a;
        break;
      case "APPROVED":
        commissionApprovedPool += a;
        break;
      case "PAID":
        commissionPaid += a;
        break;
      case "CANCELLED":
        commissionCancelled += a;
        break;
      default:
        break;
    }
  }

  let referralRevenue = 0;
  for (const row of commissions) {
    if (row.status !== "CANCELLED") referralRevenue += money(row.orderRevenue);
  }

  const reservedForWithdrawals = withdrawals.reduce((sum, w) => {
    if (w.status === "PENDING" || w.status === "APPROVED") return sum + money(w.amount);
    return sum;
  }, 0);

  const withdrawableBalance = Math.max(0, commissionApprovedPool - reservedForWithdrawals);

  const referredOrdersCount = orders.length;
  const conversionRatePercent =
    totalClicks > 0 ? Math.round((referredOrdersCount / totalClicks) * 1000) / 10 : null;

  const referredOrders: StorefrontAffiliateReferredOrderRow[] = orders.map((o) => {
    const c = o.affiliateCommissions[0];
    const commissionAmount = c ? money(c.amount) : 0;
    const commissionStatus = c?.status ?? "PENDING";
    return {
      id: o.id,
      code: formatAffiliateOrderCodeShort(o.code),
      createdAt: o.createdAt.toISOString(),
      orderStatus: o.orderStatus,
      orderStatusVi: orderStatusVi(o.orderStatus),
      totalAmount: money(o.totalAmount),
      estimatedCommission: commissionAmount,
      commissionStatus,
      commissionStatusVi: affiliateCommissionStatusVi(commissionStatus),
    };
  });

  const commissionRows: StorefrontAffiliateCommissionRow[] = commissions.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    amount: money(c.amount),
    orderRevenue: money(c.orderRevenue),
    status: c.status,
    statusKey: c.status.toLowerCase(),
    statusDisplayVi: affiliateCommissionStatusVi(c.status),
    orderCode: formatAffiliateOrderCodeShort(c.order.code),
    approvedAt: c.approvedAt ? c.approvedAt.toISOString() : null,
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
  }));

  const withdrawalRows: StorefrontAffiliateWithdrawalRow[] = withdrawals.map((w) => ({
    id: w.id,
    createdAt: w.createdAt.toISOString(),
    amount: money(w.amount),
    status: w.status,
    statusDisplayVi: affiliateWithdrawalStatusVi(w.status),
    approvedAt: w.approvedAt ? w.approvedAt.toISOString() : null,
    paidAt: w.paidAt ? w.paidAt.toISOString() : null,
  }));

  return {
    profileId: profile.id,
    refCode: profile.refCode,
    profileStatus: profile.status,
    summary: {
      totalClicks,
      referredOrdersCount,
      referralRevenue,
      commissionPending,
      commissionApprovedPool,
      commissionPaid,
      commissionCancelled,
      conversionRatePercent,
      withdrawableBalance,
    },
    referredOrders,
    commissions: commissionRows,
    withdrawals: withdrawalRows,
    productQuickLinks: products.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
    program: {
      withdrawalEnabled: website.withdrawalEnabled,
      payoutThreshold,
      minWithdrawalAmount: cas.affiliateMinWithdrawalAmount,
      ctvGuideResolved,
      affiliateCanBuy: cas.affiliateCanBuy !== false,
    },
  };
}
