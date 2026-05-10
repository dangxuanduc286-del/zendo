import type { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "./auth";

const ADMIN_STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"]);

export function isAdminStaffRole(role?: string | null): boolean {
  return ADMIN_STAFF_ROLES.has(role ?? "");
}

async function getDbClient(): Promise<PrismaClient | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    return dbModule.db;
  } catch {
    return null;
  }
}

/**
 * Số đơn chờ admin xử lý (đơn mới / chưa xác nhận — `OrderStatus.PENDING`).
 * Trả về `null` nếu session không phải tài khoản quản trị.
 */
export async function getAdminOrdersUnreadCountForSession(session: Session | null): Promise<number | null> {
  if (!session?.user?.id || !isAdminStaffRole(session.user.role)) {
    return null;
  }

  const db = await getDbClient();
  if (!db) {
    return 0;
  }

  return db.order.count({
    where: { orderStatus: "PENDING" },
  });
}

/** Sidebar layout: không văng app khi DB/session lệch — trả 0 khi không hợp lệ hoặc lỗi. */
export async function getAdminOrdersUnreadCountForAdminLayoutSafe(): Promise<number> {
  try {
    const session = await getServerSession(authOptions);
    const count = await getAdminOrdersUnreadCountForSession(session);
    return count ?? 0;
  } catch {
    return 0;
  }
}
