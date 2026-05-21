import { clsx } from "clsx";
import {
  CTV_SEGMENTED_ICON,
  CTV_SEGMENTED_ITEM,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_SEGMENTED_ITEM_ICON,
  CTV_SEGMENTED_LABEL,
  CTV_SEGMENTED_PILL_ITEM,
  CTV_SEGMENTED_PILL_ITEM_ACTIVE,
  CTV_SEGMENTED_WRAP,
  CTV_TAB_IDLE_HOVER,
} from "@/components/storefront/ctv/ctv-ui-tokens";

/**
 * Alias tab / segmented cho Affiliate Analytics — SSOT: CTV_SEGMENTED_* (ctv-ui-tokens).
 * Giữ tên export cũ để không đổi import hàng loạt; styling thống nhất CTV/Affiliate.
 */

/** @deprecated — dùng CTV_SEGMENTED_WRAP */
export const AFFILIATE_ANALYTICS_TAB_ROW_SURFACE = CTV_SEGMENTED_WRAP;

/** @deprecated — dùng CTV_SEGMENTED_ITEM + CTV_TAB_IDLE_HOVER */
export const AFFILIATE_ANALYTICS_MAIN_TAB_INACTIVE = clsx(CTV_SEGMENTED_ITEM, CTV_TAB_IDLE_HOVER);

/** Tab chính analytics — giữ box model khi active (tránh nhảy chiều cao/padding). */
export const AFFILIATE_ANALYTICS_MAIN_TAB_ACTIVE = clsx(CTV_SEGMENTED_ITEM, CTV_SEGMENTED_ITEM_ACTIVE);

/** @deprecated — dùng CTV_SEGMENTED_PILL_ITEM */
export const AFFILIATE_ANALYTICS_SEGMENT_PILL_INACTIVE = CTV_SEGMENTED_PILL_ITEM;

/** @deprecated — dùng CTV_SEGMENTED_PILL_ITEM_ACTIVE */
export const AFFILIATE_ANALYTICS_SEGMENT_PILL_ACTIVE = CTV_SEGMENTED_PILL_ITEM_ACTIVE;

/** @deprecated — dùng CTV_SEGMENTED_ITEM_ICON + CTV_TAB_IDLE_HOVER */
export const AFFILIATE_ANALYTICS_SUBTAB_INACTIVE = clsx(CTV_SEGMENTED_ITEM_ICON, CTV_TAB_IDLE_HOVER);

/** Subtab active — ring inset cố định, khớp inactive (tránh nhảy 1px). */
export const AFFILIATE_ANALYTICS_SUBTAB_ACTIVE = clsx(
  CTV_SEGMENTED_ITEM_ICON,
  CTV_SEGMENTED_ITEM_ACTIVE,
  "ring-blue-300/50",
);

/** @deprecated — dùng CTV_SEGMENTED_ICON */
export const AFFILIATE_ANALYTICS_SUBTAB_ICON = CTV_SEGMENTED_ICON;

/** @deprecated — dùng CTV_SEGMENTED_LABEL */
export const AFFILIATE_ANALYTICS_SUBTAB_LABEL = CTV_SEGMENTED_LABEL;

/** Chip link / xuất nhỏ (toolbar phụ, không phải tab). */
export const AFFILIATE_ANALYTICS_CHIP_LINK = clsx(
  "inline-flex items-center rounded-lg border border-blue-200/85 bg-blue-50/55 px-2.5 py-1 text-[11px] font-bold text-blue-800 transition hover:border-blue-300/70 hover:bg-blue-100/65",
);

/** Nút CTA trong analytics (không phải tab): viền xanh, nền sáng — tránh slate-900. */
export const AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY = clsx(
  "inline-flex items-center justify-center rounded-xl border border-blue-200/90 bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.06)] hover:bg-blue-50/90",
);

export const AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY = clsx(
  "inline-flex items-center justify-center rounded-xl border border-blue-500/90 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)] hover:bg-blue-700",
);
