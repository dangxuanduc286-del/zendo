import { resolveCtvTierIcon } from "./ctv-membership-tier-icons";
import type { CtvMembershipTierRecord, CtvRankColorTokens, CtvRankResult } from "./ctv-membership-tier-types";

export {
  CTV_RANK_REVENUE_CAPTION,
  CTV_REVENUE_WINDOW_DAYS,
} from "./ctv-membership-tier-types";
export type { CtvRankResult, CtvRankLevel, CtvRankColorTokens } from "./ctv-membership-tier-types";

/** Đơn tính vào doanh thu rank: hoàn thành (hoặc đã giao) + đã thanh toán. */
export function orderQualifiesForCtvRankRevenue(orderStatus: string, paymentStatus: string): boolean {
  const pay = paymentStatus.trim().toUpperCase();
  if (pay !== "PAID") return false;
  const status = orderStatus.trim().toUpperCase();
  return status === "COMPLETED" || status === "DELIVERED";
}

export function computeCtvRankRevenueFromOrders(
  orders: ReadonlyArray<{ orderStatus: string; paymentStatus: string; totalAmount: number; createdAt?: string | Date }>,
  windowDays?: number,
): number {
  const cutoff =
    windowDays != null && windowDays > 0
      ? Date.now() - windowDays * 24 * 60 * 60 * 1000
      : null;

  return orders.reduce((sum, order) => {
    if (!orderQualifiesForCtvRankRevenue(order.orderStatus, order.paymentStatus)) return sum;
    if (cutoff != null && order.createdAt != null) {
      const t = new Date(order.createdAt).getTime();
      if (!Number.isFinite(t) || t < cutoff) return sum;
    }
    const amount = Number(order.totalAmount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function formatCtvRankMoney(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(amount)))}₫`;
}

export function formatCtvRevenueRewardAmount(tier: CtvMembershipTierRecord): string {
  return formatCtvRankMoney(tier.rewardAmount);
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function tierBadgeLabel(name: string): string {
  const parts = name.replace(/^CTV\s+/i, "").trim();
  return parts || name;
}

function themeToColor(theme: CtvMembershipTierRecord["badgeColor"]): CtvRankColorTokens {
  return {
    gradient: theme.gradient,
    glow: theme.glow,
    progress: theme.progress,
    badge: theme.badge,
    iconBg: theme.iconBg,
    iconText: theme.iconText,
  };
}

/** Xác định tier hiện tại theo doanh thu 30 ngày (revenueFrom..revenueTo). */
export function resolveCtvMembershipTierForRevenue(
  revenue: number,
  tiers: readonly CtvMembershipTierRecord[],
): CtvMembershipTierRecord | null {
  const active = [...tiers].filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (active.length === 0) return null;

  const r = Math.max(0, Number.isFinite(revenue) ? revenue : 0);
  let matched = active[0]!;
  for (const tier of active) {
    if (r >= tier.revenueFrom && r <= tier.revenueTo) {
      matched = tier;
    }
    if (r > tier.revenueTo) {
      matched = tier;
    }
  }
  return matched;
}

export function getNextCtvMembershipTier(
  current: CtvMembershipTierRecord,
  tiers: readonly CtvMembershipTierRecord[],
): CtvMembershipTierRecord | null {
  const active = [...tiers].filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = active.findIndex((t) => t.id === current.id);
  if (idx < 0 || idx >= active.length - 1) return null;
  return active[idx + 1] ?? null;
}

export function getCtvRankFromTiers(totalRevenue: number, tiers: readonly CtvMembershipTierRecord[]): CtvRankResult {
  const revenue = Math.max(0, Number.isFinite(totalRevenue) ? totalRevenue : 0);
  const current = resolveCtvMembershipTierForRevenue(revenue, tiers);
  const active = [...tiers].filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  if (!current || active.length === 0) {
    return {
      tierId: "",
      code: "none",
      name: "Chưa đạt hạng",
      level: "none",
      badge: "Tân binh",
      revenueFrom: 0,
      revenueTo: 0,
      currentThreshold: 0,
      nextThreshold: active[0]?.revenueFrom ?? null,
      nextTierName: active[0]?.name ?? null,
      progress: 0,
      remaining: active[0]?.revenueFrom ?? 0,
      color: {
        gradient: "from-slate-100 via-slate-50 to-white",
        glow: "shadow-slate-200/50",
        progress: "from-slate-400 to-slate-500",
        badge: "bg-slate-100 text-slate-700 ring-slate-200/80",
        iconBg: "from-slate-100 to-slate-200",
        iconText: "text-slate-600",
      },
      icon: resolveCtvTierIcon("sparkles"),
      iconKey: "sparkles",
      progressHint: active[0] ? `Còn thiếu ${formatCtvRankMoney(active[0].revenueFrom)} để đạt ${active[0].name}` : "Chưa có cấu hình hạng",
      isMaxRank: false,
      commissionPercent: 0,
      rewardAmount: 0,
      rewardThreshold: 0,
    };
  }

  const next = getNextCtvMembershipTier(current, tiers);
  const isMaxRank = next == null;
  const currentThreshold = current.revenueFrom;
  const nextThreshold = next?.revenueFrom ?? null;

  let progress = 0;
  let remaining = 0;
  let progressHint = "";

  if (isMaxRank) {
    progress = 100;
    remaining = 0;
    progressHint = "Đã đạt cấp cao nhất";
  } else if (next != null) {
    const span = next.revenueFrom - currentThreshold;
    const inBand = revenue - currentThreshold;
    progress = span > 0 ? clampProgress((inBand / span) * 100) : 0;
    remaining = Math.max(0, next.revenueFrom - revenue);
    progressHint =
      remaining > 0
        ? `Còn thiếu ${formatCtvRankMoney(remaining)} để lên ${next.name}`
        : `Sắp lên ${next.name}`;
  }

  return {
    tierId: current.id,
    code: current.code,
    name: current.name,
    level: current.code,
    badge: tierBadgeLabel(current.name),
    revenueFrom: current.revenueFrom,
    revenueTo: current.revenueTo,
    currentThreshold,
    nextThreshold,
    nextTierName: next?.name ?? null,
    progress,
    remaining,
    color: themeToColor(current.badgeColor),
    icon: resolveCtvTierIcon(current.icon),
    iconKey: current.icon,
    progressHint,
    isMaxRank,
    commissionPercent: current.commissionPercent,
    rewardAmount: current.rewardAmount,
    rewardThreshold: current.rewardThreshold,
  };
}

export function formatCtvRevenueRangeLine(tier: CtvMembershipTierRecord, isFirst: boolean): string {
  const from = formatCtvRankMoney(tier.revenueFrom);
  const to = formatCtvRankMoney(tier.revenueTo);
  if (isFirst) return `${from} - ${to} / 30 ngày`;
  return `> ${formatCtvRankMoney(tier.revenueFrom)} - ${to} / 30 ngày`;
}

export function isCtvRevenueRewardAchieved(revenue: number, tier: CtvMembershipTierRecord): boolean {
  return Math.max(0, revenue) >= tier.rewardThreshold;
}

export type CtvRankCardRewardFocus = {
  tier: CtvMembershipTierRecord;
  achieved: boolean;
  granted: boolean;
  amountTextClass: string;
  progressPercent: number;
};

export function getCtvRankCardRewardFocus(
  totalRevenue: number,
  tiers: readonly CtvMembershipTierRecord[],
  grantedTierIds: ReadonlySet<string>,
): CtvRankCardRewardFocus | null {
  const revenue = Math.max(0, Number.isFinite(totalRevenue) ? totalRevenue : 0);
  const tier =
    resolveCtvMembershipTierForRevenue(revenue, tiers) ??
    tiers.find((t) => t.isActive) ??
    tiers[0];
  if (!tier) {
    return null;
  }
  const rank = getCtvRankFromTiers(revenue, tiers);
  const achieved = isCtvRevenueRewardAchieved(revenue, tier);
  const granted = grantedTierIds.has(tier.id);
  return {
    tier,
    achieved,
    granted,
    amountTextClass: tier.badgeColor.amountText,
    progressPercent: rank.progress,
  };
}
