import { db } from "@/lib/db";

const MAX_BULK_IDS = 200;

/** Xóa cứng theo danh sách id — một câu lệnh deleteMany. */
export async function hardDeleteCustomerNotificationsByIds(customerId: string, rawIds: string[]): Promise<number> {
  const ids = [...new Set(rawIds.map((x) => x.trim()).filter(Boolean))].slice(0, MAX_BULK_IDS);
  if (!ids.length) return 0;
  const r = await db.customerAccountNotification.deleteMany({
    where: { customerId, id: { in: ids } },
  });
  return r.count;
}

export async function hardDeleteCustomerNotificationById(customerId: string, rawId: string): Promise<boolean> {
  const id = rawId.trim();
  if (!id) return false;
  const r = await db.customerAccountNotification.deleteMany({
    where: { customerId, id },
  });
  return r.count > 0;
}

export async function hardDeleteAllCustomerNotifications(customerId: string): Promise<number> {
  const r = await db.customerAccountNotification.deleteMany({
    where: { customerId },
  });
  return r.count;
}

/** Chỉ bản ghi đã đọc (readAt khác null). */
export async function hardDeleteReadCustomerNotifications(customerId: string): Promise<number> {
  const r = await db.customerAccountNotification.deleteMany({
    where: { customerId, readAt: { not: null } },
  });
  return r.count;
}
