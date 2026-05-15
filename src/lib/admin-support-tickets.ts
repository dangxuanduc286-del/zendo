import type { Prisma, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

import { ADMIN_SUPPORT_TICKET_ROLES, isAdminSupportTicketRole } from "./admin-support-ticket-roles";
import { supportTicketNotArchivedWhere } from "./support-ticket-archive";

export { ADMIN_SUPPORT_TICKET_ROLES, isAdminSupportTicketRole };

export type AdminSupportTicketListFilter =
  | "all"
  | "unread"
  | "open"
  | "pending"
  | "waiting_admin"
  | "waiting_user"
  | "answered"
  | "resolved"
  | "closed"
  | "customer"
  | "affiliate";

const STATUS_FILTERS: Record<string, SupportTicketStatus> = {
  open: "OPEN",
  /** Alias “pending” = hàng chờ admin xử lý */
  pending: "WAITING_ADMIN",
  waiting_admin: "WAITING_ADMIN",
  waiting_user: "WAITING_USER",
  answered: "RESOLVED",
  resolved: "RESOLVED",
  closed: "CLOSED",
};

export function parseAdminSupportTicketListFilter(raw: string | null): AdminSupportTicketListFilter {
  const v = (raw ?? "all").trim().toLowerCase();
  const allowed: AdminSupportTicketListFilter[] = [
    "all",
    "unread",
    "open",
    "pending",
    "waiting_admin",
    "waiting_user",
    "answered",
    "resolved",
    "closed",
    "customer",
    "affiliate",
  ];
  return (allowed as string[]).includes(v) ? (v as AdminSupportTicketListFilter) : "all";
}

const ADMIN_TAG_FILTER = new Set(["support", "payment", "bug", "affiliate"]);

export function parseAdminSupportTicketListTag(raw: string | null): string | null {
  const t = (raw ?? "").trim().toLowerCase();
  return ADMIN_TAG_FILTER.has(t) ? t : null;
}

export function buildAdminSupportTicketWhere(
  filter: AdminSupportTicketListFilter,
  tag?: string | null,
): Prisma.SupportTicketWhereInput {
  let base: Prisma.SupportTicketWhereInput = {};
  if (filter === "all") base = {};
  else if (filter === "unread") base = { adminUnreadCount: { gt: 0 } };
  else if (filter === "customer") {
    base = {
      customer: {
        affiliateProfiles: { none: { status: "ACTIVE" } },
      },
    };
  } else if (filter === "affiliate") {
    base = {
      customer: {
        affiliateProfiles: { some: { status: "ACTIVE" } },
      },
    };
  } else {
    const st = STATUS_FILTERS[filter];
    if (st) base = { status: st };
  }

  const t = parseAdminSupportTicketListTag(tag ?? null);
  let merged: Prisma.SupportTicketWhereInput;
  if (!t) merged = base;
  else if (!base || Object.keys(base).length === 0) merged = { tags: { has: t } };
  else merged = { AND: [base, { tags: { has: t } }] };

  if (!merged || Object.keys(merged).length === 0) {
    return { ...supportTicketNotArchivedWhere };
  }
  return { AND: [supportTicketNotArchivedWhere, merged] };
}

export function parseSupportTicketStatus(raw: unknown): SupportTicketStatus | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (
    s === "OPEN" ||
    s === "PENDING" ||
    s === "WAITING_ADMIN" ||
    s === "WAITING_USER" ||
    s === "RESOLVED" ||
    s === "CLOSED"
  )
    return s as SupportTicketStatus;
  if (s === "ANSWERED") return "RESOLVED";
  return null;
}

const MAX_SUPPORT_TICKET_TAGS = 50;
const MAX_SUPPORT_TICKET_TAG_LEN = 48;

export function parseSupportTicketPriority(raw: unknown): SupportTicketPriority | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (s === "LOW" || s === "MEDIUM" || s === "HIGH") return s;
  return null;
}

/** Chuẩn hóa tags từ PATCH; mảng rỗng = xóa hết tag. */
export function parseSupportTicketTags(
  raw: unknown,
): { ok: true; tags: string[] } | { ok: false; message: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, message: "tags phải là mảng chuỗi." };
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return { ok: false, message: "Mỗi tag phải là chuỗi." };
    }
    const t = item.trim().slice(0, MAX_SUPPORT_TICKET_TAG_LEN);
    if (t) out.push(t);
  }
  if (out.length > MAX_SUPPORT_TICKET_TAGS) {
    return { ok: false, message: `Tối đa ${MAX_SUPPORT_TICKET_TAGS} tag.` };
  }
  return { ok: true, tags: out };
}

const MAX_SUPPORT_TICKET_BLOCK_REASON = 2000;

/** Lý do chặn từ PATCH `blockReason` — chuỗi rỗng coi như không gửi (null). */
export function parseSupportTicketBlockReason(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  return s.slice(0, MAX_SUPPORT_TICKET_BLOCK_REASON);
}

async function assertAdminSupportLayoutSession(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
}

/**
 * Tổng `adminUnreadCount` trên mọi ticket (số tin phía admin chưa đọc, không phải số ticket).
 * Chỉ gọi khi session là quản trị; không có quyền / lỗi → ném lỗi (để Safe bọc trả 0).
 */
/** Tổng `adminUnreadCount` (server-side, không cần session) — dùng Pusher inbox / API badge. */
export async function getAdminSupportTicketUnreadTotalDb(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const { db } = await import("./db");
  const agg = await db.supportTicket.aggregate({
    where: { ...supportTicketNotArchivedWhere },
    _sum: { adminUnreadCount: true },
  });
  const n = agg._sum.adminUnreadCount ?? 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function getAdminSupportTicketUnreadCount(): Promise<number> {
  await assertAdminSupportLayoutSession();
  return getAdminSupportTicketUnreadTotalDb();
}

/** Sidebar / layout: mọi lỗi (quyền, DB, schema, bảng chưa tồn tại) → 0, không làm sập admin. */
export async function getAdminSupportTicketUnreadCountSafe(): Promise<number> {
  try {
    return await getAdminSupportTicketUnreadCount();
  } catch {
    return 0;
  }
}
