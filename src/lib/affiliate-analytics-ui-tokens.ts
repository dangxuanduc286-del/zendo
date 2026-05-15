import { clsx } from "clsx";

/**
 * Hệ màu tab / segmented control cho Affiliate Analytics (Zendo storefront).
 * Tone xanh nhạt — không dùng pill navy/đen cho tab active.
 */

/** Vùng nền chung cho hàng tab / toolbar phân đoạn (nhẹ, ecommerce SaaS). */
export const AFFILIATE_ANALYTICS_TAB_ROW_SURFACE =
  "rounded-xl border border-blue-100/90 bg-blue-50/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]";

const SEGMENT_BASE =
  "inline-flex items-center justify-center border font-semibold transition-[color,background-color,border-color,box-shadow,transform] active:scale-[0.99]";

/** Tab chính analytics (pill lớn, scroll ngang mobile). */
export const AFFILIATE_ANALYTICS_MAIN_TAB_BASE = clsx(
  SEGMENT_BASE,
  "shrink-0 snap-start rounded-lg px-3.5 py-2 text-xs sm:px-4 sm:text-[13px] lg:px-4 lg:py-2.5",
);

export const AFFILIATE_ANALYTICS_MAIN_TAB_INACTIVE = clsx(
  AFFILIATE_ANALYTICS_MAIN_TAB_BASE,
  "border-transparent bg-blue-50/35 text-slate-600 hover:border-blue-100/90 hover:bg-blue-100/55 hover:text-slate-800",
);

export const AFFILIATE_ANALYTICS_MAIN_TAB_ACTIVE = clsx(
  AFFILIATE_ANALYTICS_MAIN_TAB_BASE,
  "border-blue-300/85 bg-blue-500/10 text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.12)] ring-1 ring-blue-200/55",
);

/** Subtab / filter segment nhỏ (campaign hub, creator charts…). */
export const AFFILIATE_ANALYTICS_SEGMENT_PILL_BASE = clsx(
  SEGMENT_BASE,
  "rounded-lg px-2.5 py-1 text-[11px] font-bold",
);

export const AFFILIATE_ANALYTICS_SEGMENT_PILL_INACTIVE = clsx(
  AFFILIATE_ANALYTICS_SEGMENT_PILL_BASE,
  "border-transparent bg-blue-50/40 text-slate-600 ring-1 ring-blue-100/60 hover:bg-blue-100/60 hover:text-slate-800",
);

export const AFFILIATE_ANALYTICS_SEGMENT_PILL_ACTIVE = clsx(
  AFFILIATE_ANALYTICS_SEGMENT_PILL_BASE,
  "border-blue-300/85 bg-blue-500/12 text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.1)] ring-1 ring-blue-200/50",
);

/** Subtab campaign (có icon, `flex` — không dùng chung `inline-flex` với pill chart). */
const SUBTAB_SHELL =
  "flex shrink-0 snap-start items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform] active:scale-[0.99]";

export const AFFILIATE_ANALYTICS_SUBTAB_INACTIVE = clsx(
  SUBTAB_SHELL,
  "border-transparent bg-blue-50/35 text-slate-600 hover:border-blue-100/90 hover:bg-blue-100/55 hover:text-slate-800",
);

export const AFFILIATE_ANALYTICS_SUBTAB_ACTIVE = clsx(
  SUBTAB_SHELL,
  "border-blue-300/85 bg-blue-500/10 text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.12)] ring-1 ring-blue-200/50",
);

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
