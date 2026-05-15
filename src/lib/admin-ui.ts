/** Vùng nội dung admin — không tràn ngang. */
export const adminLayoutMain = "w-full min-w-0 max-w-none overflow-x-hidden";

/**
 * Gốc trang trong AdminShell — padding ngang/dọc do `admin-shell` bọc ngoài.
 * Không dùng `mx-auto` / `max-w-*` ở đây (full-bleed trong vùng cuộn).
 */
export const adminPanelRoot = "w-full min-w-0 max-w-none space-y-5";

/** @deprecated Dùng `adminPanelRoot` — giữ alias để trang cũ không gãy import. */
export const adminContentShell = adminPanelRoot;

/** @deprecated Trước đây rộng hơn; nay đồng nhất với shell chung. */
export const adminContentShellWide = adminPanelRoot;

/**
 * Lưới card / KPI — mobile 1 cột, tablet 2 cột, desktop (xl+) giữ 2 → 3 cột như trước (lg: đã dùng).
 */
export const adminCardGrid =
  "grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3";

/** Alias lưới metric. */
export const adminKpiGrid = adminCardGrid;

export const adminGridGap = "gap-5";

/** Card khung (có thể ghép thêm padding riêng). */
export const adminCard = "rounded-2xl border border-slate-200 bg-white shadow-sm";

/** Padding trong card — mobile / desktop đồng bộ. */
export const adminCardPadding = "p-5 md:p-6";

/** Form / panel cần thở hơn — cùng spec padding theo yêu cầu UI. */
export const adminCardPaddingLoose = "p-5 md:p-6";

export const adminCardBody = `${adminCard} ${adminCardPadding}`;

export const adminCardBodyLoose = `${adminCard} ${adminCardPaddingLoose}`;

/** Card số liệu — chiều cao tối thiểu đồng đều. */
export const adminStatCard =
  "flex min-h-[132px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";

/** Vùng bảng: viền + bo góc + cuộn ngang. */
export const adminTableShell = "min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm";

/** Bảng trong `adminTableShell` — min-width để cuộn ngang mượt trên mobile. */
export const adminTable = "w-full min-w-[700px] caption-bottom text-sm";

export const adminTableHeaderRow = "border-b border-slate-200 bg-slate-50";

export const adminTh =
  "h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 first:pl-4 last:pr-4";

export const adminTd = "h-11 px-4 align-middle text-slate-800 first:pl-4 last:pr-4";

/** Empty state trong khung. */
export const adminEmptyPanel =
  "flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center";

/** Khoảng cách dọc nội bộ trang (khi không bọc `adminPanelRoot`). */
export const adminPage = "w-full min-w-0 space-y-5";

export const adminPageHeader = "mb-0 space-y-1";

/** Tiêu đề trang — mobile nhỏ hơn, xl+ giữ 3xl như desktop. */
export const adminPageTitle = "text-2xl font-bold tracking-tight text-slate-900 xl:text-3xl";

export const adminPageSubtitle = "text-sm leading-snug text-slate-500";

/** Tiêu đề trong card — mobile base, xl+ giữ lg. */
export const adminCardTitle = "text-base font-semibold text-slate-900 xl:text-lg";

/** Số metric — mobile gọn, xl+ giữ cỡ desktop. */
export const adminMetricNumber =
  "text-2xl font-bold tracking-tight text-slate-900 tabular-nums xl:text-3xl 2xl:text-4xl";

export const adminMetaText = "text-xs text-slate-500";

export const adminLabel = "text-sm font-medium text-slate-700";

const adminFieldBase =
  "w-full border border-slate-300 bg-white text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50";

export const adminInput = `h-11 w-full max-w-full rounded-xl px-4 text-sm ${adminFieldBase}`;

/** Giữ export — đồng nhất chiều cao form theo spec. */
export const adminInputLg = adminInput;

export const adminTextarea = `min-h-[88px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50`;

export const adminSelect = adminInput;

const adminButtonFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

export const adminPrimaryButton = `inline-flex h-11 w-full max-w-full items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto ${adminButtonFocus}`;

export const adminPrimaryButtonLg = adminPrimaryButton;

export const adminSecondaryButton = `inline-flex h-11 w-full max-w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 xl:w-auto`;

export const adminOpsButton =
  "inline-flex h-11 w-full max-w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-50 xl:w-auto";

export const adminDangerButton = `inline-flex h-11 w-full max-w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto`;

export const adminCtaButton =
  "inline-flex h-11 w-full max-w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 xl:w-auto";

export const adminTabBase = "rounded-xl border px-3.5 py-2.5 text-sm font-medium transition";

export const adminTabActive = "border-sky-200 bg-sky-50 text-sky-800";

export const adminTabInactive = "border-slate-200 bg-white text-slate-900 hover:bg-slate-50";

/** Hàng filter / toolbar — mobile xếp dọc, xl+ giữ hàng ngang desktop. */
export const adminFilterRow =
  "flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4";

/** Nhóm nút / link thao tác — mobile ưu tiên cột, xl+ gói gọn hàng. */
export const adminToolbarCluster =
  "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2 xl:items-center";

export const adminMobileHeader = "space-y-2";

export const adminMobileMenuItemActive =
  "flex h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-900";

export const adminMobileMenuItemInactive =
  "flex h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50";

/** Padding vùng nội dung cuộn trong AdminShell (mobile/tablet). */
export const adminShellContentPadding =
  "w-full min-w-0 max-w-full overflow-x-hidden px-3 py-4 sm:px-4 md:px-5 md:py-5 xl:px-6";
