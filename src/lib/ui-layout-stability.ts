/**
 * Token layout UI — grid/shell co giãn khi zoom (chỉ class CSS).
 */

export const UI_OVERFLOW_CLIP = "min-w-0 max-w-full overflow-x-clip";

/** Sidebar account — rem thay px cố định */
export const UI_SIDEBAR_COL = "minmax(13rem,17.5rem)";

/** Buyer overview — avatar | nội dung | stats */
export const UI_ACCOUNT_OVERVIEW_GRID_LG = [
  "lg:grid",
  "lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)_minmax(14rem,17.5rem)]",
  "lg:items-stretch lg:gap-6",
].join(" ");

export const UI_ACCOUNT_OVERVIEW_GRID_XL = "xl:grid-cols-[minmax(18rem,21.25rem)_minmax(0,1fr)_minmax(16rem,20rem)] xl:gap-7";

/** Grid KPI / metric — cùng hàng cùng chiều cao */
export const UI_GRID_KPI_STABLE = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-3",
  "grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]",
  "sm:gap-4",
].join(" ");

/** Hub 2 cột (Tài khoản | Cấp bậc) — desktop 50/50 cố định */
export const UI_GRID_HUB_SPLIT_STABLE = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-5",
  "grid-cols-1",
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
].join(" ");

/** Tier reward cards */
export const UI_GRID_TIER_CARDS_STABLE = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-4",
  "grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))]",
].join(" ");

/** Stat tiles (4 ô) */
export const UI_GRID_STAT_STABLE = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-2",
  "grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]",
  "sm:gap-3",
].join(" ");

/** Quick actions */
export const UI_GRID_ACTIONS_STABLE = [
  "grid w-full min-w-0 auto-rows-fr items-stretch gap-3",
  "grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))]",
].join(" ");
