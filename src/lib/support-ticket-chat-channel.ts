/** Prefix Pusher private channel — phải khớp server trigger & client subscribe. */
export const SUPPORT_TICKET_CHAT_CHANNEL_PREFIX = "private-support-ticket-";

export function hasPusherClientConfig(): boolean {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
  return Boolean(key && cluster);
}

/** Private channel per ticket (chỉ chủ ticket được authorize). */
export function supportTicketChatChannelName(ticketId: string): string {
  return `${SUPPORT_TICKET_CHAT_CHANNEL_PREFIX}${ticketId.trim()}`;
}

export function ticketIdFromSupportTicketChatChannel(channelName: string): string | null {
  if (!channelName.startsWith(SUPPORT_TICKET_CHAT_CHANNEL_PREFIX)) return null;
  const id = channelName.slice(SUPPORT_TICKET_CHAT_CHANNEL_PREFIX.length).trim();
  return id || null;
}
