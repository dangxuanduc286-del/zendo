/** Action cards — Công cụ CTV (mobile-native + desktop grid) */

export const AFFILIATE_TOOLS_GRID = [
  "grid w-full min-w-0 max-w-full",
  "grid-cols-1 gap-3 max-lg:gap-[13px]",
  "lg:grid-cols-3 lg:auto-rows-fr lg:gap-[18px] xl:gap-5",
].join(" ");

export const AFFILIATE_TOOL_CARD = [
  "group relative flex w-full min-h-[4.75rem] min-w-0 items-center gap-3.5",
  "rounded-2xl border border-slate-200/70 bg-white p-4 text-left",
  "shadow-[0_2px_10px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.02]",
  "transition-all duration-200 ease-out",
  "hover:-translate-y-0.5 hover:border-slate-200/90 hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)]",
  "active:scale-[0.98] active:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/40",
  "disabled:pointer-events-none disabled:opacity-50",
  "max-lg:touch-manipulation max-lg:[-webkit-tap-highlight-color:transparent]",
  "lg:min-h-[5.25rem] lg:p-5",
].join(" ");

export const AFFILIATE_TOOL_ICON_WRAP = [
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
  "bg-gradient-to-br from-emerald-50/95 via-teal-50/80 to-sky-50/60",
  "text-emerald-700 ring-1 ring-emerald-100/70",
  "transition-colors duration-200 group-hover:from-emerald-100/90 group-hover:to-sky-100/70",
  "lg:h-12 lg:w-12",
].join(" ");

export const AFFILIATE_TOOL_TITLE = "text-[15px] font-semibold leading-snug text-[#0f172a] lg:text-base";

export const AFFILIATE_TOOL_SUBTITLE =
  "mt-0.5 text-[12px] leading-snug text-[#64748b] line-clamp-2 lg:text-[13px]";

export const AFFILIATE_TOOL_URL_STRIP =
  "mt-3 break-all rounded-[14px] bg-slate-50/90 px-4 py-2.5 text-[12px] leading-relaxed text-slate-600 ring-1 ring-slate-100/90";
