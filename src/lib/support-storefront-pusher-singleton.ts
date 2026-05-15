"use client";

import Pusher from "pusher-js";

import { hasPusherClientConfig } from "@/lib/support-ticket-chat-channel";

let singleton: Pusher | null = null;
let acquireCount = 0;

/**
 * Một kết nối Pusher dùng chung cho storefront (topbar unread + SupportPanel).
 * Gọi {@link releaseSupportStorefrontPusher} khi layer không còn cần socket.
 */
export function acquireSupportStorefrontPusher(): Pusher | null {
  if (typeof window === "undefined") return null;
  if (!hasPusherClientConfig()) return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
  if (!key || !cluster) return null;

  acquireCount += 1;
  if (singleton) return singleton;

  try {
    singleton = new Pusher(key, {
      cluster,
      forceTLS: true,
      authEndpoint: "/api/pusher/auth",
    });
    return singleton;
  } catch {
    acquireCount = Math.max(0, acquireCount - 1);
    return null;
  }
}

export function releaseSupportStorefrontPusher(): void {
  acquireCount = Math.max(0, acquireCount - 1);
  if (acquireCount > 0 || !singleton) return;
  try {
    singleton.disconnect();
  } catch {
    /* ignore */
  }
  singleton = null;
}
