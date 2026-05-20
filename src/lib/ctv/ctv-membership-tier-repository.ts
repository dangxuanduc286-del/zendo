import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { CtvMembershipTierRecord, CtvMembershipTierTheme } from "./ctv-membership-tier-types";

const CACHE_TAG = "ctv-membership-tiers";

function money(n: unknown): number {
  const v = typeof n === "object" && n != null && "toNumber" in n ? Number((n as { toNumber: () => number }).toNumber()) : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

function parseTheme(raw: string): CtvMembershipTierTheme {
  try {
    const parsed = JSON.parse(raw) as Partial<CtvMembershipTierTheme>;
    return {
      gradient: parsed.gradient ?? "from-slate-100 via-slate-50 to-white",
      glow: parsed.glow ?? "shadow-slate-200/50",
      progress: parsed.progress ?? "from-slate-400 to-slate-500",
      badge: parsed.badge ?? "bg-slate-100 text-slate-700 ring-slate-200/80",
      iconBg: parsed.iconBg ?? "from-slate-100 to-slate-200",
      iconText: parsed.iconText ?? "text-slate-600",
      amountText: parsed.amountText ?? "text-slate-700",
    };
  } catch {
    return {
      gradient: "from-slate-100 via-slate-50 to-white",
      glow: "shadow-slate-200/50",
      progress: "from-slate-400 to-slate-500",
      badge: "bg-slate-100 text-slate-700 ring-slate-200/80",
      iconBg: "from-slate-100 to-slate-200",
      iconText: "text-slate-600",
      amountText: "text-slate-700",
    };
  }
}

function mapRow(row: {
  id: string;
  code: string;
  name: string;
  revenueFrom: unknown;
  revenueTo: unknown;
  rewardThreshold: unknown;
  rewardAmount: unknown;
  commissionPercent: unknown;
  sortOrder: number;
  badgeColor: string;
  icon: string;
  isActive: boolean;
}): CtvMembershipTierRecord {
  const theme = parseTheme(row.badgeColor);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    revenueFrom: money(row.revenueFrom),
    revenueTo: money(row.revenueTo),
    rewardThreshold: money(row.rewardThreshold),
    rewardAmount: money(row.rewardAmount),
    commissionPercent: Number(row.commissionPercent),
    sortOrder: row.sortOrder,
    badgeColor: theme,
    icon: row.icon,
    isActive: row.isActive,
  };
}

export async function fetchCtvMembershipTiersFromDb(activeOnly = true): Promise<CtvMembershipTierRecord[]> {
  const rows = await db.ctvMembershipTier.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapRow);
}

export const getCachedCtvMembershipTiers = unstable_cache(
  async () => fetchCtvMembershipTiersFromDb(true),
  ["ctv-membership-tiers-active"],
  { revalidate: 60, tags: [CACHE_TAG] },
);

export { CACHE_TAG as CTV_MEMBERSHIP_TIERS_CACHE_TAG };
