"use client";

import { Copy, Megaphone, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AffiliateQuickActionDef = {
  id: "copy" | "share" | "promo";
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

export const AFFILIATE_QUICK_ACTION_DEFS: readonly AffiliateQuickActionDef[] = [
  {
    id: "copy",
    title: "Sao chép liên kết",
    subtitle: "Sao chép link giới thiệu",
    icon: Copy,
  },
  {
    id: "share",
    title: "Chia sẻ",
    subtitle: "Chia sẻ nhanh tới MXH",
    icon: Share2,
  },
  {
    id: "promo",
    title: "Quảng bá",
    subtitle: "Tạo chiến dịch quảng bá",
    icon: Megaphone,
  },
] as const;

export function tryNativeShare(url: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || !url.trim()) {
    return false;
  }
  void navigator.share({ title: "Zendo Affiliate", text: "Link giới thiệu", url: url.trim() }).catch(() => {});
  return true;
}
