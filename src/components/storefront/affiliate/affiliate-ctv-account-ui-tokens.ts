/** Token UI — shell tài khoản CTV premium (mint + blue) */

import { CTV_MOTION_CLASS } from "../ctv/ctv-motion-tokens";
import {
  CTV_METRIC_VALUE,
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
  "lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-6",
].join(" ");

export const CTV_SIDEBAR_ASIDE =
  "hidden min-h-0 w-full min-w-0 md:flex lg:h-fit lg:max-w-full lg:flex-col lg:self-start lg:sticky lg:top-0";

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

export const CTV_TYPE_METRIC_VALUE = ["mt-1.5 block min-w-0 max-w-full", CTV_METRIC_VALUE].join(" ");

export const CTV_TYPE_METRIC_HINT =
  "mt-1.5 text-[12px] font-normal leading-snug text-[#94a3b8] line-clamp-2 max-md:text-[12px] lg:mt-2 lg:text-xs lg:text-slate-500";

/** Sidebar floating card — chiều cao theo menu, không stretch full viewport */
export const CTV_SIDEBAR_SHELL = [
  "flex h-fit w-full flex-col",
  "rounded-2xl bg-white p-4",
  "border border-black/[0.05]",
  "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
  "lg:p-6",
].join(" ");

export const CTV_PROFILE_SHELL =
  "rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05] sm:p-6";

export const CTV_CONTENT_SURFACE = [
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm ring-1 ring-white/40 max-md:px-4 max-md:py-4 sm:p-6 sm:pt-6",
  "max-lg:overflow-x-clip lg:overflow-visible lg:pt-0",
].join(" ");

export const CTV_MOBILE_PANEL_FLAT = "";

export const CTV_CONTENT_PANEL = `w-full min-w-0 ${CTV_CONTENT_SURFACE} ${CTV_MOBILE_PANEL_FLAT}`;

export const CTV_BLOCK =
  "rounded-2xl border border-black/[0.04] bg-slate-50/80 p-4 lg:p-5";

export const CTV_OVERVIEW_TILE =
  "flex min-h-[7.5rem] flex-col rounded-2xl border border-black/[0.04] bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm lg:min-h-[8rem] lg:p-5";

export const CTV_NAV_ROW = [
  "flex w-full min-h-[3rem] items-center gap-3 px-4 py-2",
  CTV_TAB_RADIUS,
  "text-left text-sm font-medium text-slate-700",
  CTV_MOTION_CLASS.base,
  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35",
  "lg:min-h-12",
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
  "flex h-10 w-10 shrink-0 items-center justify-center",
  CTV_TAB_RADIUS,
  "bg-slate-100 text-slate-500",
  CTV_MOTION_CLASS.base,
].join(" ");

export const CTV_NAV_ICON_ACTIVE =
  "bg-[#BFE4FF] text-[#0F4C81] shadow-sm ring-1 ring-[#A7D8FF]";

export const CTV_NAV_ROW_SIGNOUT = [
  "flex w-full min-h-12 shrink-0 items-center gap-3 px-4 py-2",
  CTV_TAB_RADIUS,
  "text-left text-sm font-semibold text-rose-700/90",
  CTV_MOTION_CLASS.base,
  "hover:bg-rose-50/90",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/50",
  "lg:min-h-12",
].join(" ");

export const CTV_NAV_ICON_SIGNOUT = "bg-rose-50 text-rose-600 ring-1 ring-rose-100/90";

export const CTV_METRIC_TILE = [
  "@container/metric flex min-h-[5.5rem] min-w-0 flex-col justify-between overflow-hidden max-lg:h-full lg:h-auto",
  "rounded-2xl border border-slate-200/75 bg-white p-3",
  "shadow-[0_2px_10px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03]",
  CTV_MOTION_CLASS.card,
  "sm:min-h-[5.75rem] sm:p-4",
  "lg:border-slate-200/70 lg:bg-white/95 lg:p-5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
].join(" ");

export const CTV_METRIC_TILE_ACCENT = [
  "@container/metric flex min-h-[5.5rem] min-w-0 flex-col justify-between overflow-hidden max-lg:h-full lg:h-auto",
  "rounded-2xl border border-emerald-100/85 bg-gradient-to-br from-emerald-50/95 to-white p-3",
  "shadow-[0_2px_10px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100/50",
  CTV_MOTION_CLASS.card,
  "sm:min-h-[5.75rem] sm:p-4",
  "lg:border-slate-200/70 lg:p-5 lg:shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
].join(" ");

export const CTV_METRIC_ICON = [
  "flex h-8 w-8 shrink-0 items-center justify-center",
  CTV_TAB_RADIUS,
  "bg-white text-slate-500 shadow-sm ring-1 ring-slate-100/90",
  "sm:h-9 sm:w-9 lg:h-10 lg:w-10",
].join(" ");

export const CTV_METRIC_ICON_ACCENT =
  "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-emerald-100/90";

export const CTV_CTA_PRIMARY = [
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center px-5 text-sm font-semibold text-white",
  CTV_TAB_RADIUS,
  "bg-blue-600 shadow-sm shadow-blue-500/20 touch-manipulation [-webkit-tap-highlight-color:transparent]",
  "transition-[transform,box-shadow] duration-200 ease-out hover:bg-blue-700 active:scale-[0.98]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
  "max-md:w-full max-md:justify-center max-md:text-[14px] lg:h-12 lg:min-h-12 lg:hover:-translate-y-0.5",
].join(" ");

export const CTV_CTA_SECONDARY = [
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center px-5 text-sm font-semibold text-[#1A1A1A]",
  CTV_TAB_RADIUS,
  "border border-slate-200/90 bg-white shadow-sm touch-manipulation [-webkit-tap-highlight-color:transparent]",
  "transition-[transform,background-color] duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
  "max-md:w-full max-md:justify-center max-md:text-[14px] lg:h-12 lg:min-h-12 lg:hover:-translate-y-0.5",
].join(" ");

export const CTV_CTA_ACCENT = [
  "inline-flex h-11 min-h-11 shrink-0 items-center justify-center px-5 text-sm font-semibold text-white",
  CTV_TAB_RADIUS,
  "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_8px_20px_rgba(245,158,11,0.25)]",
  "transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-0.5",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
  "lg:h-12 lg:min-h-12",
].join(" ");

/** Shell trang dashboard (Analytics / Campaign / Tracking). */
export const CTV_DASHBOARD_SHELL = [
  "relative w-full min-w-0 flex-1 overflow-x-hidden",
  CTV_CONTENT_SURFACE,
  "lg:pt-0",
  "[-webkit-font-smoothing:antialiased]",
].join(" ");

/** Panel / section card (CreatorSectionShell, traffic insights…) — nền trắng, đồng bộ khu vực dữ liệu. */
export const CTV_SECTION_CARD = [
  "flex min-w-0 flex-col",
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-slate-200/70 bg-white shadow-sm",
  "px-4 py-4 max-md:px-3 max-md:py-3.5",
  "sm:p-6 sm:pt-6",
  "overflow-visible max-md:overflow-x-clip",
  "lg:h-auto lg:flex-none lg:shrink-0 lg:pt-0",
].join(" ");

/** Tracking workspace — root + vùng nội dung tab (desktop co theo dữ liệu). */
export const CTV_TRACKING_WORKSPACE_ROOT = [
  "flex w-full min-w-0 max-w-full flex-col",
  "gap-5 sm:gap-6",
  "max-lg:min-h-0 max-lg:flex-1",
  "lg:h-auto lg:flex-none lg:shrink-0 lg:gap-5",
].join(" ");

export const CTV_TRACKING_TAB_VIEW = "w-full min-w-0 max-lg:flex-1 max-lg:min-h-0 lg:h-auto lg:flex-none lg:shrink-0";

export const CTV_TRACKING_SECTION_SHELL = "lg:h-auto lg:flex-none lg:shrink-0";

export const CTV_TRACKING_METRIC_GRID = [
  "grid w-full min-w-0 grid-cols-2 gap-3",
  "sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]",
  "auto-rows-fr items-stretch max-lg:[&>*]:min-h-0 max-lg:[&>*]:min-w-0",
  "lg:auto-rows-auto lg:items-start lg:gap-4 lg:[&>*]:h-auto",
].join(" ");

export const CTV_TRACKING_PIXEL_GRID = [
  "grid w-full min-w-0 gap-4",
  "md:grid-cols-2 md:gap-4",
  "auto-rows-fr max-lg:[&>*]:min-h-0",
  "lg:grid-cols-4 lg:items-start lg:gap-4 lg:auto-rows-auto lg:[&>*]:h-auto",
].join(" ");

/** Tab Thống kê truy cập — 2 cột 50/50, cùng chiều cao (chỉ desktop). */
export const CTV_TRAFFIC_TAB_PAIR_ROW = [
  "grid w-full min-w-0 gap-4",
  "lg:grid-cols-2 lg:items-stretch lg:gap-4",
  "lg:min-h-[min(42vh,26rem)]",
].join(" ");

export const CTV_TRAFFIC_TAB_CHART_COL = "lg:flex lg:h-full lg:min-h-0 lg:flex-col";

export const CTV_TRAFFIC_TAB_LANDING_COL = "lg:flex lg:h-full lg:min-h-0 lg:flex-col";

/** Ghi đè padding CTV_SECTION_CARD (sm:p-6) — mở rộng vùng dữ liệu trên desktop. */
export const CTV_TRAFFIC_TAB_SHELL = [
  "flex h-full min-h-0 w-full flex-col",
  "lg:!h-full lg:!min-h-0 lg:!flex-1 lg:!p-3",
  "lg:[&>*:first-child]:min-h-0 lg:[&>*:first-child]:shrink-0 lg:[&>*:first-child]:pb-1.5",
].join(" ");

export const CTV_TRAFFIC_TAB_SHELL_BODY = [
  "flex min-h-0 flex-1 flex-col",
  "lg:min-h-0 lg:w-full lg:overflow-hidden",
].join(" ");

export const CTV_TRAFFIC_TAB_BODY = [
  "mt-2 flex w-full min-h-[15rem] flex-1 flex-col",
  "sm:min-h-[16rem]",
  "lg:mt-1 lg:min-h-0",
].join(" ");

/** Vùng nội dung chart / bảng — chiếm tối đa chiều cao card. */
export const CTV_TRAFFIC_TAB_BODY_FILL = "min-h-0 flex-1 w-full";

/** Empty / loading — căn giữa ngang + dọc trong vùng fill. */
export const CTV_TRAFFIC_TAB_BODY_CENTER = [
  "flex flex-col items-center justify-center",
  CTV_TRAFFIC_TAB_BODY_FILL,
].join(" ");

/** Khung rỗng ~88% × ~75% vùng nội dung, icon & copy nổi hơn (chỉ tab Traffic). */
export const CTV_TRAFFIC_TAB_EMPTY_STATE = [
  "box-border flex w-[90%] max-w-none flex-1 flex-col items-center justify-center",
  "min-h-[min(75%,13rem)] max-lg:min-h-[11rem] max-lg:w-[92%]",
  "py-7 sm:py-9",
  "[&_svg]:!mb-3 [&_svg]:!h-10 [&_svg]:!w-10 sm:[&_svg]:!h-12 sm:[&_svg]:!w-12",
  "[&>p:nth-child(2)]:text-base [&>p:nth-child(2)]:font-semibold",
  "[&>p:last-child]:max-w-[28rem] [&>p:last-child]:text-sm [&>p:last-child]:leading-relaxed",
].join(" ");

/** Skeleton / placeholder loading — full vùng nội dung. */
export const CTV_TRAFFIC_TAB_LOADING_FILL = [
  CTV_TRAFFIC_TAB_BODY_FILL,
  "min-h-[70%] w-full rounded-xl",
  "max-lg:min-h-[12rem]",
].join(" ");

/** Vùng chart full-bleed trong card (desktop). */
export const CTV_TRAFFIC_TAB_CHART_BOX = [
  "flex min-h-0 w-full flex-1 flex-col",
  "h-full lg:min-h-[17rem]",
  "[&>*]:h-full [&>*]:min-h-0 [&>*]:w-full",
].join(" ");

export const CTV_TRAFFIC_TAB_TABLE_AREA = [
  "flex min-h-0 w-full flex-1 flex-col",
  "lg:mt-0 lg:min-h-0 lg:w-full",
].join(" ");

export const CTV_TRAFFIC_TAB_TABLE_SCROLL = [
  "min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto overscroll-y-contain",
  "rounded-xl border border-[#F1F5F9]",
  "lg:h-full lg:max-h-none lg:rounded-lg lg:border-slate-200/80",
  "[-webkit-overflow-scrolling:touch]",
].join(" ");

/** Danh sách landing mobile — scroll nội bộ, không kéo cao card. */
export const CTV_TRAFFIC_TAB_MOBILE_LIST = [
  "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5",
  "max-h-[min(52vh,22rem)] sm:max-h-[min(56vh,24rem)]",
  "[-webkit-overflow-scrolling:touch]",
].join(" ");

/** Cột bảng landing — phân bổ đều trên desktop. */
export const CTV_TRAFFIC_TAB_TABLE_COL_LANDING = "w-[34%] lg:w-[36%]";

export const CTV_TRAFFIC_TAB_TABLE_COL_METRIC = "w-[16.5%] lg:w-[16%]";

export const CTV_TRAFFIC_TAB_TABLE_TH = "px-1.5 py-1.5 sm:px-2 lg:px-2 lg:py-1.5";

export const CTV_TRAFFIC_TAB_TABLE_TD = "px-1.5 py-1.5 sm:px-2 lg:px-2 lg:py-1.5";

/** Chiều cao chuẩn vùng biểu đồ / dữ liệu trong card analytics (px). */
export const CTV_ANALYTICS_CHART_CONTAINER_HEIGHT_PX = 220;

/** Analytics dashboard — stack tổng quan (5 hàng + Realtime cuối full width). */
export const CTV_ANALYTICS_OVERVIEW_STACK = [
  "flex w-full min-w-0 max-w-full flex-col overflow-x-hidden",
  "gap-3 max-md:gap-3 sm:gap-5 lg:gap-6",
].join(" ");
/** Cặp card 50/50 desktop, 1 cột mobile; cùng chiều cao hàng. */
export const CTV_ANALYTICS_CHART_ROOT = "flex w-full min-w-0 max-w-full flex-col gap-4 sm:gap-5 lg:gap-5";
export const CTV_ANALYTICS_CHART_PAIR_ROW = [
  "grid w-full min-w-0 max-w-full grid-cols-1 auto-rows-fr items-stretch",
  "gap-3 max-md:gap-3 lg:grid-cols-2 lg:gap-5",
  "lg:auto-rows-auto lg:items-start",
  "[&>*]:h-full [&>*]:min-w-0",
  "lg:[&>*]:h-auto",
].join(" ");
export const CTV_ANALYTICS_CHART_PAIR_COL = [
  "flex h-full min-w-0 w-full flex-col self-stretch",
  "[&>article]:h-full [&>article]:min-h-0",
  "lg:h-auto lg:self-auto lg:[&>article]:h-auto",
].join(" ");
/** Hàng cuối — một card full width (Realtime KPI). */
export const CTV_ANALYTICS_FULL_ROW = [
  "grid w-full min-w-0 max-w-full grid-cols-1 auto-rows-fr items-stretch",
  "lg:auto-rows-auto lg:items-start",
].join(" ");
export const CTV_ANALYTICS_SECTION_SHELL =
  "flex h-full min-h-0 w-full flex-col overflow-visible lg:h-auto lg:flex-none";

/** Panel nội dung tab analytics — desktop co theo nội dung, không stretch viewport. */
export const CTV_ANALYTICS_TAB_CONTENT = [
  "flex w-full min-w-0 max-w-full flex-col",
  "gap-4 max-md:gap-4 sm:gap-6",
  "max-lg:flex-1",
  "lg:h-auto lg:flex-none lg:grow-0 lg:gap-5",
].join(" ");

/** Header card — mobile: wrap khi hint dài; md+ một hàng như cũ. */
export const CTV_ANALYTICS_CARD_HEADER = [
  "flex shrink-0 flex-wrap items-start justify-between gap-x-2 gap-y-1",
  "border-b border-slate-200/60 pb-2.5 max-md:pb-2.5",
  "md:flex-nowrap md:min-h-14 md:items-center md:gap-3 md:gap-y-0 md:pb-3",
  "lg:min-h-0 lg:items-start",
].join(" ");

/** Tiêu đề chính — mobile: shrink được; md+ truncate. */
export const CTV_ANALYTICS_CARD_TITLE = [
  "min-w-0 shrink leading-tight",
  "max-md:max-w-[46%] max-md:flex-shrink-0",
  "md:max-w-none md:flex-1 md:shrink md:truncate",
].join(" ");

/** Tiêu đề phụ — mobile: flex-1 min-w-0, wrap trong card; md+ giới hạn 16rem. */
export const CTV_ANALYTICS_CARD_HINT = [
  "min-w-0 flex-1 basis-0 shrink text-right",
  "max-w-full overflow-hidden",
  "text-[10px] font-normal leading-[1.35] text-slate-500",
  "max-md:break-words max-md:[overflow-wrap:anywhere]",
  "md:max-w-[16rem] md:flex-none md:basis-auto md:shrink-0 md:overflow-visible md:text-xs md:leading-snug md:break-normal",
].join(" ");

/** Subtitle section analytics (vd. Phân tích trực quan). */
export const CTV_ANALYTICS_SECTION_HINT = [
  "w-full min-w-0 max-w-full overflow-hidden text-[10px] font-normal leading-[1.35] text-slate-500",
  "max-md:break-words max-md:[overflow-wrap:anywhere]",
  "md:text-xs md:leading-snug",
].join(" ");

/** Body card analytics — khoảng cách đồng nhất sau header. */
export const CTV_ANALYTICS_CARD_BODY =
  "mt-2.5 flex min-h-0 flex-col gap-2.5 max-md:mt-2.5 max-md:gap-2.5 max-lg:flex-1 md:mt-3 md:gap-3 lg:flex-none";

/** Khung biểu đồ / vùng dữ liệu chính — 220px, border & padding thống nhất. */
export const CTV_ANALYTICS_CHART_CONTAINER = [
  "box-border flex w-full min-w-0 max-w-full",
  "h-[220px] min-h-[220px] max-h-[220px]",
  "rounded-xl border border-slate-200/80 bg-white p-2.5 max-md:p-2.5 md:p-3",
  "overflow-hidden",
].join(" ");

/** Nội dung căn giữa trong khung chart (empty / chart). */
export const CTV_ANALYTICS_CHART_CONTAINER_INNER =
  "flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden";

/** Lưới 4 tab KPI Realtime — mobile 2×2, từ md (≥768px) 4 cột một hàng. */
export const CTV_ANALYTICS_REALTIME_METRIC_GRID = [
  "grid w-full min-w-0 max-w-full grid-cols-2 grid-rows-2 items-stretch auto-rows-fr",
  "gap-2 max-md:gap-2",
  "md:grid-cols-4 md:grid-rows-1 md:gap-2.5",
  "[&>*]:h-full [&>*]:min-h-[5.5rem] [&>*]:min-w-0 [&>*]:max-w-full",
  "md:[&>*]:min-h-[5rem]",
].join(" ");

/** Ô tab KPI Realtime — padding đồng nhất, không sát mép. */
export const CTV_ANALYTICS_REALTIME_TAB = [
  "@container/metric relative box-border flex h-full w-full min-w-0 max-w-full flex-col justify-between overflow-hidden",
  "rounded-xl border p-2.5 shadow-sm ring-1 ring-black/[0.03]",
].join(" ");

export const CTV_ANALYTICS_REALTIME_TAB_SLATE = "border-slate-200/80 bg-white";

export const CTV_ANALYTICS_REALTIME_TAB_EMERALD = [
  "border-emerald-100/85 bg-gradient-to-br from-emerald-50/95 to-white",
  "ring-emerald-100/40",
].join(" ");

export const CTV_ANALYTICS_REALTIME_TAB_FUCHSIA = [
  "border-fuchsia-100/80 bg-gradient-to-br from-fuchsia-50/95 to-white",
  "ring-fuchsia-100/40",
].join(" ");

export const CTV_ANALYTICS_REALTIME_TAB_ICON = [
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
  "bg-white text-slate-500 shadow-sm ring-1 ring-slate-100/90",
  "sm:h-7 sm:w-7",
].join(" ");

export const CTV_ANALYTICS_REALTIME_TAB_LABEL = [
  "min-w-0 flex-1 text-[10px] font-semibold leading-[1.25] text-slate-500",
  "max-md:[word-break:keep-all]",
  "md:text-[11px] md:leading-[1.2]",
].join(" ");

export const CTV_ANALYTICS_REALTIME_TAB_VALUE = "mt-1.5 block w-full min-w-0 truncate text-left leading-none";

/** Hàng icon + nhãn tab Realtime. */
export const CTV_ANALYTICS_REALTIME_TAB_HEAD = "flex min-w-0 items-start gap-1.5";

/** Card nội dung compact (form, list trong hub). */
export const CTV_CARD_COMPACT = [
  "min-w-0 rounded-2xl border border-slate-200/70 bg-white/95 p-3",
  "shadow-sm ring-1 ring-black/[0.03]",
  CTV_MOTION_CLASS.card,
  "lg:p-5",
].join(" ");

/** Card gradient nhẹ (carousel, growth strip). */
export const CTV_CARD_SOFT = [
  "min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/80 p-3",
  "shadow-sm ring-1 ring-black/[0.03] sm:p-4 lg:p-5",
].join(" ");

/** Campaign / Khuyến mãi — ít khung, spacing + divider (đồng bộ Trung tâm CTV) */
export const CTV_CAMPAIGN_ROOT = "flex min-w-0 w-full flex-col gap-4 sm:gap-5 lg:gap-6";

export const CTV_CAMPAIGN_SECTION = "min-w-0 space-y-3 sm:space-y-3.5";

export const CTV_CAMPAIGN_SECTION_TITLE = "text-sm font-semibold text-[#0F172A]";

export const CTV_CAMPAIGN_SECTION_HINT = "text-xs leading-relaxed text-slate-500";

export const CTV_CAMPAIGN_SPLIT = "grid w-full min-w-0 gap-5 lg:grid-cols-2 lg:gap-6";

/** Card chính — Danh sách campaign (nền trắng, ưu tiên đọc dữ liệu) */
export const CTV_CAMPAIGN_PANEL = [
  "flex min-w-0 flex-col",
  CTV_CAMPAIGN_SECTION,
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
  "lg:rounded-[1.25rem]",
].join(" ");

/** Card «Tạo campaign nhanh» — khu vực thao tác chính (nền trắng, padding 20–24px) */
export const CTV_CAMPAIGN_CREATE_PANEL = [
  "flex min-w-0 flex-col gap-3 sm:gap-4",
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
  "lg:rounded-[1.25rem] lg:p-6",
].join(" ");

export const CTV_CAMPAIGN_FORM_STACK = "flex flex-col gap-3 sm:gap-3.5";

export const CTV_CAMPAIGN_FORM_FIELD = "flex flex-col gap-1.5";

export const CTV_CAMPAIGN_FORM_ACTIONS = [
  "flex flex-col gap-3 border-t border-slate-200/70 pt-4",
  "sm:gap-3.5",
].join(" ");

export const CTV_CAMPAIGN_DETAIL_STACK = [
  "space-y-5 border-t border-slate-200/70 pt-5",
  "lg:col-span-2 lg:space-y-6 lg:pt-6",
].join(" ");

export const CTV_CAMPAIGN_METRIC = [
  "@container/metric overflow-hidden rounded-lg bg-orange-50/80 px-3 py-2.5",
  "ring-1 ring-inset ring-orange-100/60",
].join(" ");

export const CTV_CAMPAIGN_INLINE_GRID = "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

export const CTV_CAMPAIGN_CHART_GRID = "grid w-full min-w-0 gap-5 lg:grid-cols-2 lg:gap-6";

export const CTV_CAMPAIGN_LIST_ITEM = [
  "flex w-full flex-col rounded-lg px-2.5 py-2 text-left text-sm transition",
  "active:scale-[0.99] hover:bg-slate-50",
].join(" ");

export const CTV_CAMPAIGN_LIST_ITEM_ACTIVE =
  "bg-slate-50 ring-1 ring-inset ring-blue-200/80";

export const CTV_CAMPAIGN_INSIGHT_TILE_HOT =
  "rounded-lg bg-emerald-50/80 px-3 py-2.5 ring-1 ring-inset ring-emerald-200/70";

export const CTV_CAMPAIGN_INSIGHT_TILE_IDLE =
  "rounded-lg bg-orange-50/50 px-3 py-2.5 ring-1 ring-inset ring-orange-100/40 text-slate-500";

export const CTV_CAMPAIGN_LANDING_CARD =
  "min-w-[220px] max-w-[85vw] shrink-0 snap-start rounded-lg bg-orange-50/80 px-3 py-2.5 ring-1 ring-inset ring-orange-100/50";

export const CTV_CAMPAIGN_SNIPPET_ROW =
  "flex flex-wrap items-start gap-2 rounded-lg bg-orange-50/60 px-3 py-2 ring-1 ring-inset ring-orange-100/40";

/** Ô thumbnail — nền trắng, viền nhẹ (trên panel Kho ảnh trắng) */
export const CTV_CAMPAIGN_ASSET_TILE =
  "rounded-lg border border-slate-200/80 bg-white p-2 shadow-sm";

/** Header dashboard — viền + icon (thay #DBEAFE). */
export const CTV_DASHBOARD_HEADER_BORDER = "border-b border-slate-200/70 pb-5";
export const CTV_DASHBOARD_HEADER_ICON = [
  "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
  "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200/60",
].join(" ");

/** Màu chữ / viền — SSOT slate (thay #0F172A / #64748B / #E2E8F0). */
export const CTV_COLOR_BORDER = "border-slate-200/70";
export const CTV_COLOR_BORDER_STRONG = "border-slate-200/90";
export const CTV_COLOR_DIVIDER = "border-slate-100";
export const CTV_COLOR_SURFACE_MUTED = "bg-slate-50/80";
/** Table head / row hover (thay #F8FAFC + opacity). */
export const CTV_COLOR_SURFACE_TABLE_HEAD = "bg-slate-50/90";
export const CTV_COLOR_SURFACE_ROW_HOVER = "hover:bg-slate-50/60";

/** Accent surface / border (thay #EFF6FF / #DBEAFE). */
export const CTV_COLOR_ACCENT_SURFACE = "bg-blue-50";
export const CTV_COLOR_ACCENT_BORDER = "border-blue-100";
export const CTV_COLOR_ACCENT_RING = "ring-blue-100";

/** Sticky tab rail analytics — nền trắng (Bảng số CTV). */
export const CTV_DASHBOARD_HEADER_STICKY = "border-b border-slate-200/70 bg-white";

/** @deprecated Dùng `CTV_HORIZONTAL_TAB_SCROLL` từ `ctv-ui-tokens` — alias giữ tương thích. */
export { CTV_HORIZONTAL_TAB_SCROLL as CTV_ANALYTICS_TAB_SCROLL } from "../ctv/ctv-ui-tokens";

/** Panel bộ lọc sticky (traffic insights) — nền trắng. */
export const CTV_DASHBOARD_FILTER_PANEL = [
  "rounded-2xl border border-slate-200/70 bg-white shadow-sm",
].join(" ");
