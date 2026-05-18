/** Token UI — shell tài khoản CTV premium (mint + blue) */

import { CTV_MOTION_CLASS } from "../ctv/ctv-motion-tokens";
import {
  CTV_TAB_ACTIVE,
  CTV_TAB_IDLE_HOVER,
  CTV_TAB_RADIUS,
} from "../ctv/ctv-ui-tokens";

export { CTV_TAB_ACTIVE, CTV_TAB_IDLE_HOVER, CTV_TAB_RADIUS };

export const CTV_LAYOUT_GRID =
  "flex w-full min-w-0 flex-col gap-4 overflow-x-hidden lg:grid lg:grid-cols-[minmax(17rem,280px)_minmax(0,1fr)] lg:items-start lg:gap-5 xl:grid-cols-[280px_minmax(0,1fr)]";

export const CTV_SIDEBAR_ASIDE =
  "hidden min-h-0 w-full md:flex lg:h-fit lg:flex-col lg:self-start lg:py-1 lg:sticky lg:top-4";

export const CTV_MAIN_STACK = "flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden lg:gap-5";

export const CTV_TYPE_EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export const CTV_TYPE_TITLE =
  "text-[20px] font-bold leading-[1.2] tracking-tight text-[#1A1A1A] max-md:text-[22px] lg:text-[20px]";

export const CTV_TYPE_BODY = "text-sm leading-relaxed text-slate-600 max-md:text-[13px] max-md:leading-snug";

export const CTV_TYPE_SECTION =
  "text-base font-bold text-slate-900 max-md:text-[18px] max-md:font-semibold max-md:leading-snug sm:text-lg";

export const CTV_TYPE_METRIC_LABEL =
  "text-[13px] font-medium leading-snug text-[#475569] max-md:text-[13px] lg:text-xs lg:text-slate-500";

export const CTV_TYPE_METRIC_VALUE =
  "mt-1.5 font-bold tabular-nums text-[#0f172a] text-[length:clamp(1.75rem,5vw,2.125rem)] leading-[1.1] tracking-[-0.025em] [overflow-wrap:break-word] [word-break:keep-all] max-md:line-clamp-2 lg:text-lg lg:leading-tight lg:tracking-tight";

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

export const CTV_CONTENT_SURFACE =
  "box-border w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm ring-1 ring-white/40 max-md:px-4 max-md:py-4 sm:p-6";

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

export const CTV_NAV_ROW_ACTIVE = [
  "bg-gradient-to-r from-emerald-50/95 via-teal-50/80 to-cyan-50/60",
  "font-semibold text-slate-900",
  "shadow-[0_4px_14px_rgba(16,185,129,0.08)]",
  "ring-1 ring-emerald-100/80",
].join(" ");

export const CTV_NAV_ICON = [
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
  "bg-slate-100 text-slate-500",
  CTV_MOTION_CLASS.base,
].join(" ");

export const CTV_NAV_ICON_ACTIVE =
  "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm ring-1 ring-emerald-200/60";

export const CTV_NAV_ROW_SIGNOUT = [
  "flex w-full min-h-12 shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5",
  "text-left text-sm font-semibold text-rose-700/90",
  CTV_MOTION_CLASS.base,
  "hover:bg-rose-50/90",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/50",
  "lg:min-h-[3.25rem]",
].join(" ");

export const CTV_NAV_ICON_SIGNOUT = "bg-rose-50 text-rose-600 ring-1 ring-rose-100/90";

export const CTV_SEGMENTED_WRAP =
  "flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain rounded-xl bg-slate-100/90 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] lg:gap-1.5 lg:rounded-2xl lg:p-1.5";

export const CTV_SEGMENTED_ITEM = [
  "flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl",
  "px-4 text-[13px] font-semibold text-slate-600",
  "touch-manipulation [-webkit-tap-highlight-color:transparent]",
  CTV_TAB_IDLE_HOVER,
  "lg:min-h-12 lg:flex-1 lg:rounded-[14px] lg:px-5 lg:py-2.5 lg:text-sm",
].join(" ");

export const CTV_SEGMENTED_ITEM_ACTIVE = CTV_TAB_ACTIVE;

export const CTV_METRIC_TILE = [
  "flex min-h-[5.75rem] min-w-0 flex-col justify-between overflow-hidden break-words",
  "rounded-[18px] border border-slate-200/75 bg-white p-[14px]",
  "shadow-[0_2px_10px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]",
  CTV_MOTION_CLASS.card,
  "max-lg:min-h-[5.5rem]",
  "lg:min-h-[7rem] lg:rounded-2xl lg:border-slate-200/70 lg:bg-white/95 lg:p-5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

export const CTV_METRIC_TILE_ACCENT = [
  "flex min-h-[5.75rem] min-w-0 flex-col justify-between overflow-hidden break-words",
  "rounded-[18px] border border-emerald-100/85 bg-gradient-to-br from-emerald-50/95 to-white p-[14px]",
  "shadow-[0_2px_10px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100/50",
  CTV_MOTION_CLASS.card,
  "max-lg:min-h-[5.5rem]",
  "lg:min-h-[7rem] lg:rounded-xl lg:p-5 lg:shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
].join(" ");

export const CTV_METRIC_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-100/90 lg:h-11 lg:w-11";

export const CTV_METRIC_ICON_ACCENT =
  "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-emerald-100/90";

export const CTV_CTA_PRIMARY =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[transform,box-shadow] duration-200 ease-out hover:bg-blue-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 max-md:w-full max-md:justify-center max-md:text-[14px] lg:hover:-translate-y-0.5";

export const CTV_CTA_SECONDARY =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-[#1A1A1A] shadow-sm touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[transform,background-color] duration-200 ease-out hover:bg-slate-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 max-md:w-full max-md:justify-center max-md:text-[14px] lg:hover:-translate-y-0.5";

export const CTV_CTA_ACCENT =
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(245,158,11,0.25)] transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export const CTV_CARD = CTV_CONTENT_SURFACE;
