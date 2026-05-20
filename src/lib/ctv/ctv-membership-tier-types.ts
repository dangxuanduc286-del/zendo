import type { LucideIcon } from "lucide-react";

/** Theme classes — lưu JSON trong `CtvMembershipTier.badgeColor`, chỉnh từ Admin. */
export type CtvMembershipTierTheme = {
  gradient: string;
  glow: string;
  progress: string;
  badge: string;
  iconBg: string;
  iconText: string;
  amountText: string;
};

export type CtvMembershipTierRecord = {
  id: string;
  code: string;
  name: string;
  revenueFrom: number;
  revenueTo: number;
  rewardThreshold: number;
  rewardAmount: number;
  commissionPercent: number;
  sortOrder: number;
  badgeColor: CtvMembershipTierTheme;
  icon: string;
  isActive: boolean;
};

export type CtvRankLevel = string;

export type CtvRankColorTokens = {
  gradient: string;
  glow: string;
  progress: string;
  badge: string;
  iconBg: string;
  iconText: string;
};

export type CtvRankResult = {
  tierId: string;
  code: string;
  name: string;
  level: CtvRankLevel;
  badge: string;
  revenueFrom: number;
  revenueTo: number;
  currentThreshold: number;
  nextThreshold: number | null;
  nextTierName: string | null;
  progress: number;
  remaining: number;
  color: CtvRankColorTokens;
  icon: LucideIcon;
  iconKey: string;
  progressHint: string;
  isMaxRank: boolean;
  commissionPercent: number;
  rewardAmount: number;
  rewardThreshold: number;
};

export const CTV_RANK_REVENUE_CAPTION =
  "Tổng doanh thu đơn thành công (đã thanh toán) — 30 ngày gần nhất";

export const CTV_REVENUE_WINDOW_DAYS = 30;
