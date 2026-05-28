import "server-only";

import { db } from "@/lib/db";

export type CtvAccountHistoryCategory =
  | "application"
  | "payout"
  | "withdrawal"
  | "reward"
  | "tier"
  | "notification"
  | "affiliate";

export type CtvAccountHistoryItem = {
  id: string;
  eventType: string;
  category: CtvAccountHistoryCategory;
  title: string;
  body: string;
  createdAt: string;
  source: "domain" | "notification";
  actionHref: string | null;
  read: boolean;
  notificationId: string | null;
};

export type CtvAccountHistoryResult = {
  items: CtvAccountHistoryItem[];
  unreadNotificationIds: string[];
};

type HistoryDraft = Omit<CtvAccountHistoryItem, "createdAt"> & { createdAt: Date };

const DOMAIN_NOTIFICATION_TYPES = new Set([
  "AFFILIATE_APPLICATION_APPROVED",
  "AFFILIATE_APPLICATION_REJECTED",
  "AFFILIATE_PAYOUT_FLOW",
  "AFFILIATE_WITHDRAWAL_FLOW",
  "CTV_REVENUE_REWARD",
  "CTV_TIER_UP",
  "CTV_TIER_DOWN",
]);

const AFFILIATE_HISTORY_SUB_TABS = new Set([
  "overview",
  "orders",
  "earnings",
  "withdrawal",
  "links",
  "revenueRewards",
  "history",
  "guide",
]);

function moneyVnd(value: unknown): string {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("vi-VN").format(Number.isFinite(n) ? Math.round(n) : 0)}₫`;
}

function metadataObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function metadataType(value: unknown): string {
  const meta = metadataObject(value);
  const type = meta?.type;
  return typeof type === "string" ? type : "";
}

function isCtvRelatedNotification(row: {
  category: string;
  actionHref: string | null;
  metadata: unknown;
}): boolean {
  const type = metadataType(row.metadata);
  if (type.startsWith("AFFILIATE_") || type.startsWith("CTV_")) return true;
  if (row.category === "COMMISSION") return true;
  return Boolean(row.actionHref?.includes("tab=affiliate"));
}

function normalizeHistoryActionHref(raw: string | null | undefined): string | null {
  const href = (raw ?? "").trim();
  if (!href) return null;
  try {
    const url = new URL(href, "https://zendo.vn");
    if (url.pathname !== "/tai-khoan" || url.searchParams.get("tab") !== "affiliate") return href;
    const rawSub = (url.searchParams.get("sub") ?? "overview").trim();
    const sub = rawSub === "dashboard" ? "overview" : rawSub;
    url.searchParams.set("sub", AFFILIATE_HISTORY_SUB_TABS.has(sub) ? sub : "overview");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function pushEvent(
  target: HistoryDraft[],
  input: Omit<HistoryDraft, "actionHref" | "notificationId" | "read" | "source"> &
    Partial<Pick<HistoryDraft, "actionHref" | "notificationId" | "read" | "source">>,
): void {
  if (!input.createdAt || Number.isNaN(input.createdAt.getTime())) return;
  target.push({
    ...input,
    source: input.source ?? "domain",
    actionHref: normalizeHistoryActionHref(input.actionHref),
    notificationId: input.notificationId ?? null,
    read: input.read ?? true,
  });
}

export async function getCtvAccountHistoryForCustomer(args: {
  customerId: string;
  take?: number;
}): Promise<CtvAccountHistoryResult> {
  const customerId = args.customerId.trim();
  if (!customerId) return { items: [], unreadNotificationIds: [] };

  const take = Math.min(100, Math.max(10, Math.floor(args.take ?? 80)));
  const [profile, applications, notifications] = await Promise.all([
    db.affiliateProfile.findFirst({
      where: { customerId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, refCode: true, status: true },
    }),
    db.affiliateApplication.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        adminNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
    db.customerAccountNotification.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: Math.max(120, take),
      select: {
        id: true,
        category: true,
        title: true,
        body: true,
        actionHref: true,
        readAt: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  const profileId = profile?.id ?? "";
  const [
    payoutAccount,
    payoutChangeRequests,
    withdrawals,
    rewardGrants,
    tierHistory,
  ] = profileId
    ? await Promise.all([
        db.affiliatePayoutAccount.findUnique({
          where: { affiliateProfileId: profileId },
          select: {
            id: true,
            bankName: true,
            bankAccountHolder: true,
            verificationStatus: true,
            rejectionReason: true,
            verifiedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.affiliatePayoutAccountChangeRequest.findMany({
          where: { affiliateProfileId: profileId },
          orderBy: { requestedAt: "desc" },
          take: 40,
          select: {
            id: true,
            requestedBankName: true,
            requestedBankAccountHolder: true,
            status: true,
            rejectionReason: true,
            requestedAt: true,
            reviewedAt: true,
          },
        }),
        db.affiliateWithdrawalRequest.findMany({
          where: { affiliateProfileId: profileId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            amount: true,
            status: true,
            adminNote: true,
            createdAt: true,
            approvedAt: true,
            paidAt: true,
            rejectedAt: true,
          },
        }),
        db.ctvRevenueRewardGrant.findMany({
          where: { affiliateProfileId: profileId },
          orderBy: [{ paidAt: "desc" }, { grantedAt: "desc" }],
          take: 40,
          select: {
            id: true,
            rewardAmount: true,
            qualifiedRevenue30d: true,
            grantedAt: true,
            paidAt: true,
            tier: { select: { name: true } },
          },
        }),
        db.ctvTierHistory.findMany({
          where: { affiliateProfileId: profileId },
          orderBy: { createdAt: "desc" },
          take: 40,
          select: {
            id: true,
            revenue: true,
            createdAt: true,
            fromTier: { select: { name: true, sortOrder: true } },
            toTier: { select: { name: true, sortOrder: true, commissionPercent: true } },
          },
        }),
      ])
    : [null, [], [], [], []] as const;

  const events: HistoryDraft[] = [];
  const affiliateHref = "/tai-khoan?tab=affiliate&sub=overview";
  const payoutHref = "/tai-khoan?tab=affiliate&sub=withdrawal#affiliate-payout-account";
  const withdrawalHref = "/tai-khoan?tab=affiliate&sub=withdrawal";
  const rewardsHref = "/tai-khoan?tab=affiliate&sub=revenueRewards";

  for (const app of applications) {
    pushEvent(events, {
      id: `application:${app.id}:submitted`,
      eventType: "AFFILIATE_APPLICATION_SUBMITTED",
      category: "application",
      title: "Đăng ký CTV",
      body: "Bạn đã gửi yêu cầu đăng ký CTV.",
      createdAt: app.createdAt,
      actionHref: affiliateHref,
    });
    if (app.status === "APPROVED" && app.reviewedAt) {
      pushEvent(events, {
        id: `application:${app.id}:approved`,
        eventType: "AFFILIATE_APPLICATION_APPROVED",
        category: "application",
        title: "Được duyệt CTV",
        body: app.adminNote ? `Yêu cầu đăng ký CTV đã được duyệt. Ghi chú: ${app.adminNote}` : "Yêu cầu đăng ký CTV đã được duyệt.",
        createdAt: app.reviewedAt,
        actionHref: affiliateHref,
      });
    }
    if (app.status === "REJECTED" && app.reviewedAt) {
      pushEvent(events, {
        id: `application:${app.id}:rejected`,
        eventType: "AFFILIATE_APPLICATION_REJECTED",
        category: "application",
        title: "Bị từ chối CTV",
        body: app.adminNote ? `Yêu cầu đăng ký CTV bị từ chối. Lý do: ${app.adminNote}` : "Yêu cầu đăng ký CTV bị từ chối.",
        createdAt: app.reviewedAt,
        actionHref: affiliateHref,
      });
    }
  }

  if (payoutAccount) {
    pushEvent(events, {
      id: `payout-account:${payoutAccount.id}:submitted`,
      eventType: "PAYOUT_ACCOUNT_SUBMITTED",
      category: "payout",
      title: "Đăng ký tài khoản nhận tiền",
      body: `Tài khoản ${payoutAccount.bankName} - ${payoutAccount.bankAccountHolder} đang chờ xác minh.`,
      createdAt: payoutAccount.createdAt,
      actionHref: payoutHref,
    });
    if (payoutAccount.verificationStatus === "APPROVED") {
      pushEvent(events, {
        id: `payout-account:${payoutAccount.id}:approved`,
        eventType: "PAYOUT_ACCOUNT_APPROVED",
        category: "payout",
        title: "Được duyệt tài khoản nhận tiền",
        body: "Tài khoản nhận tiền đã được xác minh.",
        createdAt: payoutAccount.verifiedAt ?? payoutAccount.updatedAt,
        actionHref: payoutHref,
      });
    }
    if (payoutAccount.verificationStatus === "REJECTED") {
      pushEvent(events, {
        id: `payout-account:${payoutAccount.id}:rejected`,
        eventType: "PAYOUT_ACCOUNT_REJECTED",
        category: "payout",
        title: "Bị từ chối tài khoản nhận tiền",
        body: payoutAccount.rejectionReason
          ? `Tài khoản nhận tiền bị từ chối. Lý do: ${payoutAccount.rejectionReason}`
          : "Tài khoản nhận tiền bị từ chối.",
        createdAt: payoutAccount.verifiedAt ?? payoutAccount.updatedAt,
        actionHref: payoutHref,
      });
    }
  }

  for (const req of payoutChangeRequests) {
    pushEvent(events, {
      id: `payout-change:${req.id}:submitted`,
      eventType: "PAYOUT_CHANGE_REQUEST_SUBMITTED",
      category: "payout",
      title: "Gửi yêu cầu đổi tài khoản ngân hàng",
      body: `Tài khoản mới: ${req.requestedBankName} - ${req.requestedBankAccountHolder}.`,
      createdAt: req.requestedAt,
      actionHref: payoutHref,
    });
    if (req.status === "APPROVED" && req.reviewedAt) {
      pushEvent(events, {
        id: `payout-change:${req.id}:approved`,
        eventType: "PAYOUT_CHANGE_REQUEST_APPROVED",
        category: "payout",
        title: "Được duyệt đổi tài khoản ngân hàng",
        body: "Yêu cầu thay đổi tài khoản ngân hàng đã được duyệt.",
        createdAt: req.reviewedAt,
        actionHref: payoutHref,
      });
    }
    if (req.status === "REJECTED" && req.reviewedAt) {
      pushEvent(events, {
        id: `payout-change:${req.id}:rejected`,
        eventType: "PAYOUT_CHANGE_REQUEST_REJECTED",
        category: "payout",
        title: "Bị từ chối đổi tài khoản ngân hàng",
        body: req.rejectionReason
          ? `Yêu cầu thay đổi tài khoản ngân hàng bị từ chối. Lý do: ${req.rejectionReason}`
          : "Yêu cầu thay đổi tài khoản ngân hàng bị từ chối.",
        createdAt: req.reviewedAt,
        actionHref: payoutHref,
      });
    }
  }

  for (const withdrawal of withdrawals) {
    pushEvent(events, {
      id: `withdrawal:${withdrawal.id}:submitted`,
      eventType: "WITHDRAWAL_SUBMITTED",
      category: "withdrawal",
      title: "Gửi yêu cầu rút tiền",
      body: `Số tiền yêu cầu: ${moneyVnd(withdrawal.amount)}.`,
      createdAt: withdrawal.createdAt,
      actionHref: withdrawalHref,
    });
    if (withdrawal.approvedAt) {
      pushEvent(events, {
        id: `withdrawal:${withdrawal.id}:approved`,
        eventType: "WITHDRAWAL_APPROVED",
        category: "withdrawal",
        title: "Được duyệt rút tiền",
        body: `Yêu cầu rút ${moneyVnd(withdrawal.amount)} đã được duyệt.`,
        createdAt: withdrawal.approvedAt,
        actionHref: withdrawalHref,
      });
    }
    if (withdrawal.paidAt) {
      pushEvent(events, {
        id: `withdrawal:${withdrawal.id}:paid`,
        eventType: "WITHDRAWAL_PAID",
        category: "withdrawal",
        title: "Đã thanh toán rút tiền",
        body: `Yêu cầu rút ${moneyVnd(withdrawal.amount)} đã được thanh toán.`,
        createdAt: withdrawal.paidAt,
        actionHref: withdrawalHref,
      });
    }
    if (withdrawal.rejectedAt) {
      pushEvent(events, {
        id: `withdrawal:${withdrawal.id}:rejected`,
        eventType: "WITHDRAWAL_REJECTED",
        category: "withdrawal",
        title: "Từ chối rút tiền",
        body: withdrawal.adminNote
          ? `Yêu cầu rút ${moneyVnd(withdrawal.amount)} bị từ chối. Lý do: ${withdrawal.adminNote}`
          : `Yêu cầu rút ${moneyVnd(withdrawal.amount)} bị từ chối.`,
        createdAt: withdrawal.rejectedAt,
        actionHref: withdrawalHref,
      });
    }
  }

  for (const grant of rewardGrants) {
    pushEvent(events, {
      id: `revenue-reward:${grant.id}`,
      eventType: "CTV_REVENUE_REWARD",
      category: "reward",
      title: "Nhận thưởng doanh thu",
      body: `Bạn đã nhận ${moneyVnd(grant.rewardAmount)} cho hạng ${grant.tier.name}.`,
      createdAt: grant.paidAt ?? grant.grantedAt,
      actionHref: rewardsHref,
    });
  }

  for (const tier of tierHistory) {
    const fromSort = tier.fromTier?.sortOrder ?? -1;
    const isPromotion = tier.toTier.sortOrder >= fromSort;
    pushEvent(events, {
      id: `tier:${tier.id}`,
      eventType: isPromotion ? "CTV_TIER_UP" : "CTV_TIER_CHANGE",
      category: "tier",
      title: isPromotion ? "Thăng hạng CTV" : "Cập nhật hạng CTV",
      body: tier.fromTier
        ? `Từ ${tier.fromTier.name} lên ${tier.toTier.name}. Hoa hồng hiện tại: ${Number(tier.toTier.commissionPercent)}%.`
        : `Bạn đạt hạng ${tier.toTier.name}. Hoa hồng hiện tại: ${Number(tier.toTier.commissionPercent)}%.`,
      createdAt: tier.createdAt,
      actionHref: rewardsHref,
    });
  }

  const unreadNotificationIds: string[] = [];
  for (const row of notifications) {
    if (!isCtvRelatedNotification(row)) continue;
    if (!row.readAt) unreadNotificationIds.push(row.id);

    const type = metadataType(row.metadata);
    if (DOMAIN_NOTIFICATION_TYPES.has(type)) continue;

    pushEvent(events, {
      id: `notification:${row.id}`,
      eventType: type || "CTV_NOTIFICATION",
      category: type.startsWith("AFFILIATE_") ? "affiliate" : "notification",
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      source: "notification",
      actionHref: row.actionHref,
      notificationId: row.id,
      read: row.readAt != null,
    });
  }

  const items = events
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, take)
    .map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));

  return { items, unreadNotificationIds: unreadNotificationIds.slice(0, 50) };
}
