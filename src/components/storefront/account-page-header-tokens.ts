/**
 * SSOT — header vùng nội dung tab `/tai-khoan` (desktop đồng nhất chiều cao).
 * Không import `affiliate-ctv-account-ui-tokens` (tránh circular init).
 */

/** Desktop: 80px — khớp header cao nhất (title + mô tả + toolbar). */
export const ACCOUNT_PAGE_HEADER_MIN_H_LG = "lg:min-h-20";

const ACCOUNT_PAGE_HEADER_TITLE =
  "text-[20px] font-bold leading-[1.2] tracking-tight text-[#1A1A1A] max-md:text-[22px] lg:text-[20px]";

const ACCOUNT_PAGE_HEADER_DESCRIPTION =
  "text-sm leading-relaxed text-slate-600 max-md:text-[13px] max-md:leading-snug";

const ACCOUNT_PAGE_HEADER_ICON_TILE = [
  "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
  "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200/60",
].join(" ");

export const ACCOUNT_PAGE_HEADER = {
  wrap: [
    "w-full min-w-0 shrink-0",
    "flex flex-col justify-end",
    ACCOUNT_PAGE_HEADER_MIN_H_LG,
  ].join(" "),
  wrapBordered: "border-b border-slate-200/70 pb-5",
  row: "flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8",
  lead: "flex min-w-0 items-start gap-3 sm:gap-4",
  icon: ACCOUNT_PAGE_HEADER_ICON_TILE,
  copy: "min-w-0 space-y-1.5",
  title: ACCOUNT_PAGE_HEADER_TITLE,
  description: [ACCOUNT_PAGE_HEADER_DESCRIPTION, "w-full min-w-0 mb-0"].join(" "),
  toolbar: "flex flex-wrap items-center gap-2.5 sm:gap-3 lg:max-w-[50%] lg:justify-end",
  contentGap: "mt-5 min-w-0",
  /** Slot banner hoa hồng — spacing do parent `gap` shell, không margin riêng desktop. */
  bannerSlot: "w-full min-w-0 shrink-0",
  /** Panel tab trong cột main — desktop không padding-top (header canh từ cùng baseline). */
  panelShell: [
    "w-full min-w-0 rounded-2xl border border-slate-200/70 bg-white shadow-sm",
    "p-4 sm:p-5",
    "lg:px-6 lg:pb-6 lg:pt-0",
  ].join(" "),
} as const;

/** Nút toolbar (Làm mới, Analytics, Xóa tất cả, …) — chiều cao cố định, không đẩy header. */
export const ACCOUNT_PAGE_HEADER_TOOLBAR_BTN = [
  "inline-flex h-10 min-h-10 shrink-0 items-center justify-center rounded-xl",
  "border border-slate-200/90 bg-white px-3.5 text-sm font-medium text-slate-800",
  "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
  "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

export const ACCOUNT_PAGE_HEADER_TOOLBAR_BTN_DANGER = [
  ACCOUNT_PAGE_HEADER_TOOLBAR_BTN,
  "border-rose-200 text-rose-700 hover:bg-rose-50",
].join(" ");

export const ACCOUNT_PAGE_HEADER_SELECT = [
  "h-10 min-h-10 w-auto min-w-[9.5rem] cursor-pointer rounded-xl",
  "border border-blue-200/90 bg-white px-3.5 text-sm font-medium text-slate-800",
  "shadow-[0_1px_2px_rgba(37,99,235,0.06)] outline-none transition-shadow",
  "focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-400/25",
].join(" ");

/** SSOT — điểm bắt đầu nội dung sau header (`data-account-page-content`). */
export const ACCOUNT_PAGE_CONTENT_START = ACCOUNT_PAGE_HEADER.contentGap;
