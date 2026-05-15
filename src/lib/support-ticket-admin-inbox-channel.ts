/** Kênh Pusher private — mọi admin support subscribe để badge unread realtime. */
export const SUPPORT_ADMIN_INBOX_CHANNEL_NAME = "private-support-admin-inbox";

export function isSupportAdminInboxChannel(channelName: string): boolean {
  return channelName.trim() === SUPPORT_ADMIN_INBOX_CHANNEL_NAME;
}
