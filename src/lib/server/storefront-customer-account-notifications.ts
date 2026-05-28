import "server-only";

import { memoizeArgsPerRequest } from "@/lib/runtime/request-cache";
import { AFFILIATE_DB_QUERY_CONCURRENCY, runQueriesInChunks } from "@/lib/server/run-queries-in-chunks";

export type StorefrontCustomerAccountNotifications = {
  unread: number;
  groups: { order: number; promotion: number; system: number; commission: number };
  items: Array<{
    id: string;
    category: "order" | "promotion" | "system" | "commission";
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    actionHref: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

async function getStorefrontCustomerAccountNotificationsInternal(
  userId: string,
): Promise<StorefrontCustomerAccountNotifications> {
  const { db } = await import("@/lib/db");

  const [unreadTotal, unreadByCategory, notifRows] = await runQueriesInChunks(
    [
      () => db.customerAccountNotification.count({ where: { customerId: userId, readAt: null } }),
      () =>
        db.customerAccountNotification.groupBy({
          by: ["category"],
          where: { customerId: userId, readAt: null },
          _count: { _all: true },
        }),
      () =>
        db.customerAccountNotification.findMany({
          where: { customerId: userId },
          orderBy: { createdAt: "desc" },
          take: 60,
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
    ] as const,
    AFFILIATE_DB_QUERY_CONCURRENCY,
  );

  const groups = { order: 0, promotion: 0, system: 0, commission: 0 };
  for (const row of unreadByCategory) {
    const n = row._count._all;
    if (row.category === "ORDER") groups.order += n;
    else if (row.category === "PROMOTION") groups.promotion += n;
    else if (row.category === "COMMISSION") groups.commission += n;
    else groups.system += n;
  }

  return {
    unread: unreadTotal,
    groups,
    items: notifRows.map((r) => ({
      id: r.id,
      category:
        r.category === "ORDER"
          ? ("order" as const)
          : r.category === "PROMOTION"
            ? ("promotion" as const)
            : r.category === "COMMISSION"
              ? ("commission" as const)
              : ("system" as const),
      title: r.title,
      body: r.body,
      read: r.readAt != null,
      createdAt: r.createdAt.toISOString(),
      actionHref: r.actionHref,
      metadata:
        r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : null,
    })),
  };
}

export const getStorefrontCustomerAccountNotifications = memoizeArgsPerRequest(
  getStorefrontCustomerAccountNotificationsInternal,
);
