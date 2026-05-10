import Pusher from "pusher";

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
