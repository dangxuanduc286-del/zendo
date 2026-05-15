import Pusher from "pusher";

import { SUPPORT_ADMIN_INBOX_CHANNEL_NAME } from "./support-ticket-admin-inbox-channel";
import { supportTicketChatChannelName } from "./support-ticket-chat-channel";

export type SupportTicketChatPushPayload = {
  id: string;
  body: string;
  fromAdmin: boolean;
  /** CUSTOMER | AFFILIATE | ADMIN — client có thể dùng thay vì suy từ fromAdmin. */
  senderRole?: string;
  createdAt: string;
  seenBy?: string[];
  /** Đồng bộ badge sau ghi DB (bắt buộc từ server, không tự +1 ở client). */
  adminUnreadCount?: number;
  customerUnreadCount?: number;
};

export type SupportTicketSeenUpdatePayload = {
  updates: Array<{ id: string; seenBy: string[] }>;
  customerUnreadCount: number;
  adminUnreadCount: number;
};

export type SupportTicketMessageDeletedPayload = {
  id: string;
  deletedAt: string;
  adminUnreadCount: number;
  customerUnreadCount: number;
};

export type SupportAdminInboxPayload = {
  totalAdminUnread: number;
  ticketId: string;
  messageId?: string;
  /** Rút gọn nội dung tin (popup / toast). */
  preview?: string;
  /** Tên hiển thị người gửi (khách / CTV). */
  customerName?: string;
  /** `adminUnreadCount` của ticket sau tin này — popup merge list không cần refetch. */
  ticketAdminUnread?: number;
  lastMessageAt?: string;
};

export type SupportTicketBlockStatePayload = {
  blocked: boolean;
  blockedAt?: string | null;
  blockReason?: string | null;
};

export function triggerSupportTicketMessageDeleted(
  ticketId: string,
  payload: SupportTicketMessageDeletedPayload,
): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "message-deleted", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportAdminInboxTicketMessageCreated(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.ticket.message.created", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportAdminInboxMessageDeleted(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.message.deleted", payload);
  } catch {
    // best-effort realtime
  }
}

/** Khách + admin đang subscribe kênh ticket — đóng / ẩn ticket khỏi danh sách active. */
export function triggerSupportTicketTicketArchived(ticketId: string): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "ticket-archived", { ticketId });
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportAdminInboxTicketArchived(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.ticket.archived", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportTicketTicketRestored(ticketId: string): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "ticket-restored", { ticketId });
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportAdminInboxTicketRestored(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.ticket.restored", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportTicketTicketBlockState(ticketId: string, payload: SupportTicketBlockStatePayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "ticket-block-state", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportAdminInboxTicketBlockUpdated(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.ticket.block.updated", payload);
  } catch {
    // best-effort realtime
  }
}

/** Đồng bộ badge sidebar khi tổng `adminUnread` thay đổi mà không có tin mới (vd. admin đã đọc). */
export function triggerSupportAdminInboxTotalsRefresh(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.inbox.totals", payload);
  } catch {
    // best-effort realtime
  }
}

let server: Pusher | null | undefined;

export function getPusherServer(): Pusher | null {
  if (server === null) return null;
  if (server !== undefined) return server;

  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) {
    server = null;
    return null;
  }

  server = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return server;
}

export function triggerSupportTicketNewMessage(
  ticketId: string,
  payload: SupportTicketChatPushPayload,
): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "new-message", payload);
  } catch {
    // best-effort realtime
  }
}

export function triggerSupportTicketSeenUpdate(
  ticketId: string,
  payload: SupportTicketSeenUpdatePayload,
): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportTicketChatChannelName(ticketId), "seen-update", payload);
  } catch {
    // best-effort realtime
  }
}
