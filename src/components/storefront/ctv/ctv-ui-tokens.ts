/** CTV / Affiliate dashboard — design system (SaaS, mobile-first) */

import { CTV_MOTION_CLASS } from "./ctv-motion-tokens";

export const CTV_DS_TEXT = "text-[#1A1A1A]";
export const CTV_DS_TEXT_MUTED = "text-[#6B7280]";
export const CTV_DS_BG = "bg-white";

export const CTV_DS_SHADOW = "shadow-sm max-md:shadow-sm lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]";
export const CTV_DS_RADIUS = "rounded-xl";
export const CTV_DS_BORDER = "border border-black/[0.05]";

/** Bo góc tab — 14px (đồng bộ sidebar + segmented) */
export const CTV_TAB_RADIUS = "rounded-[14px]";

/** Tab active — xanh dịu, shadow nhẹ (app native) */
export const CTV_TAB_ACTIVE = [
  "bg-gradient-to-br from-[#3b82f6] to-[#2563eb]",
  "font-semibold text-white",
  "shadow-sm shadow-blue-500/20",
  "transition-[background-color,box-shadow,color] duration-200 ease-out",
].join(" ");

/** Touch targets — mobile CTV */
export const CTV_V2_TOUCH =
  "touch-manipulation [-webkit-tap-highlight-color:transparent]";

export const CTV_TAB_IDLE_HOVER = [
  "transition-[background-color,color,box-shadow,transform] duration-[250ms] ease-out",
  "hover:bg-blue-50 hover:text-blue-700",
].join(" ");

export const CTV_V2_MOTION = CTV_MOTION_CLASS.base;

/** Containment mobile CTV — tránh overflow ngang toàn trang */
export const CTV_MOBILE_SAFE =
  "box-border w-full max-w-full min-w-0 overflow-x-hidden [contain:layout]";

/** Horizontal inset — safe area + 16px minimum (Promax native) */
export const CTV_MOBILE_INSET_X = [
  "max-md:pl-[max(1rem,env(safe-area-inset-left))]",
  "max-md:pr-[max(1rem,env(safe-area-inset-right))]",
].join(" ");

/** Shell trang CTV mobile — thoáng mép, padding đáy bottom nav */
export const CTV_MOBILE_PAGE = [
  CTV_MOBILE_SAFE,
  CTV_MOBILE_INSET_X,
  "max-md:space-y-5",
  "max-md:pb-[calc(env(safe-area-inset-bottom)+88px)]",
  "lg:space-y-0 lg:pb-0",
].join(" ");

/** Section stack — breathing room giữa các khối */
export const CTV_MOBILE_SECTION = "min-w-0 space-y-4 max-md:space-y-4 max-md:pt-2 lg:space-y-5";

/** Nút / CTA stack trong card */
export const CTV_MOBILE_BTN_STACK = "flex min-w-0 flex-col space-y-3 pt-2";

/** Form / link field stack */
export const CTV_MOBILE_FIELD_STACK = "mt-3 min-w-0 space-y-3";

/** Khung «Gợi ý kiếm đơn» — xanh nhạt, gọn */
export const CTV_MOBILE_INSIGHTS_SHELL = [
  "min-w-0 overflow-hidden break-words rounded-2xl",
  "border border-emerald-200/80 bg-emerald-50/60 p-4",
  "shadow-sm ring-1 ring-white/40",
].join(" ");

export const CTV_MOBILE_INSIGHTS_TITLE = "text-[14px] font-semibold leading-snug text-emerald-950";

export const CTV_MOBILE_INSIGHTS_BODY =
  "mt-2 space-y-2 text-[14px] leading-relaxed text-emerald-950";

export const CTV_MOBILE_INSIGHTS_LINK =
  "inline-block text-xs font-medium text-blue-600 hover:underline";

/** Card surface mobile — premium, không sát mép màn hình */
export const CTV_MOBILE_CARD = [
  "min-w-0 overflow-hidden break-words rounded-2xl border border-slate-200/70",
  "bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm",
  "max-md:ring-1 max-md:ring-white/40",
].join(" ");

/** @deprecated — không flush sát mép; giữ rỗng để không phá import cũ */
export const CTV_MOBILE_PANEL_FLAT = "";

export const CTV_PAGE_BG = [
  "min-w-0",
  CTV_MOBILE_SAFE,
  CTV_MOBILE_INSET_X,
  "bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]",
  "max-md:py-2",
  "lg:rounded-xl lg:p-6 lg:px-6 xl:p-8",
].join(" ");

export const CTV_V2_CARD = [
  CTV_DS_RADIUS,
  CTV_DS_BG,
  CTV_DS_BORDER,
  CTV_DS_SHADOW,
  CTV_MOTION_CLASS.card,
].join(" ");

export const CTV_V2_CONTENT = [
  "min-w-0 overflow-hidden break-words",
  "max-md:rounded-2xl max-md:border max-md:border-slate-200/70 max-md:bg-white/95",
  "max-md:px-4 max-md:py-4 max-md:shadow-sm max-md:backdrop-blur-sm",
  "max-md:ring-1 max-md:ring-white/40",
  "lg:rounded-xl lg:border lg:border-black/[0.05] lg:bg-white lg:p-4 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
  CTV_MOTION_CLASS.card,
].join(" ");

export const CTV_V2_INSET = `${CTV_DS_RADIUS} border border-black/[0.04] bg-slate-50/80 p-4`;

export const CTV_V2_DIVIDER = "border-t border-slate-200/60";

export const CTV_V2_DIVIDER_SOFT =
  "h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent";

/** Card Hoa hồng / Điểm — gọn, viền xanh nhạt */
export const CTV_V2_STRIP_COMMISSION = [
  "relative overflow-hidden",
  CTV_TAB_RADIUS,
  "border border-blue-100/90",
  "bg-gradient-to-br from-white via-blue-50/35 to-slate-50/90",
  "px-3.5 py-3 sm:px-4 sm:py-3.5",
].join(" ");

/** @deprecated — dùng CTV_V2_STRIP_COMMISSION */
export const CTV_V2_STRIP_MINT = CTV_V2_STRIP_COMMISSION;

export const CTV_V2_WALLET_CARD = [
  "relative min-w-0 overflow-hidden break-words",
  CTV_DS_RADIUS,
  CTV_DS_BORDER,
  "bg-gradient-to-br from-white via-blue-50/35 to-emerald-50/25",
  CTV_DS_SHADOW,
  "px-3 py-3 max-lg:px-3 max-lg:py-3 sm:px-4 sm:py-3.5",
].join(" ");

export const CTV_V2_LABEL =
  "text-[13px] font-medium leading-snug text-[#6B7280] max-md:text-[13px]";

/** Nhãn KPI — mobile 13–14px medium; desktop giữ uppercase nhỏ */
export const CTV_V2_LABEL_UPPER = [
  "text-[13px] font-medium leading-snug text-[#475569]",
  "max-lg:normal-case max-lg:tracking-normal",
  "lg:text-[11px] lg:font-semibold lg:uppercase lg:tracking-[0.06em] lg:text-[#6B7280]",
].join(" ");

export const CTV_V2_HEADING = [
  "font-semibold leading-[1.25] tracking-tight text-[#0f172a] antialiased",
  "max-md:text-lg",
  "text-base sm:text-[17px] lg:text-lg",
].join(" ");

export const CTV_V2_SECTION_TITLE = [
  "font-semibold leading-snug tracking-tight text-[#0f172a] break-words",
  "max-md:mb-2.5 max-md:text-base max-md:leading-[1.3]",
  "text-sm sm:text-[15px] lg:mb-0",
].join(" ");

/** ——— Mobile KPI grid (2 cột · gap 12px) ——— */
export const CTV_MOBILE_KPI_GRID =
  "grid w-full min-w-0 max-w-full auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4";

export const CTV_MOBILE_KPI_LABEL = CTV_V2_LABEL_UPPER;

/** Số liệu chính: clamp(28px, 5vw, 34px) · tối đa 2 dòng */
export const CTV_MOBILE_KPI_VALUE = [
  "font-bold tabular-nums text-[#0f172a]",
  "text-[length:clamp(1.75rem,5vw,2.125rem)]",
  "leading-[1.1] tracking-[-0.025em]",
  "[overflow-wrap:break-word] [word-break:keep-all]",
  "max-md:line-clamp-2",
].join(" ");

export const CTV_MOBILE_KPI_HINT =
  "text-[12px] font-normal leading-snug text-[#94a3b8] line-clamp-2 max-md:text-[12px] lg:text-[13px] lg:text-[#6B7280]";

export const CTV_MOBILE_KPI_TILE = [
  "flex min-h-[5.75rem] min-w-0 flex-col justify-between overflow-hidden break-words",
  "rounded-[18px] border border-slate-200/75 bg-white",
  "p-[14px] shadow-[0_2px_10px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]",
  CTV_MOTION_CLASS.card,
  "max-lg:min-h-[5.5rem]",
  "lg:min-h-[7rem] lg:rounded-2xl lg:border-slate-200/70 lg:p-5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

export const CTV_MOBILE_KPI_TILE_ACCENT = [
  "flex min-h-[5.75rem] min-w-0 flex-col justify-between overflow-hidden break-words",
  "rounded-[18px] border border-emerald-100/85 bg-gradient-to-br from-emerald-50/95 to-white",
  "p-[14px] shadow-[0_2px_10px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100/50",
  CTV_MOTION_CLASS.card,
  "max-lg:min-h-[5.5rem]",
  "lg:min-h-[7rem] lg:rounded-xl lg:p-5 lg:shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
].join(" ");

/** Badge trạng thái (vd. Đang hoạt động) */
export const CTV_MOBILE_STATUS_BADGE = [
  "inline-flex h-8 max-h-8 shrink-0 items-center gap-1 rounded-full",
  "border border-emerald-200/90 bg-emerald-50 px-2.5",
  "text-[11px] font-semibold leading-none text-emerald-700",
].join(" ");

export const CTV_V2_BODY =
  "break-words text-sm leading-relaxed text-[#6B7280] max-md:text-[14px] max-md:leading-relaxed";

export const CTV_V2_DESCRIPTION =
  "break-words text-sm leading-6 text-[#6B7280] max-md:text-[14px]";

/** Padding card dashboard — Promax mobile */
export const CTV_V2_CARD_PAD = "px-4 py-4 max-md:px-4 max-md:py-4 sm:p-4";

export const CTV_V2_CARD_COMPACT = [CTV_V2_CARD, CTV_V2_CARD_PAD].join(" ");

/** ——— Trung tâm CTV · Enterprise earning dashboard (8pt grid) ——— */

/** Card surface: radius 16px, border 1px, shadow nhẹ */
export const CTV_HUB_INNER_CARD = [
  "min-w-0 overflow-hidden rounded-2xl",
  "border border-slate-200 bg-white",
  "shadow-sm",
].join(" ");

/** Padding card: 16px mobile · 24px desktop */
export const CTV_HUB_CARD_PAD = "p-4 lg:p-6";

/** Nền gradient card Cấp bậc / Hoa hồng (cùng lớp với `rank.color.gradient`) */
export const CTV_HUB_RANK_CARD_SURFACE = "relative min-w-0 overflow-hidden bg-gradient-to-br";

/** Stack dọc hub: gap 24px */
export const CTV_HUB_LAYOUT_STACK = "flex min-w-0 flex-col gap-6";

/** Hàng 2 cột: Tài khoản | Cấp bậc */
export const CTV_HUB_ROW_SPLIT = "grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-6";

/** Mobile: Tài khoản → Cấp bậc → Hoa hồng. Desktop: Hoa hồng → hàng 2 cột → Hiệu suất */
export const CTV_HUB_MOBILE_ORDER_ACCOUNT = "order-1 lg:order-2";
export const CTV_HUB_MOBILE_ORDER_WALLET = "order-3 lg:order-1";
export const CTV_HUB_MOBILE_ORDER_PERFORMANCE = "order-4 lg:order-3";

/** Tiêu đề card hub — 20px / 700 / #0F172A */
export const CTV_HUB_CARD_TITLE = "text-xl font-bold leading-snug text-[#0F172A]";

/** @deprecated — dùng CTV_HUB_CARD_TITLE */
export const CTV_HUB_SECTION_TITLE = CTV_HUB_CARD_TITLE;

/** Cấp bậc — typography (ảnh mẫu gốc) */
export const CTV_HUB_RANK_NAME = "text-lg font-bold leading-snug text-[#0F172A] lg:text-xl";

export const CTV_HUB_RANK_META =
  "text-[13px] font-medium leading-snug text-slate-600 max-lg:break-words lg:whitespace-nowrap lg:overflow-hidden lg:text-ellipsis";

export const CTV_HUB_RANK_REVENUE =
  "text-xl font-bold tabular-nums leading-snug text-[#0F172A] lg:text-2xl";

/** Hoa hồng khả dụng — số chính (đồng bộ doanh thu card Cấp bậc) */
export const CTV_HUB_WALLET_AMOUNT = CTV_HUB_RANK_REVENUE;

/** Hoa hồng chờ mở khóa — cùng màu/weight, nhỏ hơn số chính một bậc (text-xl → text-sm) */
export const CTV_HUB_WALLET_PENDING_AMOUNT = [
  "text-sm font-bold tabular-nums leading-snug text-[#0F172A]",
  "lg:text-base",
].join(" ");

/** Dấu «+» giữa số khả dụng và hoa hồng chờ mở khóa */
export const CTV_HUB_WALLET_PLUS = CTV_HUB_WALLET_PENDING_AMOUNT;

/** Hàng số tiền: một dòng, gap 8–12px, không wrap */
export const CTV_HUB_WALLET_AMOUNT_ROW = [
  "mt-4 flex min-h-[1.75rem] min-w-0 max-w-full flex-nowrap items-center",
  "gap-2 sm:gap-3",
].join(" ");

export const CTV_HUB_RANK_CAPTION =
  "text-[13px] font-medium leading-snug text-slate-500 max-lg:break-words lg:whitespace-nowrap lg:overflow-hidden lg:text-ellipsis";

export const CTV_HUB_RANK_FOOTER_HINT =
  "min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-700 max-lg:break-words lg:truncate lg:whitespace-nowrap";

export const CTV_HUB_RANK_BADGE = [
  "inline-flex shrink-0 items-center rounded-full px-3 py-1.5",
  "text-xs font-bold uppercase tracking-wide ring-1",
].join(" ");

export const CTV_HUB_RANK_ICON_WRAP = [
  "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/70",
  "sm:h-[4.5rem] sm:w-[4.5rem]",
].join(" ");

export const CTV_HUB_RANK_BODY = "relative mt-3 flex min-w-0 items-start gap-3 sm:gap-4";

export const CTV_HUB_RANK_CONTENT = "min-w-0 flex-1 space-y-1.5 text-left";

export const CTV_HUB_RANK_FOOTER = "relative mt-3 space-y-2";

export const CTV_HUB_RANK_FOOTER_ROW = "flex min-w-0 items-center justify-between gap-3";

export const CTV_HUB_PROGRESS_TRACK =
  "h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-200/90 shadow-inner sm:h-3";

export const CTV_HUB_PROGRESS_PCT = "shrink-0 text-sm font-bold tabular-nums text-slate-800";

/** Khu vực thưởng — căn giữa, tách khỏi thanh tiến độ */
export const CTV_HUB_RANK_REWARD_SECTION = [
  "mt-3 flex min-w-0 w-full flex-col items-center px-2 sm:mt-4 sm:px-3",
].join(" ");

/** Divider ngắn giữa progress và thưởng (~40% khung) */
export const CTV_HUB_RANK_REWARD_DIVIDER = [
  "mx-auto mb-3 h-px w-[40%] min-w-[7rem] max-w-[12rem]",
  "bg-gradient-to-r from-transparent via-slate-400/15 to-transparent sm:mb-3.5",
].join(" ");

export const CTV_HUB_RANK_REWARD_BODY = [
  "flex w-full min-w-0 max-w-full flex-col items-center gap-2.5 py-1 sm:gap-3 sm:py-2",
].join(" ");

export const CTV_HUB_RANK_REWARD_MAIN = [
  "flex min-w-0 max-w-full flex-nowrap items-center justify-center gap-3 sm:gap-4",
].join(" ");

export const CTV_HUB_RANK_REWARD_GIFT_ICON = [
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
  "bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500",
  "shadow-[0_4px_14px_rgba(245,158,11,0.38)] ring-1 ring-amber-300/55",
].join(" ");

export const CTV_HUB_RANK_REWARD_GIFT_GLYPH = "h-7 w-7 text-amber-950";

export const CTV_HUB_RANK_REWARD_COPY = "min-w-0 text-center";

export const CTV_HUB_RANK_REWARD_LINE = [
  "flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5",
  "text-base font-semibold leading-snug text-slate-800 sm:text-lg",
].join(" ");

export const CTV_HUB_RANK_REWARD_LABEL = "font-semibold text-slate-800";

export const CTV_HUB_RANK_REWARD_AMOUNT = "font-bold tabular-nums tracking-tight text-lg sm:text-xl";

/** Số tiền khi đã đạt mốc — xanh lá hệ thống */
export const CTV_HUB_RANK_REWARD_AMOUNT_ACHIEVED =
  "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent";

/** Số tiền khi chưa đạt — vàng kim nổi bật */
export const CTV_HUB_RANK_REWARD_AMOUNT_PENDING =
  "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent";

export const CTV_HUB_RANK_REWARD_SUFFIX = [
  "mt-0.5 text-center text-sm font-medium leading-snug text-slate-600 sm:text-[15px]",
].join(" ");

/** @deprecated — dùng CTV_HUB_RANK_REWARD_SECTION */
export const CTV_HUB_RANK_REWARD_ROW = CTV_HUB_RANK_REWARD_SECTION;

/** @deprecated — dùng CTV_HUB_RANK_REWARD_MAIN */
export const CTV_HUB_RANK_REWARD_LEFT = CTV_HUB_RANK_REWARD_MAIN;

/** @deprecated — dùng CTV_HUB_RANK_REWARD_LINE */
export const CTV_HUB_RANK_REWARD_TEXT = CTV_HUB_RANK_REWARD_LINE;

export const CTV_HUB_RANK_REWARD_STATUS = [
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
  "text-xs font-semibold",
].join(" ");

/** @deprecated */
export const CTV_HUB_RANK_HINT = CTV_HUB_RANK_FOOTER_HINT;

/** @deprecated */
export const CTV_HUB_PROGRESS_ROW = CTV_HUB_RANK_FOOTER_ROW;

/** Tài khoản — hierarchy */
export const CTV_HUB_ACCOUNT_NAME =
  "text-lg font-bold leading-[1.35] tracking-tight text-[#0F172A] truncate lg:text-xl";

export const CTV_HUB_ACCOUNT_META = "text-sm font-medium leading-[1.5] text-slate-600";

export const CTV_HUB_ACCOUNT_SECONDARY = "text-sm font-medium leading-[1.5] text-slate-500";

export const CTV_HUB_IDENTITY_STACK = "mt-4 min-w-0 space-y-2.5";

/** @deprecated — dùng CTV_HUB_INNER_CARD + CTV_HUB_CARD_PAD */
export const CTV_V2_CARD_ACCOUNT = [CTV_HUB_INNER_CARD, CTV_HUB_CARD_PAD].join(" ");

/** @deprecated */
export const CTV_V2_ACCOUNT_TIER_IDENTITY = CTV_HUB_IDENTITY_STACK;

/** @deprecated */
export const CTV_V2_ACCOUNT_TIER_COMMISSION = "hidden";

/** Quick actions */
export const CTV_V2_ACCOUNT_TIER_ACTIONS = "mt-6 border-t border-slate-200 pt-6";

export const CTV_V2_SUBHEADING = "text-[13px] font-medium text-[#6B7280]";

export const CTV_V2_STAT_VALUE = CTV_MOBILE_KPI_VALUE;

/** KPI / detail lớn (Mã ref, hoa hồng…) */
export const CTV_V2_STAT_VALUE_DETAIL = CTV_MOBILE_KPI_VALUE;

export const CTV_V2_STAT_VALUE_MONEY = CTV_MOBILE_KPI_VALUE;

export const CTV_V2_STAT_CAPTION = `mt-1 ${CTV_MOBILE_KPI_HINT}`;

export const CTV_V2_PROGRESS_TRACK = "h-2 overflow-hidden rounded-full bg-slate-200/80";

export const CTV_V2_PROGRESS_FILL =
  "h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 transition-[width] duration-700 ease-out";

export const CTV_V2_SEGMENTED_WRAP = [
  "flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain",
  "rounded-xl bg-slate-100/90 px-2 py-1.5 shadow-inner shadow-slate-900/[0.02]",
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  "[-webkit-overflow-scrolling:touch]",
  "max-md:gap-2 max-md:px-2",
  "lg:gap-1.5 lg:rounded-2xl lg:p-1.5",
].join(" ");

export const CTV_V2_SEGMENTED_ITEM = [
  "flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl",
  "px-4 text-[13px] font-semibold text-[#6B7280]",
  CTV_V2_TOUCH,
  CTV_TAB_IDLE_HOVER,
  CTV_V2_MOTION,
  "lg:min-h-12 lg:rounded-[14px] lg:px-5 lg:py-2.5 lg:text-sm",
].join(" ");

export const CTV_V2_SEGMENTED_ITEM_ACTIVE = CTV_TAB_ACTIVE;

export const CTV_V2_PANEL_INSET = [
  CTV_V2_INSET,
  "min-w-0 overflow-hidden break-words",
  "max-md:rounded-2xl max-md:px-4 max-md:py-4",
  "lg:p-5",
].join(" ");

export const CTV_V2_INPUT = [
  "box-border min-h-11 w-full min-w-0 max-w-full break-words",
  "rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-2.5 text-sm text-[#1A1A1A] shadow-sm",
  "max-md:h-12 max-md:text-[14px]",
  CTV_V2_TOUCH,
  "placeholder:text-[#6B7280] focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/15",
  "lg:min-h-11 lg:rounded-xl lg:bg-white",
].join(" ");

export const CTV_V2_INPUT_READONLY = `${CTV_V2_INPUT} break-all`;

export const CTV_V2_SELECT = CTV_V2_INPUT;

export const CTV_V2_FORM_LABEL = "text-[13px] font-semibold text-[#6B7280]";

export const CTV_V2_FORM_CARD = `${CTV_V2_CARD} p-4 sm:p-6`;

export const CTV_V2_BTN_PRIMARY = [
  "inline-flex h-12 min-h-12 w-full items-center justify-center rounded-2xl px-5",
  "bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-semibold text-white",
  "shadow-sm shadow-blue-500/25",
  CTV_V2_TOUCH,
  "transition-all duration-200 ease-out",
  "hover:from-blue-700 hover:to-blue-600 active:scale-[0.98]",
  "max-md:text-[14px] lg:h-11 lg:w-auto lg:rounded-xl lg:hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
].join(" ");

export const CTV_V2_BTN_SECONDARY = [
  "inline-flex h-12 min-h-12 w-full items-center justify-center rounded-2xl px-5",
  "border border-slate-200/90 bg-white text-sm font-semibold text-[#1A1A1A]",
  "shadow-sm",
  CTV_V2_TOUCH,
  "transition-all duration-200 ease-out",
  "hover:bg-slate-50 active:scale-[0.98]",
  "max-md:text-[14px] lg:h-11 lg:w-auto lg:rounded-xl lg:hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
].join(" ");

export const CTV_V2_BTN_WALLET = [
  "inline-flex h-11 min-h-11 items-center justify-center gap-2",
  CTV_DS_RADIUS,
  "bg-blue-600 px-5 text-sm font-semibold text-white",
  "shadow-sm shadow-blue-500/20",
  CTV_V2_TOUCH,
  "transition-[transform,box-shadow] duration-200 ease-out",
  "hover:bg-blue-700 active:scale-[0.98]",
  "max-md:text-[14px]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
].join(" ");

/** Badge CTV cạnh tên — gradient xanh premium */
export const CTV_V2_ROLE_BADGE = [
  "inline-flex h-7 shrink-0 items-center gap-1.5",
  "rounded-full bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3b82f6]",
  "px-2.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-white",
  "shadow-[0_4px_16px_rgba(37,99,235,0.35)] ring-1 ring-white/30",
  "sm:h-8 sm:px-3 sm:text-[12px]",
].join(" ");

/** Tick xác minh cạnh SĐT — inline, tinh gọn (kiểu verified chuẩn) */
export const CTV_V2_VERIFIED_INLINE = "inline-flex shrink-0 items-center text-[#2563eb]";

/** @deprecated */
export const CTV_V2_VERIFIED_GLOW = CTV_V2_VERIFIED_INLINE;

/** @deprecated — dùng CTV_V2_ROLE_BADGE */
export const CTV_V2_BADGE_MINT = CTV_V2_ROLE_BADGE;

export const CTV_V2_AVATAR_OUTER = [
  "group relative shrink-0 rounded-full p-[3px]",
  "bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]",
  "shadow-md ring-2 ring-blue-500/20",
].join(" ");

export const CTV_V2_AVATAR_INNER = "overflow-hidden rounded-full bg-white ring-1 ring-blue-100/80";

/** Hub avatar — phụ trợ, không chiếm spotlight */
export const CTV_V2_AVATAR_SIZE = "h-16 w-16 lg:h-16 lg:w-16";

/** @deprecated — dùng CTV_V2_AVATAR_SIZE */
export const CTV_V2_AVATAR_SIZE_LEGACY = "h-24 w-24 lg:h-32 lg:w-32";

/** Render 2× max display (128×2) */
export const CTV_V2_AVATAR_IMG_PX = 256;

export const CTV_V2_AVATAR_QUALITY = 92;

export const CTV_V2_AVATAR_SIZES = "(max-width: 1024px) 64px, 64px";

export const CTV_V2_AVATAR_IMG_CLASS = [
  CTV_V2_AVATAR_SIZE,
  "rounded-full object-cover object-center",
  "contrast-[1.06] saturate-[1.05] brightness-[1.02]",
  "[image-rendering:-webkit-optimize-contrast]",
].join(" ");

export const CTV_V2_TIER_BADGE =
  "mt-2 inline-flex rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 ring-1 ring-amber-200/70";

/** Quick actions — icon trên, text dưới, căn giữa */
export const CTV_V2_PROFILE_ACTIONS_GRID =
  "grid w-full min-w-0 max-w-full grid-cols-2 gap-3 sm:grid-cols-4";

export const CTV_V2_PROFILE_ACTION_TILE = [
  "group flex min-h-[5.75rem] min-w-0 flex-col items-center justify-center gap-2 rounded-xl",
  "border border-slate-200 bg-white px-2 py-3",
  "hover:border-slate-300 hover:bg-[#F8FAFC]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/45",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

export const CTV_V2_PROFILE_ACTION_ICON = [
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] text-slate-700",
  "ring-1 ring-slate-200/80",
  "group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:ring-blue-100",
].join(" ");

export const CTV_V2_PROFILE_ACTION_LABEL =
  "w-full text-center text-sm font-semibold leading-tight text-slate-700 group-hover:text-slate-900 max-sm:text-xs";

export const CTV_V2_BTN_OUTLINE = [
  "inline-flex h-9 w-full min-w-0 items-center justify-center sm:h-10",
  CTV_TAB_RADIUS,
  "border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1A1A1A]",
  "shadow-sm",
  "transition-[transform,background-color,border-color,box-shadow] duration-[250ms] ease-out",
  "hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50/70 hover:shadow-[0_4px_14px_rgba(37,99,235,0.12)]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/50",
  "active:translate-y-0",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

export const CTV_V2_BTN_PRIMARY_BLOCK = `${CTV_V2_BTN_PRIMARY} w-full min-w-0 px-3`;

/** @deprecated */
export const CTV_V2_AVATAR_RING = CTV_V2_AVATAR_OUTER;

export const CTV_V2_RANK_BADGE = [
  "flex h-12 w-12 shrink-0 items-center justify-center sm:h-[52px] sm:w-[52px]",
  CTV_DS_RADIUS,
  "bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50/80",
  CTV_DS_SHADOW,
  "ring-1 ring-blue-100/90",
].join(" ");

/** KPI dashboard — 2×2 mobile, 1×4 desktop · số trên, nhãn dưới */
export const CTV_HUB_KPI_GRID =
  "grid w-full min-w-0 max-w-full grid-cols-2 gap-4 auto-rows-fr lg:grid-cols-4 lg:gap-4";

export const CTV_HUB_KPI_TILE = [
  "flex min-h-[7rem] min-w-0 flex-col justify-center gap-2 overflow-hidden break-words",
  "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:p-5",
  "lg:min-h-[7.5rem]",
].join(" ");

export const CTV_HUB_KPI_VALUE =
  "text-2xl font-bold tabular-nums leading-none tracking-tight text-[#0F172A] lg:text-[1.875rem]";

export const CTV_HUB_KPI_LABEL = "text-sm font-medium leading-snug text-slate-600";

export const CTV_HUB_KPI_HINT = "text-sm font-medium leading-snug text-slate-500";

/** @deprecated — dùng CTV_HUB_KPI_GRID */
export const CTV_V2_STATS_GRID_4 = CTV_HUB_KPI_GRID;

/** @deprecated — dùng CTV_HUB_KPI_TILE */
export const CTV_V2_STATS_CELL = CTV_HUB_KPI_TILE;

export const CTV_V2_STATS_GRID =
  "grid min-w-0 grid-cols-1 divide-y divide-slate-200/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0";

export const CTV_V2_LAYOUT_SHELL =
  "box-border w-full min-w-0 max-w-full max-md:mx-0 lg:mx-auto lg:max-w-[88rem]";

export const CTV_V2_STACK_GAP = "flex flex-col gap-4 max-md:gap-4 lg:gap-5";

export const CTV_MOBILE_SHARE_WRAP =
  "flex min-w-0 flex-wrap gap-2 pt-2 [-webkit-tap-highlight-color:transparent] touch-manipulation";

export const CTV_MOBILE_SHARE_BTN = [
  "inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4",
  "text-[13px] font-medium text-[#0F172A]",
  "border border-slate-200/90 bg-white shadow-sm",
  CTV_V2_TOUCH,
  "transition-all duration-200 active:scale-[0.98]",
  "hover:bg-slate-50",
].join(" ");

export const CTV_MOBILE_SHARE_BTN_PRIMARY = [
  CTV_MOBILE_SHARE_BTN,
  "border-blue-200 bg-gradient-to-br from-blue-600 to-blue-500 font-semibold text-white",
  "hover:from-blue-700 hover:to-blue-600",
].join(" ");

/** @deprecated — dùng CTV_HUB_LAYOUT_STACK */
export const CTV_V2_DASHBOARD_HEADER_GRID = CTV_HUB_ROW_SPLIT;

/** @deprecated — dùng CTV_HUB_LAYOUT_STACK */
export const CTV_V2_DASHBOARD_COL_STACK = CTV_HUB_LAYOUT_STACK;

export const CTV_V2_METRIC_GRID = CTV_MOBILE_KPI_GRID;

/** @deprecated use CTV_V2_SECTION_TITLE */
export const CTV_V2_STAT_VALUE_HERO = CTV_V2_STAT_VALUE;
export const CTV_V2_STAT_VALUE_WALLET = CTV_V2_STAT_VALUE;
export const CTV_V2_LABEL_ON_MINT = CTV_V2_LABEL_UPPER;
export const CTV_V2_WALLET_ORB = "hidden";
export const CTV_V2_WALLET_ORB_SM = "hidden";

/** Khung ngoài «Trung tâm CTV» — SaaS / affiliate dashboard */
export const CTV_HUB_MAIN_WRAP = [CTV_MOBILE_SAFE, "w-full min-w-0 pb-4 sm:pb-5 lg:px-4 lg:pb-6"].join(" ");

export const CTV_HUB_SECTION_SHELL = [
  "w-full min-w-0 overflow-hidden rounded-2xl",
  "border border-slate-200 bg-white",
  "shadow-sm",
  "p-4 lg:p-6",
].join(" ");

