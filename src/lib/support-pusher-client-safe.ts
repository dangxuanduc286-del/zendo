import Pusher from "pusher-js";

/** Kết nối còn dùng được cho subscribe / unsubscribe (tránh WebSocket đã đóng). */
export function pusherConnectionActiveForOps(conn: { state: string }): boolean {
  const s = conn.state;
  return s === "connected" || s === "connecting" || s === "unavailable";
}

export function safePusherUnsubscribe(pusher: Pusher, channelName: string): void {
  try {
    if (!pusherConnectionActiveForOps(pusher.connection)) return;
    pusher.unsubscribe(channelName);
  } catch {
    /* ignore */
  }
}

export function safePusherDisconnect(pusher: Pusher | null): void {
  if (!pusher) return;
  try {
    if (!pusherConnectionActiveForOps(pusher.connection)) return;
    pusher.disconnect();
  } catch {
    /* ignore */
  }
}
