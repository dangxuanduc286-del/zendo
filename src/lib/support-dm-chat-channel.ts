/** Prefix Pusher private channel — khớp server trigger & client subscribe (direct support chat). */
export const SUPPORT_DM_CHAT_CHANNEL_PREFIX = "private-support-dm-";

export { hasPusherClientConfig } from "./support-ticket-chat-channel";

export function supportDmChatChannelName(conversationId: string): string {
  return `${SUPPORT_DM_CHAT_CHANNEL_PREFIX}${conversationId.trim()}`;
}

export function conversationIdFromSupportDmChatChannel(channelName: string): string | null {
  if (!channelName.startsWith(SUPPORT_DM_CHAT_CHANNEL_PREFIX)) return null;
  const id = channelName.slice(SUPPORT_DM_CHAT_CHANNEL_PREFIX.length).trim();
  return id || null;
}
