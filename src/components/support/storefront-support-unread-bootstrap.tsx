"use client";

import { useSession } from "next-auth/react";
import { useStorefrontSupportUnreadSync } from "@/lib/use-storefront-support-unread-total";

/**
 * Giữ sync unread + Pusher cho mọi layout storefront (kể cả khi nút Hỗ trợ desktop không mount).
 */
export default function StorefrontSupportUnreadBootstrap(): null {
  const { status, data: session } = useSession();
  const enabled = status === "authenticated" && session?.user?.role === "USER";
  useStorefrontSupportUnreadSync(enabled);
  return null;
}
