/** CTV / Affiliate dashboard — design system (SaaS, mobile-first) */

import { UI_GRID_ACTIONS_STABLE, UI_GRID_KPI_STABLE } from "@/lib/ui-layout-stability";
import { CTV_MOTION_CLASS } from "./ctv-motion-tokens";

export const CTV_DS_TEXT = "text-[#1A1A1A]";
export const CTV_DS_TEXT_MUTED = "text-[#6B7280]";
export const CTV_DS_BG = "bg-white";

export const CTV_DS_SHADOW = "shadow-sm max-md:shadow-sm lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]";
/** Shell / card lớn — 16px */
export const CTV_DS_RADIUS = "rounded-2xl";
export const CTV_DS_BORDER = "border border-black/[0.05]";

/** Control (tab, button, input, nav row) — 14px */
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

/** Containment mobile CTV — clip ngang chỉ mobile; desktop để cụm thưởng không bị cắt khi zoom */
export const CTV_MOBILE_SAFE = [
  "box-border w-full max-w-full min-w-0",
  "max-lg:overflow-x-clip lg:overflow-visible",
  "max-lg:[contain:layout]",
].join(" ");

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
  "lg:rounded-2xl lg:border lg:border-black/[0.05] lg:bg-white lg:p-5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
  CTV_MOTION_CLASS.card,
].join(" ");

/**
 * Workspace CTV — Desktop: tab + panel trong một card (pt/px/pb 24px, gap 24px).
 * Mobile: `contents` — tab trên, panel card trắng dưới (giữ nguyên).
 */
export const CTV_WORKSPACE_DESKTOP_CARD = [
  "max-lg:contents",
  "lg:flex lg:min-w-0 lg:flex-col",
  "lg:rounded-2xl lg:border lg:border-black/[0.05] lg:bg-white",
  "lg:p-6 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

export const CTV_WORKSPACE_PANEL = [
  "min-w-0 overflow-hidden break-words",
  "max-lg:mt-3",
  "max-md:rounded-2xl max-md:border max-md:border-slate-200/70 max-md:bg-white/95",
  "max-md:px-4 max-md:py-4 max-md:shadow-sm max-md:backdrop-blur-sm",
  "max-md:ring-1 max-md:ring-white/40",
  "lg:mt-0 lg:border-t lg:border-slate-200/60 lg:pt-6",
].join(" ");

export const CTV_V2_INSET = `${CTV_DS_RADIUS} border border-black/[0.04] bg-slate-50/80 p-4`;

export const CTV_V2_LABEL =
  "text-[13px] font-medium leading-snug text-[#6B7280] max-md:text-[13px]";

/** Nhãn KPI — mobile 13–14px medium; desktop giữ uppercase nhỏ */
export const CTV_V2_LABEL_UPPER = [
  "text-[13px] font-medium leading-snug text-[#475569]",
  "max-lg:normal-case max-lg:tracking-normal",
  "lg:text-[11px] lg:font-semibold lg:uppercase lg:tracking-[0.06em] lg:text-[#6B7280]",
].join(" ");

/** ——— KPI grid — auto-fit minmax, cùng hàng cùng chiều cao khi zoom ——— */
export const CTV_MOBILE_KPI_GRID = UI_GRID_KPI_STABLE;

/** Grid thưởng doanh thu — mobile/tablet auto-fit; desktop 4 cột đều, cùng chiều cao. */
export const CTV_GRID_TIER_REWARDS = [
  "grid w-full min-w-0 auto-rows-fr items-stretch",
  "gap-3 sm:gap-4",
  "max-lg:grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
  "lg:grid-cols-4 lg:gap-4",
].join(" ");

export const CTV_MOBILE_KPI_LABEL = CTV_V2_LABEL_UPPER;

/** SSOT — typography số CTV/Affiliate (container query + clamp, một dòng). */
export const CTV_VALUE_NUMERIC_BASE = [
  "block min-w-0 max-w-full",
  "tabular-nums tracking-tight",
  "whitespace-nowrap",
  "leading-none",
  "[overflow-wrap:normal] [word-break:keep-all]",
].join(" ");

/** KPI card — click, đơn, số nguyên (cùng weight với tiền). */
export const CTV_METRIC_VALUE = [
  CTV_VALUE_NUMERIC_BASE,
  "font-bold text-[#0F172A]",
  "text-[length:clamp(0.6875rem,calc(0.32rem+5.25cqw),1.25rem)]",
].join(" ");

/** Tiền / hoa hồng trong KPI card (`@container/metric`). */
export const CTV_MONEY_VALUE = [
  CTV_VALUE_NUMERIC_BASE,
  "font-bold text-[#0F172A]",
  "text-[length:clamp(0.6875rem,calc(0.3rem+5cqw),1.25rem)]",
].join(" ");

/** Hero ví / doanh thu lớn (`@container/wallet`). */
export const CTV_MONEY_VALUE_LG = [
  CTV_VALUE_NUMERIC_BASE,
  "font-bold text-[#0F172A]",
  "text-[length:clamp(0.75rem,calc(0.38rem+5.5cqw),1.5rem)]",
].join(" ");

/** Ô phụ / banner / commission strip. */
export const CTV_MONEY_VALUE_SM = [
  CTV_VALUE_NUMERIC_BASE,
  "font-semibold text-[#0F172A]",
  "text-[length:clamp(0.625rem,calc(0.28rem+4.25cqw),1.0625rem)] leading-tight",
].join(" ");

/** Phần trăm KPI / conversion. */
export const CTV_PERCENT_VALUE = [
  CTV_VALUE_NUMERIC_BASE,
  "font-bold text-[#0F172A]",
  "text-[length:clamp(0.6875rem,calc(0.28rem+4.5cqw),1.125rem)]",
].join(" ");

/** Bậc co thêm theo độ dài chuỗi (dùng với `ctvValueLengthTier`). */
export const CTV_VALUE_LEN_MD = "![font-size:length:clamp(0.625rem,calc(0.26rem+4.25cqw),1.0625rem)]";
export const CTV_VALUE_LEN_LG = "![font-size:length:clamp(0.5625rem,calc(0.22rem+3.75cqw),0.9375rem)]";
export const CTV_VALUE_LEN_XL = "![font-size:length:clamp(0.5rem,calc(0.18rem+3.25cqw),0.8125rem)]";

/** KPI grid — alias metric */
export const CTV_MONEY_VALUE_MD = CTV_MONEY_VALUE;
export const CTV_MOBILE_KPI_VALUE = CTV_METRIC_VALUE;

export const CTV_MOBILE_KPI_HINT = [
  "text-[12px] font-normal leading-snug text-[#94a3b8] line-clamp-2",
  "max-md:text-[11px] max-md:leading-[1.35] max-md:text-pretty max-md:text-balance",
  "lg:text-[13px] lg:text-[#6B7280]",
].join(" ");

/** Vùng nội dung metric — không cắt số tiền khi zoom */
export const CTV_METRIC_CONTENT = "min-w-0 flex-1";

/** Card thưởng doanh thu theo hạng — viền theo cấp (Đồng/Bạc/Vàng/Kim Cương) */
export const CTV_TIER_REWARD_CARD_BASE = [
  "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl",
  "border-[1.5px] border-solid p-4 max-md:p-4 sm:p-4",
  "bg-gradient-to-br",
  "shadow-[0_4px_12px_rgba(15,23,42,0.06)]",
  "transition-all duration-200 ease-out",
  "lg:hover:-translate-y-0.5 lg:hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]",
  CTV_V2_MOTION,
].join(" ");

export const CTV_TIER_REWARD_ICON_WRAP = [
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]",
  "max-md:h-14 max-md:w-14",
  "bg-gradient-to-br shadow-inner ring-1 ring-white/70",
].join(" ");

export const CTV_TIER_REWARD_ICON_GLYPH = "h-5 w-5 max-md:h-6 max-md:w-6";

export const CTV_TIER_REWARD_TITLE_ROW = [
  "mt-2.5 flex min-w-0 items-baseline gap-x-1.5",
  "text-base font-bold leading-tight text-[#0f172a]",
  "max-md:text-[15px] max-md:leading-snug",
].join(" ");

export const CTV_TIER_REWARD_TITLE_NAME = "min-w-0 truncate max-lg:whitespace-nowrap lg:whitespace-nowrap";

export const CTV_TIER_REWARD_TITLE_COMMISSION =
  "shrink-0 whitespace-nowrap text-sm font-semibold leading-none text-slate-500";

export const CTV_TIER_REWARD_REWARD_ROW = [
  "mt-1.5 flex min-w-0 items-baseline gap-x-1",
  "text-sm font-semibold leading-snug text-[#0f172a]",
  "max-md:text-[14px]",
].join(" ");

export const CTV_TIER_REWARD_REWARD_LABEL = "shrink-0 whitespace-nowrap";

export const CTV_TIER_REWARD_BADGE_SLOT = "mt-auto flex min-h-[2rem] items-end pt-2.5 max-md:min-h-[2.25rem]";

export const CTV_TIER_REWARD_BADGE = [
  "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full",
  "px-2.5 py-1 text-[11px] font-semibold leading-none",
  "lg:px-2 lg:py-1 lg:text-[10.5px]",
  "max-md:px-3 max-md:py-1.5 max-md:text-xs",
].join(" ");

/** Chỉ mobile/tablet (<lg) — trạng thái cuối card thưởng hạng; desktop giữ `CTV_TIER_REWARD_BADGE`. */
export const CTV_TIER_REWARD_STATUS_MOBILE = [
  "max-lg:px-3.5 max-lg:py-2 max-lg:text-[13px] max-lg:leading-none max-lg:gap-2",
  "max-lg:shrink-0",
].join(" ");

export const CTV_TIER_REWARD_STATUS_SLOT_MOBILE = "max-lg:!items-center max-lg:min-h-[2.375rem]";

export const CTV_TIER_REWARD_STATUS_GRID_MOBILE = "max-lg:gap-x-2.5 max-lg:px-0.5";

export const CTV_TIER_REWARD_CARD_ACTIVE = [
  "!border-2",
  "shadow-[0_8px_24px_rgba(59,130,246,0.12)]",
  "lg:hover:shadow-[0_10px_28px_rgba(59,130,246,0.14)]",
].join(" ");

export const CTV_TIER_REWARD_BORDER_BY_CODE: Record<string, string> = {
  bronze: "border-[#D6B38A]",
  silver: "border-[#BFD4FF]",
  gold: "border-[#F5D26A]",
  diamond: "border-[#B9D8FF]",
};

export const CTV_TIER_REWARD_BORDER_FALLBACK = "border-slate-200/90";

export const CTV_TIER_REWARD_REVENUE_LABEL = [
  "text-[12px] font-medium leading-snug text-slate-500",
  "max-md:text-[13px]",
].join(" ");

export const CTV_TIER_REWARD_REVENUE_VALUE = [
  "mt-0.5 block min-w-0",
  "text-[13px] font-semibold leading-snug text-slate-700 max-md:text-sm",
  CTV_MONEY_VALUE_SM,
].join(" ");

export const CTV_TIER_REWARD_REVENUE_MOBILE = [
  "mt-1.5 text-[12px] font-medium leading-snug text-slate-500 max-lg:inline lg:hidden",
  "max-md:text-[13px]",
].join(" ");

export const CTV_TIER_REWARD_REVENUE_MOBILE_VALUE =
  "whitespace-nowrap font-semibold text-slate-700 tabular-nums";

/** Badge trạng thái (vd. Đang hoạt động) */
export const CTV_MOBILE_STATUS_BADGE = [
  "inline-flex h-8 max-h-8 shrink-0 items-center gap-1 rounded-full",
  "border border-emerald-200/90 bg-emerald-50 px-2.5",
  "text-[11px] font-semibold leading-none text-emerald-700",
].join(" ");

/** ——— Trung tâm CTV · Enterprise earning dashboard (8pt grid) ——— */

/** Nền thương hiệu CTV — cam nhạt (card tĩnh: Tài khoản, Tiến độ, Hoa hồng, …) */
export const CTV_BRAND_SURFACE = "bg-orange-50";

/** Chỉ «Cấp bậc thành viên CTV» — gradient theo hạng (UI-only, không dùng cho Hoa hồng) */
export const CTV_RANK_SURFACE_NONE = "from-stone-100/90 via-orange-50 to-amber-50";
export const CTV_RANK_SURFACE_BRONZE = "from-orange-100/40 via-amber-50 to-orange-50";
export const CTV_RANK_SURFACE_SILVER = "from-slate-100 via-slate-50/95 to-orange-50/60";
export const CTV_RANK_SURFACE_GOLD = "from-yellow-100/35 via-amber-50 to-orange-50";
export const CTV_RANK_SURFACE_DIAMOND = "from-cyan-50 via-sky-50/90 to-teal-50/50";
export const CTV_RANK_SURFACE_VIP = "from-violet-50/90 via-indigo-50/85 to-sky-50/70";

export function resolveCtvRankCardSurfaceGradient(code: string, name = ""): string {
  const key = `${code} ${name}`.toLowerCase();
  if (/vip/.test(key)) return CTV_RANK_SURFACE_VIP;
  if (/kim|diamond|kimcuong|kcuong|cương/.test(key)) return CTV_RANK_SURFACE_DIAMOND;
  if (/vang|gold|vàng/.test(key)) return CTV_RANK_SURFACE_GOLD;
  if (/bac|silver|bạc/.test(key)) return CTV_RANK_SURFACE_SILVER;
  if (/dong|bronze|đồng|đong|copper/.test(key)) return CTV_RANK_SURFACE_BRONZE;
  if (key === "none" || /tân binh|tan binh|chưa|chua|unrank/.test(key)) return CTV_RANK_SURFACE_NONE;
  return CTV_RANK_SURFACE_NONE;
}

/** Card surface: radius 16px, border 1px, shadow nhẹ — không clip nội dung khi zoom */
export const CTV_HUB_INNER_CARD = [
  "min-w-0 rounded-2xl",
  "border border-slate-200 bg-white",
  "shadow-sm",
].join(" ");

/** Padding card: ~12% gọn hơn — 14px mobile · 20px desktop */
export const CTV_HUB_CARD_PAD = "p-4 lg:p-5";

/** Shell chung Tài khoản + Cấp bậc (desktop cùng chiều cao) */
export const CTV_HUB_OVERVIEW_CARD = [
  CTV_HUB_INNER_CARD,
  CTV_HUB_CARD_PAD,
  "relative flex w-full min-w-0 flex-col overflow-visible",
  "lg:h-full",
].join(" ");

/** Header card hub — desktop cùng chiều cao hàng */
export const CTV_HUB_CARD_HEADER = [
  "relative min-w-0 shrink-0",
  "lg:flex lg:min-h-[2.5rem] lg:items-center lg:justify-between lg:gap-2.5",
].join(" ");

/** Header «Cấp bậc thành viên CTV» — desktop: tiêu đề + badge cùng hàng, gần nhau (12–16px) */
export const CTV_HUB_RANK_CARD_HEADER = [
  "relative min-w-0 shrink-0",
  "lg:flex lg:min-h-[2.5rem] lg:flex-wrap lg:items-center lg:justify-start lg:gap-x-4 lg:gap-y-1",
].join(" ");

/** Nền gradient — chỉ card «Cấp bậc thành viên CTV» */
export const CTV_HUB_RANK_CARD_SURFACE = "relative min-w-0 w-full overflow-visible bg-gradient-to-br";

/** Hoa hồng khả dụng — nền cam cố định, không theo cấp bậc */
export const CTV_HUB_WALLET_SHELL = [
  "min-w-0 rounded-2xl border border-slate-200 shadow-sm",
  CTV_BRAND_SURFACE,
  CTV_HUB_CARD_PAD,
  "relative flex w-full min-w-0 flex-col overflow-visible",
].join(" ");

/** Cấp bậc CTV — mobile: không viền; desktop: khớp CTV_HUB_INNER_CARD (gradient giữ nguyên) */
export const CTV_HUB_RANK_SHELL = [
  CTV_HUB_CARD_PAD,
  CTV_HUB_RANK_CARD_SURFACE,
  "relative flex w-full min-w-0 flex-col overflow-visible rounded-2xl",
  "max-lg:border-0 max-lg:shadow-none",
  "lg:h-full lg:border lg:border-slate-200 lg:shadow-sm",
].join(" ");

/** Tiến độ cấp bậc — mobile: phẳng; desktop: khớp CTV_HUB_INNER_CARD */
export const CTV_HUB_TIER_SHELL = [
  CTV_HUB_CARD_PAD,
  "relative flex w-full min-w-0 flex-col overflow-visible rounded-2xl bg-white",
  "max-lg:border-0 max-lg:shadow-none",
  "lg:border lg:border-slate-200 lg:shadow-sm",
].join(" ");

/**
 * Khung cha tab Tổng quan — desktop: module một khối (bo 24px, pad 24px).
 * Mobile/tablet: `contents` — không thêm lớp visual, layout giữ nguyên.
 */
export const CTV_HUB_OVERVIEW_OUTER_SHELL = [
  "w-full min-w-0",
  "max-lg:contents",
  "lg:box-border lg:flex lg:w-full lg:min-w-0 lg:flex-col lg:gap-5 lg:overflow-visible",
  "lg:rounded-3xl lg:border lg:border-slate-200 lg:bg-white lg:p-6",
  "lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

/** Panel Trung tâm CTV — bỏ khung bọc ngoài AccountPageTabPanel */
export const CTV_HUB_PAGE_PANEL = [
  "border-0 bg-transparent shadow-none",
  "rounded-2xl p-0",
  "lg:rounded-2xl lg:border-0 lg:bg-transparent lg:shadow-none lg:p-0",
  "[&_[data-account-page-header]]:w-full [&_[data-account-page-header]]:pb-4",
  "[&_[data-account-page-content]]:w-full [&_[data-account-page-content]]:min-w-0",
].join(" ");

/**
 * Tổng quan hub — gap 24px.
 * Mobile: flex + order (1→5, không đổi).
 * Desktop: grid 2 cột 50/50 — hàng 1 Tài khoản|Cấp bậc, hàng 2–4 full width.
 */
export const CTV_HUB_LAYOUT_STACK = [
  "flex w-full min-w-0 flex-col gap-4 max-lg:gap-4",
  "max-lg:overflow-x-clip lg:overflow-visible",
  "lg:grid lg:grid-cols-[minmax(0,1fr)] lg:items-stretch lg:gap-5",
].join(" ");

/**
 * Mobile: `contents` — Tài khoản/Cấp bậc order 1–2 trong stack cha.
 * Desktop: full width hàng 1, lưới auto-fit cùng hàng ngang.
 */
export const CTV_HUB_ACCOUNT_RANK_GROUP = [
  "max-lg:contents",
  "lg:col-span-2 lg:row-start-1",
  "lg:grid lg:w-full lg:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-5 lg:overflow-visible",
].join(" ");

/** Mobile: 1 Tài khoản → 2 Cấp bậc → 3 Tiến độ → 4 Hoa hồng → 5 Hiệu suất */
export const CTV_HUB_MOBILE_ORDER_IDENTITY = "min-w-0 w-full max-lg:order-1 lg:min-w-0 lg:h-full";
export const CTV_HUB_MOBILE_ORDER_RANK =
  "min-w-0 w-full max-lg:order-2 lg:min-h-0 lg:min-w-0 lg:h-full lg:overflow-visible";
export const CTV_HUB_MOBILE_ORDER_TIER = "min-w-0 w-full max-lg:order-3 lg:col-span-2 lg:row-start-2";
export const CTV_HUB_MOBILE_ORDER_WALLET = "min-w-0 w-full max-lg:order-4 lg:col-span-2 lg:row-start-3";
export const CTV_HUB_MOBILE_ORDER_PERFORMANCE = "min-w-0 w-full max-lg:order-5 lg:col-span-2 lg:row-start-4";

/** Tiêu đề card hub — 20px / 700 / #0F172A */
export const CTV_HUB_CARD_TITLE = "text-xl font-bold leading-snug text-[#0F172A]";

/** Cấp bậc — typography (ảnh mẫu gốc) */
export const CTV_HUB_RANK_NAME =
  "text-lg font-bold leading-snug text-[#0F172A] break-words text-pretty lg:text-xl";

export const CTV_HUB_RANK_META =
  "text-[13px] font-medium leading-snug text-slate-600 break-words text-pretty";

export const CTV_HUB_RANK_REVENUE = CTV_MONEY_VALUE_LG;

/** Hoa hồng khả dụng — số chính */
export const CTV_HUB_WALLET_AMOUNT = CTV_MONEY_VALUE_LG;

/** Hoa hồng chờ mở khóa — nhỏ hơn số chính, vẫn một dòng */
export const CTV_HUB_WALLET_PENDING_AMOUNT = [
  CTV_VALUE_NUMERIC_BASE,
  "font-semibold text-[#0F172A]",
  "text-[length:clamp(0.625rem,calc(0.26rem+4cqw),0.9375rem)]",
].join(" ");

/** Dấu «+» giữa số khả dụng và hoa hồng chờ mở khóa */
export const CTV_HUB_WALLET_PLUS = CTV_HUB_WALLET_PENDING_AMOUNT;

/** Hàng số tiền — mobile wrap; desktop một hàng khi đủ chỗ. */
export const CTV_HUB_WALLET_AMOUNT_ROW = [
  "@container/wallet mt-4 flex min-h-[1.75rem] min-w-0 max-w-full items-baseline",
  "max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-1",
  "gap-x-2 sm:gap-x-3 lg:flex-nowrap lg:gap-x-3",
].join(" ");

export const CTV_HUB_RANK_CAPTION =
  "text-[13px] font-medium leading-snug text-slate-500 break-words text-pretty";

/** @deprecated Dòng «Còn thiếu…» đã bỏ khỏi UI — giữ token tránh import gãy */
export const CTV_HUB_RANK_FOOTER_HINT =
  "min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-700 break-words text-pretty";

export const CTV_HUB_RANK_BADGE = [
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
  "text-xs font-bold uppercase tracking-wide ring-1",
  "lg:px-3.5 lg:py-1.5 lg:text-[15px] lg:font-extrabold lg:leading-none lg:tracking-wide",
].join(" ");

export const CTV_HUB_RANK_ICON_WRAP = [
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/70",
  "sm:h-[4rem] sm:w-[4rem]",
].join(" ");

export const CTV_HUB_RANK_BODY =
  "relative mt-2.5 flex min-w-0 items-start gap-2.5 sm:gap-3 lg:mt-3 lg:flex-1 lg:min-h-0";

export const CTV_HUB_RANK_CONTENT = "@container/wallet min-w-0 flex-1 space-y-1 text-left";

export const CTV_HUB_RANK_FOOTER =
  "relative mt-2.5 flex w-full min-w-0 flex-col gap-1.5 overflow-visible sm:gap-2 lg:mt-4 lg:shrink-0";

export const CTV_HUB_RANK_FOOTER_ROW = "flex min-w-0 items-center justify-between gap-3";

export const CTV_HUB_PROGRESS_TRACK =
  "h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-200/90 shadow-inner sm:h-3";

export const CTV_HUB_PROGRESS_PCT = "shrink-0 text-sm font-bold tabular-nums text-slate-800";

/** Tiến độ cấp bậc — rhythm 8pt, phân bổ đều từ trên xuống */
export const CTV_TIER_PROGRESS_BODY = [
  "mt-3 flex min-w-0 flex-col gap-3 sm:mt-3.5 sm:gap-3.5 lg:gap-4",
].join(" ");

export const CTV_TIER_PROGRESS_REVENUE_LABEL = "text-xs font-medium leading-snug text-slate-500";

export const CTV_TIER_PROGRESS_REVENUE_VALUE = ["@container/wallet mt-1 block min-w-0 max-w-full", CTV_MONEY_VALUE_LG].join(" ");

/** 4 ô thông tin — mobile 2×2 đều nhau; desktop auto-fit */
export const CTV_TIER_PROGRESS_STAT_GRID = [
  "grid w-full min-w-0 auto-rows-fr items-stretch",
  "max-md:grid-cols-2 max-md:gap-2.5",
  "gap-2 sm:gap-3",
  "lg:grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]",
].join(" ");

export const CTV_TIER_PROGRESS_STAT_CELL = [
  "@container/metric flex h-full min-h-[4.5rem] min-w-0 flex-col justify-center rounded-xl lg:min-h-12",
  "border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 max-md:shadow-none",
  "sm:min-h-[3.75rem] sm:rounded-[14px] sm:border-slate-100/90 sm:bg-slate-50/70 sm:px-3",
].join(" ");

/** KPI analytics compact */
export const CTV_ANALYTICS_KPI_TILE =
  "@container/metric overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm";

export const CTV_TIER_PROGRESS_STAT_LABEL = "text-[11px] font-medium leading-tight text-slate-500 sm:text-xs";

export const CTV_TIER_PROGRESS_STAT_VALUE = [
  "mt-1 min-w-0 text-sm font-semibold leading-snug text-[#0F172A]",
  "break-words text-pretty",
].join(" ");

export const CTV_TIER_PROGRESS_REMAINING = "text-sm leading-relaxed text-slate-600";

export const CTV_TIER_PROGRESS_PROGRESS_BLOCK = [
  "flex min-w-0 flex-col gap-1.5 pb-1 sm:gap-2 sm:pb-1.5",
].join(" ");

export const CTV_TIER_PROGRESS_PROGRESS_HEAD = "flex min-w-0 items-center justify-between gap-3";

export const CTV_TIER_PROGRESS_PROGRESS_LABEL = "min-w-0 text-xs font-medium text-slate-500";

export const CTV_TIER_PROGRESS_PROGRESS_PCT = [
  CTV_HUB_PROGRESS_PCT,
  "ml-auto shrink-0 text-right",
].join(" ");

/** Divider mờ phân tách section — dùng chung hub */
export const CTV_HUB_SECTION_DIVIDER = [
  "mx-auto h-px w-[36%] min-w-[6.5rem] max-w-[11rem] shrink-0",
  "bg-gradient-to-r from-transparent via-slate-400/12 to-transparent",
].join(" ");

/**
 * Khu vực thưởng — 3 tầng: [tiến độ] → pt → [divider] → gap → [hàng thưởng] → pb
 * pt ≈ gap ≈ pb để cụm thưởng căn giữa theo chiều dọc.
 */
export const CTV_HUB_RANK_REWARD_SECTION = [
  "mt-2.5 flex w-full min-w-0 flex-col items-center justify-center overflow-visible",
  "gap-2.5 px-1 pb-1.5 pt-2.5 sm:gap-3 sm:px-2 sm:pb-2 sm:pt-3",
].join(" ");

/** Vùng bọc — full width, container query thu font khi card hẹp (zoom 150–200%) */
export const CTV_HUB_RANK_REWARD_BODY = [
  "@container/reward flex w-full min-w-0 items-center justify-center overflow-visible",
  "py-1 sm:py-1.5",
].join(" ");

/**
 * Một hàng: [quà] Thưởng: 500.000₫ khi đạt yêu cầu [khóa + trạng thái]
 * Font-size clamp — icon/badge dùng `em` scale đồng bộ khi zoom.
 */
export const CTV_HUB_RANK_REWARD_ROW = [
  "flex w-full min-w-0 max-w-full flex-nowrap items-center justify-center",
  "gap-[clamp(0.2rem,0.3em,0.45rem)]",
  "overflow-visible",
  "text-[length:clamp(0.5625rem,2.2vw,1rem)] leading-none whitespace-nowrap text-slate-800",
  "@max-[20rem]/reward:text-[length:clamp(0.5rem,1.75vw,0.875rem)]",
  "@max-[16rem]/reward:text-[length:clamp(0.4375rem,1.5vw,0.75rem)]",
].join(" ");

export const CTV_HUB_RANK_REWARD_GIFT_ICON = [
  "inline-flex shrink-0 items-center justify-center rounded-md",
  "h-[2em] w-[2em] min-h-[2em] min-w-[2em]",
  "mr-[0.4em]",
  "bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500",
  "shadow-[0_0.35em_0.9em_rgba(245,158,11,0.38)] ring-1 ring-amber-300/55",
].join(" ");

export const CTV_HUB_RANK_REWARD_GIFT_GLYPH = "h-[1em] w-[1em] shrink-0 text-amber-950";

export const CTV_HUB_RANK_REWARD_LABEL = "shrink-0 font-semibold whitespace-nowrap";

export const CTV_HUB_RANK_REWARD_AMOUNT = [
  "shrink-0 font-semibold tabular-nums whitespace-nowrap leading-none",
  "text-[1em]",
].join(" ");

/** Số tiền khi đã đạt mốc — xanh lá hệ thống */
export const CTV_HUB_RANK_REWARD_AMOUNT_ACHIEVED =
  "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent";

/** Số tiền khi chưa đạt — vàng kim nổi bật */
export const CTV_HUB_RANK_REWARD_AMOUNT_PENDING =
  "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent";

export const CTV_HUB_RANK_REWARD_SUFFIX = "shrink-0 font-medium whitespace-nowrap text-slate-600";

export const CTV_HUB_RANK_REWARD_LOCK_GLYPH = "h-[1.18em] w-[1.18em] shrink-0";

export const CTV_HUB_RANK_REWARD_STATUS = [
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full",
  "gap-[0.45em] px-[0.55em] py-[0.2em]",
  "text-[0.8125em] font-semibold leading-none",
].join(" ");

/** Tài khoản — hierarchy */
export const CTV_HUB_ACCOUNT_NAME = [
  "text-xl font-extrabold leading-[1.3] tracking-tight text-[#0F172A]",
  "break-words text-pretty max-lg:truncate lg:text-[1.375rem] lg:whitespace-normal",
].join(" ");

export const CTV_HUB_ACCOUNT_META = [
  "text-[13px] font-medium leading-snug text-slate-600",
  "sm:text-sm sm:leading-[1.45]",
].join(" ");

export const CTV_HUB_ACCOUNT_SECONDARY = [
  "text-[13px] font-medium leading-snug text-slate-500",
  "sm:text-sm sm:leading-[1.45]",
].join(" ");

/** Khối thông tin tài khoản — avatar trái, chi tiết phải */
export const CTV_HUB_IDENTITY_STACK = "mt-3 min-w-0 lg:mt-3.5 lg:flex-1 lg:min-h-0";

export const CTV_HUB_IDENTITY_BODY = [
  "flex min-w-0 items-center gap-4",
  "sm:gap-5 lg:gap-6",
].join(" ");

export const CTV_HUB_IDENTITY_AVATAR_WRAP = "shrink-0";

export const CTV_HUB_IDENTITY_DETAILS = "min-w-0 flex-1 flex flex-col gap-2 sm:gap-2.5";

export const CTV_HUB_IDENTITY_NAME_ROW = [
  "flex min-w-0 flex-wrap items-center gap-2.5",
  "lg:gap-3",
].join(" ");

export const CTV_HUB_IDENTITY_CONTACT_ROW = "flex min-w-0 items-center gap-2";

export const CTV_HUB_IDENTITY_REF_ROW = [
  "flex min-w-0 max-lg:flex-wrap items-center gap-2.5",
  "lg:flex-nowrap lg:gap-3",
].join(" ");

export const CTV_HUB_IDENTITY_REF_TEXT =
  "min-w-0 truncate max-lg:max-w-full lg:whitespace-nowrap";

export const CTV_HUB_IDENTITY_COPY_BTN = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg",
  "border border-slate-200/90 bg-white px-3 text-[13px] font-semibold text-slate-700",
  "shadow-sm hover:bg-[#F8FAFC]",
  CTV_V2_MOTION,
  CTV_V2_TOUCH,
].join(" ");

/** Quick actions */
export const CTV_V2_ACCOUNT_TIER_ACTIONS =
  "mt-5 shrink-0 border-t border-slate-200 pt-5 lg:mt-auto";

export const CTV_V2_STAT_VALUE = CTV_MOBILE_KPI_VALUE;

export const CTV_V2_STAT_CAPTION = `mt-1 ${CTV_MOBILE_KPI_HINT}`;

/** Segmented tab — SSOT (CTV / Affiliate workspace + analytics/campaign hubs). */
export const CTV_SEGMENTED_WRAP = [
  "flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain",
  "rounded-2xl bg-slate-100/90 px-2 py-2 shadow-inner shadow-slate-900/[0.02]",
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  "[-webkit-overflow-scrolling:touch]",
  "max-md:gap-2 max-md:px-2",
  "lg:gap-2 lg:rounded-2xl lg:p-2",
].join(" ");

/** Thanh tab ngang — scroll mobile/tablet; desktop wrap (analytics, tracking, …). */
export const CTV_HORIZONTAL_TAB_SCROLL = [
  "flex w-full min-w-0 max-w-full items-center gap-2",
  "rounded-2xl bg-slate-100/90 px-2 py-2 shadow-inner shadow-slate-900/[0.02]",
  "overflow-x-auto overflow-y-hidden overscroll-x-contain",
  "[-webkit-overflow-scrolling:touch]",
  "touch-pan-x [touch-action:pan-x]",
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  "max-lg:flex-nowrap max-lg:justify-start",
  "lg:flex-wrap lg:overflow-x-visible lg:overflow-y-visible",
].join(" ");

export const CTV_SEGMENTED_ITEM = [
  "flex h-10 shrink-0 items-center justify-center whitespace-nowrap",
  CTV_TAB_RADIUS,
  "px-4 text-[13px] font-semibold text-slate-600",
  CTV_V2_TOUCH,
  CTV_TAB_IDLE_HOVER,
  CTV_V2_MOTION,
  "lg:min-h-12 lg:flex-1 lg:px-4 lg:py-2 lg:text-sm",
].join(" ");

export const CTV_SEGMENTED_ITEM_ACTIVE = CTV_TAB_ACTIVE;

/** Icon + label tab (Campaign, Tracking, …) — cùng box model active/inactive. */
export const CTV_SEGMENTED_ICON = [
  "size-4 shrink-0 opacity-90",
  "[&>svg]:block [&>svg]:size-full",
  "pointer-events-none",
].join(" ");

export const CTV_SEGMENTED_LABEL = "inline-block leading-none";

export const CTV_SEGMENTED_ITEM_ICON = [
  CTV_SEGMENTED_ITEM,
  "inline-flex gap-2",
  "box-border ring-1 ring-inset ring-transparent",
].join(" ");

/** Segment nhỏ trong card (metric toggle, cửa sổ realtime). */
export const CTV_SEGMENTED_PILL_ITEM = [
  "inline-flex h-8 shrink-0 items-center justify-center rounded-[14px] px-2.5 lg:h-10 lg:min-h-10",
  "text-[11px] font-bold whitespace-nowrap text-slate-600",
  CTV_V2_TOUCH,
  CTV_TAB_IDLE_HOVER,
].join(" ");

export const CTV_SEGMENTED_PILL_ITEM_ACTIVE = [
  CTV_TAB_RADIUS,
  "inline-flex h-8 shrink-0 items-center justify-center border border-blue-300/80 px-2.5",
  "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-[11px] font-bold text-white",
  "shadow-sm shadow-blue-500/20",
  "transition-[background-color,box-shadow,color] duration-200 ease-out",
].join(" ");

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
  "lg:min-h-12 lg:rounded-[14px] lg:bg-white",
].join(" ");

export const CTV_V2_INPUT_READONLY = `${CTV_V2_INPUT} break-all`;

export const CTV_V2_SELECT = CTV_V2_INPUT;

export const CTV_V2_FORM_LABEL = "text-[13px] font-semibold text-[#6B7280]";

export const CTV_V2_FORM_CARD = `${CTV_V2_CARD} p-4 sm:p-6`;

/**
 * @deprecated Giữ export compatibility — không alias sang CTV_CTA_PRIMARY (khác gradient, h-12, rounded-2xl).
 * Consumer mới trong account shell: CTV_CTA_PRIMARY (affiliate-ctv-account-ui-tokens).
 */
export const CTV_V2_BTN_PRIMARY = [
  "inline-flex h-12 min-h-12 w-full items-center justify-center rounded-2xl px-5",
  "bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-semibold text-white",
  "shadow-sm shadow-blue-500/25",
  CTV_V2_TOUCH,
  "transition-all duration-200 ease-out",
  "hover:from-blue-700 hover:to-blue-600 active:scale-[0.98]",
  "max-md:text-[14px] lg:h-12 lg:min-h-12 lg:w-auto lg:rounded-[14px] lg:hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
].join(" ");

/**
 * @deprecated Giữ export compatibility — không alias sang CTV_CTA_SECONDARY (khác h-12, rounded-2xl, w-full).
 * Consumer mới trong account shell: CTV_CTA_SECONDARY (affiliate-ctv-account-ui-tokens).
 */
export const CTV_V2_BTN_SECONDARY = [
  "inline-flex h-12 min-h-12 w-full items-center justify-center rounded-2xl px-5",
  "border border-slate-200/90 bg-white text-sm font-semibold text-[#1A1A1A]",
  "shadow-sm",
  CTV_V2_TOUCH,
  "transition-all duration-200 ease-out",
  "hover:bg-slate-50 active:scale-[0.98]",
  "max-md:text-[14px] lg:h-12 lg:min-h-12 lg:w-auto lg:rounded-[14px] lg:hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
].join(" ");

export const CTV_V2_BTN_WALLET = [
  "inline-flex h-11 min-h-11 items-center justify-center gap-2 lg:h-12 lg:min-h-12",
  CTV_TAB_RADIUS,
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
  "inline-flex h-7 shrink-0 items-center gap-1.5 self-center",
  "rounded-full bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3b82f6]",
  "px-2.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-white",
  "shadow-[0_4px_16px_rgba(37,99,235,0.35)] ring-1 ring-white/30",
  "sm:h-8 sm:px-3 sm:text-[12px] lg:h-8 lg:px-3.5",
].join(" ");

/** Tick xác minh cạnh SĐT — inline, tinh gọn (kiểu verified chuẩn) */
export const CTV_V2_VERIFIED_INLINE = "inline-flex shrink-0 items-center text-[#2563eb]";

export const CTV_V2_AVATAR_OUTER = [
  "group relative shrink-0 rounded-full p-[3px]",
  "bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]",
  "shadow-md ring-2 ring-blue-500/20",
].join(" ");

export const CTV_V2_AVATAR_INNER = "overflow-hidden rounded-full bg-white ring-1 ring-blue-100/80";

/** Hub avatar — +~30% mobile · +~43% desktop (56px → 72/80px) */
export const CTV_V2_AVATAR_SIZE = "h-[4.5rem] w-[4.5rem] lg:h-20 lg:w-20";

/** Render ≥2× kích thước hiển thị tối đa (80px → 160px+) */
export const CTV_V2_AVATAR_IMG_PX = 320;

export const CTV_V2_AVATAR_QUALITY = 95;

export const CTV_V2_AVATAR_SIZES = "(max-width: 1024px) 72px, 80px";

export const CTV_V2_AVATAR_IMG_CLASS = [
  CTV_V2_AVATAR_SIZE,
  "rounded-full object-cover object-center",
  "contrast-[1.04] saturate-[1.04]",
  "[image-rendering:auto]",
].join(" ");

export const CTV_V2_AVATAR_PLACEHOLDER_TEXT = "text-2xl font-bold text-slate-700 lg:text-3xl";

/** Quick actions — mobile: auto-fit; desktop: 4 cột 1 hàng, icon/label đồng nhất */
export const CTV_V2_PROFILE_ACTIONS_GRID = [
  UI_GRID_ACTIONS_STABLE,
  "lg:grid-cols-4 lg:gap-2",
].join(" ");

export const CTV_V2_PROFILE_ACTION_TILE = [
  "group flex min-h-[5.25rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[14px] lg:min-h-12",
  "border border-slate-200 bg-white px-2 py-2.5",
  CTV_MOTION_CLASS.base,
  "hover:border-slate-300 hover:bg-[#F8FAFC] hover:shadow-sm",
  "active:border-slate-300 active:bg-slate-100/80 active:shadow-sm",
  "focus-visible:border-slate-300 focus-visible:bg-[#F8FAFC] focus-visible:shadow-sm",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/45",
  "disabled:pointer-events-none disabled:opacity-40",
  "lg:min-h-0 lg:h-full lg:gap-1.5 lg:rounded-lg lg:px-1 lg:py-2",
].join(" ");

export const CTV_V2_PROFILE_ACTION_ICON = [
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#F8FAFC] text-slate-700",
  "ring-1 ring-slate-200/80",
  CTV_MOTION_CLASS.base,
  "group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:ring-blue-100",
  "group-active:bg-blue-50 group-active:text-blue-700 group-active:ring-blue-100",
  "group-focus-visible:bg-blue-50 group-focus-visible:text-blue-700 group-focus-visible:ring-blue-100",
  "lg:h-9 lg:w-9 lg:rounded-lg",
].join(" ");

export const CTV_V2_PROFILE_ACTION_LABEL = [
  "w-full min-w-0 text-center text-sm font-semibold leading-tight text-slate-700",
  CTV_MOTION_CLASS.base,
  "group-hover:text-slate-900 group-active:text-slate-900 group-focus-visible:text-slate-900",
  "max-sm:text-xs",
  "lg:text-[11px] lg:leading-4 lg:whitespace-nowrap lg:overflow-hidden lg:text-ellipsis",
].join(" ");

/** KPI dashboard — 2×2 mobile, 1×4 desktop · số trên, nhãn dưới */
export const CTV_HUB_KPI_GRID = UI_GRID_KPI_STABLE;

export const CTV_HUB_KPI_TILE = [
  "@container/metric flex h-full min-h-[6.5rem] min-w-0 flex-col justify-center gap-1.5 overflow-hidden",
  "rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 lg:gap-2 lg:p-5",
].join(" ");

export const CTV_HUB_KPI_LABEL = [
  "text-sm font-medium leading-snug text-slate-600",
  "max-lg:break-words lg:whitespace-nowrap lg:break-normal",
].join(" ");

/** Nhãn metric strip (Hoa hồng & đối soát) — desktop một dòng. */
export const CTV_METRIC_STRIP_LABEL = [
  "text-[11px] font-semibold uppercase tracking-wide text-slate-500",
  "max-lg:break-words",
  "lg:whitespace-nowrap lg:break-normal lg:tracking-wide",
].join(" ");

/** Tile metric strip — không ép wrap nhãn trên desktop. */
export const CTV_METRIC_STRIP_TILE = [
  "@container/metric min-w-0 overflow-hidden rounded-2xl border border-black/[0.04] bg-slate-50/80",
  "p-3 transition-[transform,box-shadow] duration-[250ms] ease-out",
  "hover:-translate-y-0.5 hover:shadow-md",
  "max-lg:break-words max-lg:rounded-2xl max-lg:p-3",
  "sm:p-4 lg:p-5 lg:break-normal",
].join(" ");

/** Grid 3 cột metric strip — desktop chia đều, mobile auto-fit. */
export const CTV_METRIC_STRIP_GRID_3 = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-2 sm:gap-3",
  "max-lg:grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]",
  "lg:grid-cols-3 lg:gap-4",
].join(" ");

export const CTV_HUB_KPI_HINT = "text-sm font-medium leading-snug text-slate-500";

export const CTV_V2_STATS_GRID =
  "grid min-w-0 grid-cols-1 divide-y divide-slate-200/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0";

export const CTV_V2_LAYOUT_SHELL = [
  "box-border w-full min-w-0 max-w-full max-md:mx-0",
  "max-lg:overflow-x-clip lg:overflow-visible",
  "lg:mx-auto lg:max-w-[88rem]",
].join(" ");

export const CTV_V2_STACK_GAP = "flex flex-col gap-4 max-md:gap-4 lg:gap-5";

export const CTV_MOBILE_SHARE_WRAP =
  "flex min-w-0 flex-wrap gap-2 pt-2 [-webkit-tap-highlight-color:transparent] touch-manipulation";

export const CTV_MOBILE_SHARE_BTN = [
  "inline-flex h-10 shrink-0 items-center justify-center rounded-[14px] px-4 lg:h-12 lg:min-h-12",
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

/** Khung ngoài «Trung tâm CTV» — SaaS / affiliate dashboard */
export const CTV_HUB_MAIN_WRAP = [CTV_MOBILE_SAFE, "w-full min-w-0 pb-4 sm:pb-5 lg:pb-6"].join(" ");

export const CTV_HUB_SECTION_SHELL = [
  "w-full min-w-0 max-lg:overflow-x-clip lg:overflow-visible rounded-2xl",
  "border border-slate-200 bg-white",
  "shadow-sm",
  "p-4 lg:px-6 lg:pb-6 lg:pt-0",
].join(" ");

