import { SUPPORT_ADMIN_INBOX_CHANNEL_NAME } from "./support-ticket-admin-inbox-channel";
import { supportDmChatChannelName } from "./support-dm-chat-channel";
import { getPusherServer, type SupportAdminInboxPayload } from "./support-ticket-pusher";

export type SupportDmChatPushPayload = {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
  senderType: string;
  adminUnreadCount?: number;
  customerUnreadCount?: number;
};

export type SupportDmSeenUpdatePayload = {
  customerUnreadCount: number;
  adminUnreadCount: number;
};

export function triggerSupportDmNewMessage(conversationId: string, payload: SupportDmChatPushPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportDmChatChannelName(conversationId), "new-message", payload);
  } catch {
    /* best-effort realtime */
  }
}

export function triggerSupportDmSeenUpdate(conversationId: string, payload: SupportDmSeenUpdatePayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(supportDmChatChannelName(conversationId), "seen-update", payload);
  } catch {
    /* best-effort realtime */
  }
}

/** Dùng `ticketId` trong payload = conversationId để tương thích badge/admin inbox hiện có. */
export function triggerSupportDmAdminInboxMessageCreated(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.dm.message.created", payload);
  } catch {
    /* best-effort realtime */
  }
}

export function triggerSupportDmAdminInboxTotals(payload: SupportAdminInboxPayload): void {
  const client = getPusherServer();
  if (!client) return;
  try {
    void client.trigger(SUPPORT_ADMIN_INBOX_CHANNEL_NAME, "support.dm.inbox.totals", payload);
  } catch {
    /* best-effort realtime */
  }
}
