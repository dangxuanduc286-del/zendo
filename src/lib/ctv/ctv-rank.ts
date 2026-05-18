import type { LucideIcon } from "lucide-react";
import { Crown, Gem, Medal, Sparkles } from "lucide-react";

/** Mốc doanh thu đơn giới thiệu (VND) — đơn hoàn thành + đã thanh toán. */
export const CTV_RANK_THRESHOLDS = {
  bronze: 10_000_000,
  silver: 20_000_000,
  gold: 40_000_000,
  diamond: 100_000_000,
} as const;

export type CtvRankLevel = "none" | "bronze" | "silver" | "gold" | "diamond";

export type CtvRankColorTokens = {
  gradient: string;
  glow: string;
  progress: string;
  badge: string;
  iconBg: string;
  iconText: string;
};

export type CtvRankResult = {
  name: string;
  level: CtvRankLevel;
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
  remaining: number;
  color: CtvRankColorTokens;
  icon: LucideIcon;
  badge: string;
  progressHint: string;
  isMaxRank: boolean;
};

const RANK_COLORS: Record<CtvRankLevel, CtvRankColorTokens> = {
  none: {
    gradient: "from-slate-100 via-slate-50 to-white",
    glow: "shadow-slate-200/50",
    progress: "from-slate-400 to-slate-500",
    badge: "bg-slate-100 text-slate-700 ring-slate-200/80",
    iconBg: "from-slate-100 to-slate-200",
    iconText: "text-slate-600",
  },
  bronze: {
    gradient: "from-orange-50 via-amber-50/90 to-white",
    glow: "shadow-orange-200/40",
    progress: "from-amber-500 via-orange-500 to-orange-600",
    badge: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-950 ring-amber-200/80",
    iconBg: "from-amber-100 via-orange-100 to-amber-50",
    iconText: "text-amber-800",
  },
  silver: {
    gradient: "from-slate-100 via-zinc-50 to-white",
    glow: "shadow-slate-300/50",
    progress: "from-slate-400 via-zinc-400 to-slate-500",
    badge: "bg-gradient-to-br from-slate-100 to-zinc-200 text-slate-800 ring-slate-300/80",
    iconBg: "from-slate-200 via-zinc-100 to-white",
    iconText: "text-slate-700",
  },
  gold: {
    gradient: "from-yellow-50 via-amber-50/80 to-white",
    glow: "shadow-amber-200/45",
    progress: "from-yellow-400 via-amber-400 to-amber-500",
    badge: "bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-950 ring-amber-300/70",
    iconBg: "from-yellow-100 via-amber-100 to-yellow-50",
    iconText: "text-amber-900",
  },
  diamond: {
    gradient: "from-blue-50 via-sky-50/90 to-white",
    glow: "shadow-blue-300/45",
    progress: "from-blue-500 via-sky-500 to-indigo-500",
    badge: "bg-gradient-to-br from-blue-600 to-sky-500 text-white ring-blue-400/40 shadow-[0_4px_14px_rgba(37,99,235,0.35)]",
    iconBg: "from-blue-100 via-sky-100 to-indigo-50",
    iconText: "text-blue-700",
  },
};

const RANK_ICONS: Record<CtvRankLevel, LucideIcon> = {
  none: Sparkles,
  bronze: Medal,
  silver: Medal,
  gold: Crown,
  diamond: Gem,
};

const RANK_META: Array<{
  level: Exclude<CtvRankLevel, "none">;
  name: string;
  badge: string;
  threshold: number;
}> = [
  { level: "bronze", name: "CTV Đồng", badge: "Đồng", threshold: CTV_RANK_THRESHOLDS.bronze },
  { level: "silver", name: "CTV Bạc", badge: "Bạc", threshold: CTV_RANK_THRESHOLDS.silver },
  { level: "gold", name: "CTV Vàng", badge: "Vàng", threshold: CTV_RANK_THRESHOLDS.gold },
  { level: "diamond", name: "CTV Kim Cương", badge: "Kim Cương", threshold: CTV_RANK_THRESHOLDS.diamond },
];

/** Đơn tính vào doanh thu rank: hoàn thành (hoặc đã giao) + đã thanh toán. */
export function orderQualifiesForCtvRankRevenue(orderStatus: string, paymentStatus: string): boolean {
  const pay = paymentStatus.trim().toUpperCase();
  if (pay !== "PAID") return false;
  const status = orderStatus.trim().toUpperCase();
  return status === "COMPLETED" || status === "DELIVERED";
}

export function computeCtvRankRevenueFromOrders(
  orders: ReadonlyArray<{ orderStatus: string; paymentStatus: string; totalAmount: number }>,
): number {
  return orders.reduce((sum, order) => {
    if (!orderQualifiesForCtvRankRevenue(order.orderStatus, order.paymentStatus)) return sum;
    const amount = Number(order.totalAmount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getCtvRank(totalRevenue: number): CtvRankResult {
  const revenue = Math.max(0, Number.isFinite(totalRevenue) ? totalRevenue : 0);

  let level: CtvRankLevel = "none";
  let name = "Chưa đạt hạng";
  let badge = "Tân binh";
  let currentThreshold = 0;
  let nextThreshold: number | null = CTV_RANK_THRESHOLDS.bronze;

  if (revenue >= CTV_RANK_THRESHOLDS.diamond) {
    level = "diamond";
    const meta = RANK_META[3];
    name = meta.name;
    badge = meta.badge;
    currentThreshold = CTV_RANK_THRESHOLDS.diamond;
    nextThreshold = null;
  } else if (revenue >= CTV_RANK_THRESHOLDS.gold) {
    level = "gold";
    const meta = RANK_META[2];
    name = meta.name;
    badge = meta.badge;
    currentThreshold = CTV_RANK_THRESHOLDS.gold;
    nextThreshold = CTV_RANK_THRESHOLDS.diamond;
  } else if (revenue >= CTV_RANK_THRESHOLDS.silver) {
    level = "silver";
    const meta = RANK_META[1];
    name = meta.name;
    badge = meta.badge;
    currentThreshold = CTV_RANK_THRESHOLDS.silver;
    nextThreshold = CTV_RANK_THRESHOLDS.gold;
  } else if (revenue >= CTV_RANK_THRESHOLDS.bronze) {
    level = "bronze";
    const meta = RANK_META[0];
    name = meta.name;
    badge = meta.badge;
    currentThreshold = CTV_RANK_THRESHOLDS.bronze;
    nextThreshold = CTV_RANK_THRESHOLDS.silver;
  }

  const isMaxRank = nextThreshold == null;
  let progress = 0;
  let remaining = 0;
  let progressHint = "";

  if (isMaxRank) {
    progress = 100;
    remaining = 0;
    progressHint = "Đã đạt cấp cao nhất";
  } else if (nextThreshold != null) {
    const span = nextThreshold - currentThreshold;
    const inBand = revenue - currentThreshold;
    progress = span > 0 ? clampProgress((inBand / span) * 100) : 0;
    remaining = Math.max(0, nextThreshold - revenue);
    const nextName = RANK_META.find((m) => m.threshold === nextThreshold)?.name ?? "cấp tiếp theo";
    if (level === "none") {
      progressHint =
        remaining > 0
          ? `Còn thiếu ${formatVndShort(remaining)} để đạt ${RANK_META[0].name}`
          : `Sắp đạt ${RANK_META[0].name}`;
    } else {
      progressHint =
        remaining > 0
          ? `Còn thiếu ${formatVndShort(remaining)} để lên ${nextName}`
          : `Sắp lên ${nextName}`;
    }
  }

  return {
    name,
    level,
    currentThreshold,
    nextThreshold,
    progress,
    remaining,
    color: RANK_COLORS[level],
    icon: RANK_ICONS[level],
    badge,
    progressHint,
    isMaxRank,
  };
}

export function formatCtvRankMoney(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(amount)))}₫`;
}

function formatVndShort(amount: number): string {
  return formatCtvRankMoney(amount);
}
