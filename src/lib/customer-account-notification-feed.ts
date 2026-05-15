import type { CustomerAccountNotificationCategory } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const feedSelect = Prisma.validator<Prisma.CustomerAccountNotificationSelect>()({
  id: true,
  category: true,
  title: true,
  body: true,
  actionHref: true,
  readAt: true,
  createdAt: true,
  metadata: true,
});

export type CustomerAccountNotificationFeedRow = Prisma.CustomerAccountNotificationGetPayload<{
  select: typeof feedSelect;
}>;

const ALL_CATEGORIES: CustomerAccountNotificationCategory[] = ["ORDER", "COMMISSION", "PROMOTION", "SYSTEM"];

/**
 * Danh sách hiển thị hộp thông báo: tránh chỉ có COMMISSION trong `take` bản ghi mới nhất
 * trong khi `groupBy` unread vẫn có ORDER/PROMOTION/SYSTEM cũ hơn.
 *
 * Chiến lược: union (mỗi category tối đa `perCategoryCap`) + `take` bản ghi global mới nhất,
 * gộp theo id, sort `createdAt` desc, cắt `take`.
 */
export async function fetchCustomerAccountNotificationFeed(args: {
  customerId: string;
  take: number;
}): Promise<CustomerAccountNotificationFeedRow[]> {
  const customerId = args.customerId.trim();
  if (!customerId) return [];

  const cap = Math.min(80, Math.max(1, Math.floor(args.take)));
  const perCategoryCap = Math.min(40, Math.max(10, Math.ceil(cap / 2)));

  const [perCategoryBatches, globalBatch] = await Promise.all([
    Promise.all(
      ALL_CATEGORIES.map((category) =>
        db.customerAccountNotification.findMany({
          where: { customerId, category },
          orderBy: { createdAt: "desc" },
          take: perCategoryCap,
          select: feedSelect,
        }),
      ),
    ),
    db.customerAccountNotification.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: cap,
      select: feedSelect,
    }),
  ]);

  const byId = new Map<string, CustomerAccountNotificationFeedRow>();
  for (const row of perCategoryBatches.flat()) {
    byId.set(row.id, row);
  }
  for (const row of globalBatch) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, cap);
}
