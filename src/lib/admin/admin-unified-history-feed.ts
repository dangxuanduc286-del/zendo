import "server-only";

import { getCtvNotificationList } from "@/lib/admin/ctv-notifications-admin";
import { getCtvRevenueRewardAuditList } from "@/lib/admin/ctv-revenue-reward-audit";
import { getCtvTierHistoryList } from "@/lib/admin/ctv-tier-history-admin";
import {
  ADMIN_ACTIVITY_CATEGORY_LABELS,
  listAdminActivityFeed,
  type AdminActivityCategoryFilter,
} from "@/lib/admin/admin-operational-events";

export type UnifiedHistoryScope =
  | "ALL"
  | "REVENUE_REWARD"
  | "TIER"
  | "NOTIFICATION"
  | AdminActivityCategoryFilter;

export type UnifiedHistoryTimelineItem = {
  id: string;
  source: "operational" | "revenue_audit" | "tier_history" | "notification";
  categoryLabel: string;
  summary: string;
  actorLabel: string | null;
  createdAt: string;
  actionHref: string | null;
};

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(n)}₫`;
}

export async function listUnifiedHistoryTimeline(scope: UnifiedHistoryScope): Promise<{
  items: UnifiedHistoryTimelineItem[];
  total: number;
}> {
  if (scope !== "ALL") {
    return { items: [], total: 0 };
  }

  const perSource = 30;

  const [operational, revenue, tier, notifications] = await Promise.all([
    listAdminActivityFeed({ category: "ALL", limit: perSource, offset: 0 }),
    getCtvRevenueRewardAuditList({ limit: perSource }),
    getCtvTierHistoryList({ limit: perSource }),
    getCtvNotificationList({ limit: perSource }),
  ]);

  const merged: UnifiedHistoryTimelineItem[] = [
    ...operational.items.map((r) => ({
      id: `op:${r.id}`,
      source: "operational" as const,
      categoryLabel: r.categoryLabel,
      summary: r.summary,
      actorLabel: r.actorLabel,
      createdAt: r.createdAt,
      actionHref: r.actionHref,
    })),
    ...revenue.rows.map((r) => ({
      id: `rr:${r.id}`,
      source: "revenue_audit" as const,
      categoryLabel: "Thưởng doanh thu",
      summary: `${r.affiliateDisplayName} nhận thưởng ${formatVnd(r.rewardAmount)} (${r.tierName})`,
      actorLabel: r.affiliateDisplayName,
      createdAt: r.receivedAt.toISOString(),
      actionHref: `/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(r.refCode)}`,
    })),
    ...tier.rows.map((r) => ({
      id: `th:${r.id}`,
      source: "tier_history" as const,
      categoryLabel: "Lịch sử cấp",
      summary: `${r.affiliateDisplayName}: ${r.fromTierName ?? "—"} → ${r.toTierName} (DT ${formatVnd(r.revenue)})`,
      actorLabel: r.affiliateDisplayName,
      createdAt: r.createdAt.toISOString(),
      actionHref: `/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(r.refCode)}`,
    })),
    ...notifications.rows.map((r) => ({
      id: `nt:${r.id}`,
      source: "notification" as const,
      categoryLabel: "Thông báo",
      summary: r.title,
      actorLabel: r.customerLabel,
      createdAt: r.createdAt.toISOString(),
      actionHref: null,
    })),
  ];

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { items: merged.slice(0, 80), total: merged.length };
}

export function isOperationalHistoryScope(
  scope: UnifiedHistoryScope,
): scope is AdminActivityCategoryFilter {
  return (
    scope !== "ALL" &&
    scope !== "REVENUE_REWARD" &&
    scope !== "TIER" &&
    scope !== "NOTIFICATION"
  );
}

export { ADMIN_ACTIVITY_CATEGORY_LABELS };
