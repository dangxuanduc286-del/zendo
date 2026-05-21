/** Token UI — shell tài khoản CTV premium (mint + blue) */

import { CTV_MOTION_CLASS } from "../ctv/ctv-motion-tokens";
import {
  CTV_MONEY_VALUE_MD,
  CTV_SEGMENTED_ITEM,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_SEGMENTED_WRAP,
  CTV_TAB_ACTIVE,
  CTV_TAB_IDLE_HOVER,
  CTV_TAB_RADIUS,
} from "../ctv/ctv-ui-tokens";

export {
  CTV_SEGMENTED_ITEM,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_SEGMENTED_WRAP,
  CTV_TAB_ACTIVE,
  CTV_TAB_IDLE_HOVER,
  CTV_TAB_RADIUS,
};

export const CTV_LAYOUT_GRID = [
  "flex w-full min-w-0 flex-col gap-4",
  "max-lg:overflow-x-clip lg:overflow-visible",
  "lg:grid lg:grid-cols-[minmax(13rem,17.5rem)_minmax(0,1fr)] lg:items-start lg:gap-6",
].join(" ");

export const CTV_SIDEBAR_ASIDE =
  "hidden min-h-0 w-full min-w-0 md:flex lg:h-fit lg:max-w-full lg:flex-col lg:self-start lg:py-1 lg:sticky lg:top-4";

export const CTV_MAIN_STACK = [
  "flex min-h-0 min-w-0 flex-1 flex-col gap-4",
  "max-lg:overflow-x-clip lg:overflow-visible",
  "lg:gap-5",
].join(" ");

export const CTV_TYPE_EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export const CTV_TYPE_TITLE =
  "text-[20px] font-bold leading-[1.2] tracking-tight text-[#1A1A1A] max-md:text-[22px] lg:text-[20px]";

export const CTV_TYPE_BODY = "text-sm leading-relaxed text-slate-600 max-md:text-[13px] max-md:leading-snug";

export const CTV_TYPE_SECTION =
  "text-base font-bold text-slate-900 max-md:text-[18px] max-md:font-semibold max-md:leading-snug sm:text-lg";

/** Tiêu đề card / panel con (analytics, campaign, creator charts). */
export const CTV_TYPE_CARD_TITLE =
  "text-sm font-bold leading-snug tracking-tight text-slate-900 sm:text-[15px]";

export const CTV_TYPE_METRIC_LABEL =
  "text-[13px] font-medium leading-snug text-[#475569] max-md:text-[13px] lg:text-xs lg:text-slate-500";

export const CTV_TYPE_METRIC_VALUE = ["mt-1.5 block", CTV_MONEY_VALUE_MD].join(" ");

export const CTV_TYPE_METRIC_HINT =
  "mt-1.5 text-[12px] font-normal leading-snug text-[#94a3b8] line-clamp-2 max-md:text-[12px] lg:mt-2 lg:text-xs lg:text-slate-500";

/** Sidebar floating card — chiều cao theo menu, không stretch full viewport */
export const CTV_SIDEBAR_SHELL = [
  "flex h-fit w-full flex-col",
  "rounded-xl bg-white p-4",
  "border border-black/[0.05]",
  "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
  "lg:p-5",
].join(" ");

export const CTV_PROFILE_SHELL =
  "rounded-xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05] sm:p-6";

export const CTV_CONTENT_SURFACE = [
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm ring-1 ring-white/40 max-md:px-4 max-md:py-4 sm:p-6",
  "max-lg:overflow-x-clip lg:overflow-visible",
].join(" ");

export const CTV_MOBILE_PANEL_FLAT = "";

export const CTV_CONTENT_PANEL = `w-full min-w-0 ${CTV_CONTENT_SURFACE} ${CTV_MOBILE_PANEL_FLAT}`;

export const CTV_BLOCK =
  "rounded-2xl border border-black/[0.04] bg-slate-50/80 p-4 lg:rounded-[20px] lg:p-5";

export const CTV_OVERVIEW_TILE =
  "flex min-h-[7.5rem] flex-col rounded-2xl border border-black/[0.04] bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm lg:min-h-[8rem] lg:p-5";

export const CTV_NAV_ROW = [
  "flex w-full min-h-[3rem] items-center gap-3 rounded-2xl px-3.5 py-2.5",
  "text-left text-sm font-medium text-slate-700",
  CTV_MOTION_CLASS.base,
  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35",
  "lg:min-h-[3.25rem]",
].join(" ");

export const CTV_NAV_ROW_IDLE = "hover:bg-[#f3f4f6]";

/** Desktop sidebar — active (đậm hơn ~25%, xanh dương nhạt) */
export const CTV_NAV_ROW_ACTIVE = [
  "bg-[#D6EEFF]",
  "font-bold text-[#0F3D66]",
  "shadow-[0_4px_12px_rgba(59,130,246,0.12)]",
  "ring-1 ring-[#A7D8FF]",
].join(" ");

export const CTV_NAV_ICON = [
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
  "bg-slate-100 text-slate-500",
  CTV_MOTION_CLASS.base,
].join(" ");

export const CTV_NAV_ICON_ACTIVE =
  "bg-[#BFE4FF] text-[#0F4C81] shadow-sm ring-1 ring-[#A7D8FF]";

export const CTV_NAV_ROW_SIGNOUT = [
  "flex w-full min-h-12 shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5",
  "text-left text-sm font-semibold text-rose-700/90",
  CTV_MOTION_CLASS.base,
  "hover:bg-rose-50/90",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/50",
  "lg:min-h-[3.25rem]",
].join(" ");

export const CTV_NAV_ICON_SIGNOUT = "bg-rose-50 text-rose-600 ring-1 ring-rose-100/90";

export const CTV_METRIC_TILE = [
  "flex h-full min-h-[5.5rem] min-w-0 flex-col justify-between",
  "rounded-[18px] border border-slate-200/75 bg-white p-3",
  "shadow-[0_2px_10px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]",
  CTV_MOTION_CLASS.card,
  "sm:min-h-[5.75rem] sm:p-[14px]",
  "lg:rounded-2xl lg:border-slate-200/70 lg:bg-white/95 lg:p-5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

export const CTV_METRIC_TILE_ACCENT = [
  "flex h-full min-h-[5.5rem] min-w-0 flex-col justify-between",
  "rounded-[18px] border border-emerald-100/85 bg-gradient-to-br from-emerald-50/95 to-white p-3",
  "shadow-[0_2px_10px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100/50",
  CTV_MOTION_CLASS.card,
  "sm:min-h-[5.75rem] sm:p-[14px]",
  "lg:rounded-xl lg:p-5 lg:shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
].join(" ");

export const CTV_METRIC_ICON = [
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
  "bg-white text-slate-500 shadow-sm ring-1 ring-slate-100/90",
  "sm:h-9 sm:w-9 sm:rounded-xl lg:h-10 lg:w-10",
].join(" ");

export const CTV_METRIC_ICON_ACCENT =
  "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-emerald-100/90";

export const CTV_CTA_PRIMARY =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[transform,box-shadow] duration-200 ease-out hover:bg-blue-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 max-md:w-full max-md:justify-center max-md:text-[14px] lg:hover:-translate-y-0.5";

export const CTV_CTA_SECONDARY =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-[#1A1A1A] shadow-sm touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[transform,background-color] duration-200 ease-out hover:bg-slate-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 max-md:w-full max-md:justify-center max-md:text-[14px] lg:hover:-translate-y-0.5";

export const CTV_CTA_ACCENT =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(245,158,11,0.25)] transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export const CTV_CARD = CTV_CONTENT_SURFACE;
