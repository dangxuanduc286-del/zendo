import { clsx } from "clsx";

/**
 * Toolbar / chip tokens cho Affiliate Analytics.
 * Tab / segmented SSOT: CTV_SEGMENTED_* trong ctv-ui-tokens.ts.
 */

/** Chip link / xuất nhỏ (toolbar phụ, không phải tab). */
export const AFFILIATE_ANALYTICS_CHIP_LINK = clsx(
  "inline-flex items-center rounded-[14px] border border-blue-200/85 bg-blue-50/55 px-2.5 py-1 text-[11px] font-bold text-blue-800 transition hover:border-blue-300/70 hover:bg-blue-100/65",
);

/**
 * Toolbar compact analytics — không tương đương CTV_CTA_* (xs, px-3 py-2, theme blue-border).
 * @deprecated — giữ export; phase sau có thể map CTV_CTA_TOOLBAR_* nếu cần.
 */
export const AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY = clsx(
  "inline-flex min-h-10 items-center justify-center rounded-[14px] border border-blue-200/90 bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.06)] hover:bg-blue-50/90",
  "lg:min-h-12 lg:px-4 lg:text-sm",
);

/** @deprecated — giữ export; xem AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY. */
export const AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY = clsx(
  "inline-flex min-h-10 items-center justify-center rounded-[14px] border border-blue-500/90 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)] hover:bg-blue-700",
  "lg:min-h-12 lg:px-4 lg:text-sm",
);
