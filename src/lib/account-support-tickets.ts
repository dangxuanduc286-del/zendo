import type {
  SupportTicketSenderRole,
  SupportTicketStatus,
  SupportTicketType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import {
  customerSupportTicketApiSelect,
  type CustomerSupportTicketApiPayload,
} from "./support-ticket-api-serializers";
import { pickRoundRobinSupportAssigneeId } from "./support-ticket-assign";
import { ACTIVE_GENERAL_DEFAULT_STATUSES } from "./support-ticket-status";
import { inferSupportTicketTags } from "./support-ticket-tags";
import {
  getSupportAutoReplySenderAdminId,
  lockSupportTicketRowForUpdate,
  resolveSupportTicketAutoReplyBody,
} from "./support-ticket-auto-reply";

const MAX_SUBJECT_LEN = 300;
const MAX_BODY_LEN = 12_000;

const TICKET_TYPES = new Set<SupportTicketType>([
  "GENERAL",
  "ORDER",
  "WARRANTY",
  "RETURN",
  "AFFILIATE",
  "WITHDRAWAL",
  "AFFILIATE_APPLICATION",
]);

export function parseSupportTicketType(raw: unknown): SupportTicketType | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim() as SupportTicketType;
  return TICKET_TYPES.has(t) ? t : null;
}

export function clampTicketSubject(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  return s.slice(0, MAX_SUBJECT_LEN);
}

export function clampTicketBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  return s.slice(0, MAX_BODY_LEN);
}

async function resolveSenderRole(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<SupportTicketSenderRole> {
  const prof = await tx.affiliateProfile.findFirst({
    where: { customerId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  return prof ? "AFFILIATE" : "CUSTOMER";
}

export type SupportTicketMessageRow = {
  id: string;
  body: string;
  senderRole: SupportTicketSenderRole;
  senderAdminId: string | null;
  senderCustomerId: string | null;
  createdAt: Date;
  seenBy: string[];
};

/**
 * Toàn bộ tin của ticket, chỉ lọc theo `ticketId` — **không** lọc `senderRole`
 * (CUSTOMER, AFFILIATE, ADMIN đều trả về; tránh sót tin CTV).
 */
export async function listAllSupportTicketMessagesForTicketId(ticketId: string): Promise<SupportTicketMessageRow[]> {
  const { db } = await import("./db");
  const tid = ticketId.trim();
  if (!tid) return [];
  return db.supportTicketMessage.findMany({
    where: { ticketId: tid },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      senderRole: true,
      senderAdminId: true,
      senderCustomerId: true,
      createdAt: true,
      seenBy: true,
    },
  });
}

async function assertOptionalOrderId(
  tx: Prisma.TransactionClient,
  customerId: string,
  orderId: string | null | undefined,
): Promise<string | null> {
  if (orderId == null || String(orderId).trim() === "") return null;
  const id = String(orderId).trim();
  const row = await tx.order.findFirst({
    where: { id, customerId },
    select: { id: true },
  });
  if (!row) throw new Error("ORDER_INVALID");
  return id;
}

async function assertOptionalAffiliateApplicationId(
  tx: Prisma.TransactionClient,
  customerId: string,
  applicationId: string | null | undefined,
): Promise<string | null> {
  if (applicationId == null || String(applicationId).trim() === "") return null;
  const id = String(applicationId).trim();
  const row = await tx.affiliateApplication.findFirst({
    where: { id, customerId },
    select: { id: true },
  });
  if (!row) throw new Error("APPLICATION_INVALID");
  return id;
}

export type CreateSupportTicketInput = {
  subject: string;
  type: SupportTicketType;
  body: string;
  orderId?: string | null;
  affiliateApplicationId?: string | null;
};

/** Mặc định kênh chat storefront — đồng bộ với `ensureDefaultGeneralSupportTicketForCustomer`. */
export const STOREFRONT_DEFAULT_CHAT_SUBJECT = "Liên hệ hỗ trợ";
export const STOREFRONT_DEFAULT_CHAT_BODY = "Xin chào, tôi cần hỗ trợ qua kênh chat.";

/**
 * Một ticket GENERAL “chat mặc định” (không gắn đơn / hồ sơ CTV) cho mỗi khách.
 * Idempotent + chống race (unique partial index + bắt P2002 rồi đọc lại).
 */
export async function ensureDefaultGeneralSupportTicketForCustomer(customerId: string): Promise<{ id: string }> {
  const { db } = await import("./db");
  const now = new Date();

  const findActiveDefault = (tx: Prisma.TransactionClient) =>
    tx.supportTicket.findFirst({
      where: {
        customerId,
        type: "GENERAL",
        status: { in: [...ACTIVE_GENERAL_DEFAULT_STATUSES] },
        orderId: null,
        affiliateApplicationId: null,
      },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });

  try {
    return await db.$transaction(async (tx) => {
      const existing = await findActiveDefault(tx);
      if (existing) {
        return existing;
      }

      let senderRole: SupportTicketSenderRole = "CUSTOMER";
      try {
        senderRole = await resolveSenderRole(tx, customerId);
      } catch {
        senderRole = "CUSTOMER";
      }

      let assignId: string | null = null;
      try {
        assignId = await pickRoundRobinSupportAssigneeId(tx);
      } catch {
        assignId = null;
      }

      const tags = inferSupportTicketTags({
        subject: STOREFRONT_DEFAULT_CHAT_SUBJECT,
        body: STOREFRONT_DEFAULT_CHAT_BODY,
        type: "GENERAL",
      });

      try {
        const created = await tx.supportTicket.create({
          data: {
            customerId,
            subject: STOREFRONT_DEFAULT_CHAT_SUBJECT,
            type: "GENERAL",
            status: "OPEN",
            orderId: null,
            affiliateApplicationId: null,
            lastMessageAt: now,
            customerUnreadCount: 0,
            adminUnreadCount: 1,
            tags,
            assignedAdminId: assignId ?? undefined,
            messages: {
              create: {
                senderCustomerId: customerId,
                senderRole,
                body: STOREFRONT_DEFAULT_CHAT_BODY,
              },
            },
          },
          select: { id: true },
        });
        return created;
      } catch (e) {
        const err = e as { code?: unknown; name?: unknown; message?: unknown } | null;
        void (typeof err?.code === "string" ? err.code : null);
        void (typeof err?.name === "string" ? err.name : null);
        void (typeof err?.message === "string" ? err.message : null);
        const prismaMeta =
          e instanceof Prisma.PrismaClientKnownRequestError
            ? (e.meta as Record<string, unknown> | undefined)
            : undefined;
        void prismaMeta;
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const again = await findActiveDefault(tx);
          if (again) return again;
        }
        throw e;
      }
    });
  } catch (error) {
    console.error("ensureDefault crash:", error);
    const fallback = await db.supportTicket.findFirst({
      where: { customerId },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });
    if (fallback) return fallback;
    throw error;
  }
}

/** Tổng `customerUnreadCount` của mọi ticket thuộc khách (không nhận id từ client ngoài session). */
export async function getSupportTicketUnreadTotalForCustomer(customerId: string): Promise<number> {
  const { db } = await import("./db");
  const agg = await db.supportTicket.aggregate({
    where: { customerId },
    _sum: { customerUnreadCount: true },
  });
  const n = agg._sum.customerUnreadCount ?? 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function listSupportTicketsForCustomer(
  customerId: string,
): Promise<CustomerSupportTicketApiPayload[]> {
  try {
    const { db } = await import("./db");
    const tickets = await db.supportTicket.findMany({
      where: { customerId },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: customerSupportTicketApiSelect,
    });
    return Array.isArray(tickets) ? tickets : [];
  } catch (error) {
    const e = error as { name?: unknown; code?: unknown; message?: unknown } | null;
    const name = typeof e?.name === "string" ? e.name : null;
    const code = typeof e?.code === "string" ? e.code : null;
    const message = typeof e?.message === "string" ? e.message : "LIST_TICKETS_FAILED";
    console.error("LIST TICKETS ERROR:", { name, code, message });
    return [];
  }
}

export async function getSupportTicketDetailForCustomer(
  customerId: string,
  ticketId: string,
): Promise<{
  ticket: CustomerSupportTicketApiPayload;
  messages: Array<{
    id: string;
    body: string;
    senderRole: SupportTicketSenderRole;
    fromAdmin: boolean;
    createdAt: Date;
    seenBy: string[];
  }>;
} | null> {
  const { db } = await import("./db");
  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, customerId },
    select: customerSupportTicketApiSelect,
  });
  if (!ticket) return null;

  const ticketMessages = await listAllSupportTicketMessagesForTicketId(ticket.id);
  const messages = ticketMessages.map((m) => ({
    id: m.id,
    body: m.body,
    senderRole: m.senderRole,
    fromAdmin: Boolean(m.senderAdminId),
    createdAt: m.createdAt,
    seenBy: m.seenBy,
  }));

  return { ticket, messages };
}

export async function createSupportTicketForCustomer(
  customerId: string,
  input: CreateSupportTicketInput,
): Promise<{ id: string }> {
  const { db } = await import("./db");
  const now = new Date();

  return db.$transaction(async (tx) => {
    const orderId = await assertOptionalOrderId(tx, customerId, input.orderId);
    const affiliateApplicationId = await assertOptionalAffiliateApplicationId(
      tx,
      customerId,
      input.affiliateApplicationId,
    );
    const senderRole = await resolveSenderRole(tx, customerId);
    const assignId = await pickRoundRobinSupportAssigneeId(tx);
    const tags = inferSupportTicketTags({
      subject: input.subject,
      body: input.body,
      type: input.type,
    });

    const created = await tx.supportTicket.create({
      data: {
        customerId,
        subject: input.subject,
        type: input.type,
        status: "OPEN",
        orderId,
        affiliateApplicationId,
        lastMessageAt: now,
        customerUnreadCount: 0,
        adminUnreadCount: 1,
        tags,
        assignedAdminId: assignId,
        messages: {
          create: {
            senderCustomerId: customerId,
            senderRole,
            body: input.body,
          },
        },
      },
      select: { id: true },
    });
    return created;
  });
}

export type PostedCustomerSupportMessageResult = {
  id: string;
  adminUnreadCount: number;
  customerUnreadCount: number;
  autoReply: null | {
    id: string;
    body: string;
    createdAt: Date;
    seenBy: string[];
    adminUnreadCount: number;
    customerUnreadCount: number;
  };
};

export async function postSupportTicketMessageForCustomer(
  customerId: string,
  ticketId: string,
  body: string,
): Promise<PostedCustomerSupportMessageResult | null> {
  const { db } = await import("./db");
  const now = new Date();

  return db.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findFirst({
      where: { id: ticketId, customerId },
      select: { id: true, status: true },
    });
    if (!ticket) return null;
    if (ticket.status === "CLOSED") throw new Error("TICKET_CLOSED");

    await lockSupportTicketRowForUpdate(tx, ticket.id);

    const ticketLocked = await tx.supportTicket.findFirst({
      where: { id: ticket.id, customerId },
      select: { id: true, status: true, autoReplySentAt: true },
    });
    if (!ticketLocked) return null;
    if (ticketLocked.status === "CLOSED") throw new Error("TICKET_CLOSED");

    const senderRole = await resolveSenderRole(tx, customerId);
    const nextStatus: SupportTicketStatus = "OPEN";

    const msg = await tx.supportTicketMessage.create({
      data: {
        ticketId: ticketLocked.id,
        senderCustomerId: customerId,
        senderRole,
        body,
      },
      select: { id: true },
    });

    await tx.supportTicket.update({
      where: { id: ticketLocked.id },
      data: {
        lastMessageAt: now,
        adminUnreadCount: { increment: 1 },
        status: nextStatus,
      },
    });

    const counts = await tx.supportTicket.findUnique({
      where: { id: ticketLocked.id },
      select: { adminUnreadCount: true, customerUnreadCount: true },
    });

    let autoReply: PostedCustomerSupportMessageResult["autoReply"] = null;

    const mayAuto =
      ticketLocked.autoReplySentAt == null &&
      (senderRole === "CUSTOMER" || senderRole === "AFFILIATE");

    if (mayAuto) {
      const priorBot = await tx.supportTicketMessage.findFirst({
        where: { ticketId: ticketLocked.id, isAutoReply: true },
        select: { id: true },
      });
      if (!priorBot) {
        const replyBody = resolveSupportTicketAutoReplyBody(body);
        const botId = await getSupportAutoReplySenderAdminId(tx);
        if (botId) {
          const botMsg = await tx.supportTicketMessage.create({
            data: {
              ticketId: ticketLocked.id,
              senderAdminId: botId,
              senderRole: "ADMIN",
              body: replyBody,
              isAutoReply: true,
            },
            select: { id: true, createdAt: true, seenBy: true },
          });
          const nowBot = new Date();
          await tx.supportTicket.update({
            where: { id: ticketLocked.id },
            data: {
              lastMessageAt: nowBot,
              customerUnreadCount: { increment: 1 },
              autoReplySentAt: nowBot,
              status: "OPEN",
            },
          });
          const countsBot = await tx.supportTicket.findUnique({
            where: { id: ticketLocked.id },
            select: { adminUnreadCount: true, customerUnreadCount: true },
          });
          autoReply = {
            id: botMsg.id,
            body: replyBody,
            createdAt: botMsg.createdAt,
            seenBy: botMsg.seenBy,
            adminUnreadCount: countsBot?.adminUnreadCount ?? 0,
            customerUnreadCount: countsBot?.customerUnreadCount ?? 0,
          };
        }
      }
    }

    return {
      id: msg.id,
      adminUnreadCount: counts?.adminUnreadCount ?? 0,
      customerUnreadCount: counts?.customerUnreadCount ?? 0,
      autoReply,
    };
  });
}
