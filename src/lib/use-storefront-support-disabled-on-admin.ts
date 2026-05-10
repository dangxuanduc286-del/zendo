"use client";

import { usePathname } from "next/navigation";

/** Route hiện tại là admin → tắt panel / API ticket storefront. */
export function useStorefrontSupportDisabledOnAdminRoute(): boolean {
  const pathname = usePathname();
  return (pathname ?? "").startsWith("/admin");
}
