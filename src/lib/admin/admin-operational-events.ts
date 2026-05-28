import "server-only";

import type { AdminActivityCategory, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ADMIN_STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]);

export type AdminActivityCategoryFilter = AdminActivityCategory | "ALL";

export const ADMIN_ACTIVITY_CATEGORY_LABELS: Record<AdminActivityCategory, string> = {
  CTV: "CTV",
  CUSTOMER: "Khách hàng",
  ORDER: "Đơn hàng",
  PAYMENT: "Thanh toán",
  WITHDRAWAL: "Rút tiền",
  PAYOUT_ACCOUNT: "TK nhận tiền",
  CTV_APPLICATION: "Đăng ký CTV",
  COMMISSION: "Hoa hồng",
  REWARD_POINTS: "Điểm thưởng",
  SUPPORT: "Hỗ trợ",
  SYSTEM: "Hệ thống",
};

export type PublishAdminOperationalEventInput = {
  category: AdminActivityCategory;
  eventType: string;
  title: string;
  summary: string;
  actorLabel?: string | null;
  actorCustomerId?: string | null;
  entity?: string | null;
  entityId?: string | null;
  actionHref: string;
  dedupeKey: string;
  metadata?: Record<string, unknown> | null;
  /** Tạo thông báo chuông admin (mặc định true). */
  notifyAdmin?: boolean;
};

export type AdminActivityFeedItem = {
  id: string;
  category: AdminActivityCategory;
  categoryLabel: string;
  eventType: string;
  title: string;
  summary: string;
  actorLabel: string | null;
  actorCustomerId: string | null;
  entity: string | null;
  entityId: string | null;
  actionHref: string;
  createdAt: string;
  hasUnreadNotification: boolean;
};

export type AdminNotificationListItem = {
  id: string;
  activityEventId: string;
  title: string;
  summary: string;
  category: AdminActivityCategory;
  categoryLabel: string;
  actorLabel: string | null;
  actionHref: string;
  createdAt: string;
  readAt: string | null;
};

function trimText(value: string, max: number): string {
  const s = value.trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function assertAdminStaffAccess(): Promise<{ adminId: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "";
  const adminId = session?.user?.id;
  if (!adminId || !ADMIN_STAFF_ROLES.has(role)) {
    throw new Error("UNAUTHORIZED");
  }
  return { adminId };
}

/**
 * Ghi lịch sử + (tuỳ chọn) thông báo admin. Không throw — an toàn gọi từ luồng nghiệp vụ.
 */
export async function publishAdminOperationalEventSafe(input: PublishAdminOperationalEventInput): Promise<void> {
  try {
    const dedupeKey = trimText(input.dedupeKey, 180);
    if (!dedupeKey) return;

    const existing = await db.adminActivityEvent.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) return;

    const notifyAdmin = input.notifyAdmin !== false;

    await db.$transaction(async (tx) => {
      const event = await tx.adminActivityEvent.create({
        data: {
          category: input.category,
          eventType: trimText(input.eventType, 80),
          title: trimText(input.title, 240),
          summary: trimText(input.summary, 8000),
          actorLabel: input.actorLabel ? trimText(input.actorLabel, 200) : null,
          actorCustomerId: input.actorCustomerId?.trim() || null,
          entity: input.entity ? trimText(input.entity, 80) : null,
          entityId: input.entityId ? trimText(input.entityId, 64) : null,
          actionHref: trimText(input.actionHref, 512),
          dedupeKey,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
        },
        select: { id: true },
      });

      if (notifyAdmin) {
        await tx.adminNotification.create({
          data: { activityEventId: event.id },
          select: { id: true },
        });
      }
    });
  } catch (e) {
    console.error("[admin-operational-event]", e);
  }
}

export async function listAdminActivityFeed(input: {
  category?: AdminActivityCategoryFilter;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminActivityFeedItem[]; total: number }> {
  await assertAdminStaffAccess();

  const limit = Math.min(100, Math.max(1, input.limit ?? 40));
  const offset = Math.max(0, input.offset ?? 0);
  const category = input.category && input.category !== "ALL" ? input.category : undefined;
  const where = category ? { category } : {};

  const [rows, total] = await Promise.all([
    db.adminActivityEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        category: true,
        eventType: true,
        title: true,
        summary: true,
        actorLabel: true,
        actorCustomerId: true,
        entity: true,
        entityId: true,
        actionHref: true,
        createdAt: true,
        notification: { select: { readAt: true } },
      },
    }),
    db.adminActivityEvent.count({ where }),
  ]);

  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      categoryLabel: ADMIN_ACTIVITY_CATEGORY_LABELS[r.category],
      eventType: r.eventType,
      title: r.title,
      summary: r.summary,
      actorLabel: r.actorLabel,
      actorCustomerId: r.actorCustomerId,
      entity: r.entity,
      entityId: r.entityId,
      actionHref: r.actionHref,
      createdAt: r.createdAt.toISOString(),
      hasUnreadNotification: Boolean(r.notification && !r.notification.readAt),
    })),
  };
}

export async function listAdminNotifications(input: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AdminNotificationListItem[]> {
  await assertAdminStaffAccess();

  const limit = Math.min(50, Math.max(1, input.limit ?? 20));

  const rows = await db.adminNotification.findMany({
    where: input.unreadOnly ? { readAt: null } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      readAt: true,
      createdAt: true,
      activityEvent: {
        select: {
          id: true,
          category: true,
          title: true,
          summary: true,
          actorLabel: true,
          actionHref: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    activityEventId: r.activityEvent.id,
    title: r.activityEvent.title,
    summary: r.activityEvent.summary,
    category: r.activityEvent.category,
    categoryLabel: ADMIN_ACTIVITY_CATEGORY_LABELS[r.activityEvent.category],
    actorLabel: r.activityEvent.actorLabel,
    actionHref: r.activityEvent.actionHref,
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));
}

export async function getAdminNotificationUnreadCount(): Promise<number> {
  await assertAdminStaffAccess();
  return db.adminNotification.count({ where: { readAt: null } });
}

export async function getAdminNotificationUnreadCountSafe(): Promise<number> {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role ?? "";
    if (!session?.user?.id || !ADMIN_STAFF_ROLES.has(role)) return 0;
    return await db.adminNotification.count({ where: { readAt: null } });
  } catch {
    return 0;
  }
}

export async function markAdminNotificationRead(notificationId: string, adminId: string): Promise<void> {
  await db.adminNotification.updateMany({
    where: { id: notificationId, readAt: null },
    data: { readAt: new Date(), readByAdminId: adminId },
  });
}

export async function markAllAdminNotificationsRead(adminId: string): Promise<number> {
  const r = await db.adminNotification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date(), readByAdminId: adminId },
  });
  return r.count;
}
