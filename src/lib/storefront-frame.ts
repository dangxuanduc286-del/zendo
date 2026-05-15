/**
 * Khung **marketing / storefront** (homepage, SP, blog, header, footer…): centered ecommerce.
 */
export const MARKETING_FRAME = "mx-auto w-full min-w-0 max-w-[1360px] px-4 sm:px-6 lg:px-8";

/**
 * Khung **app / dashboard** (/tai-khoan, affiliate, analytics…): fluid full width, không cap max-width.
 */
export const APP_FRAME = "w-full min-w-0 max-w-none px-4 sm:px-5 lg:px-6 2xl:px-8";

/** Gutter nhỏ cho trang analytics full-bleed (dùng trong component, không lồng thêm APP_FRAME). */
export const ANALYTICS_DASHBOARD_GUTTER = "px-3 sm:px-3 lg:px-4 2xl:px-5";

/**
 * Workspace analytics: desktop gần full viewport dọc (trừ header + biên an toàn). Mobile `min-h-0` để không dư khoảng trắng.
 * Dùng kết hợp `flex flex-col` trên root analytics.
 */
export const AFFILIATE_ANALYTICS_WORKSPACE_MIN_H =
  "min-h-0 w-full flex flex-col lg:min-h-[calc(100dvh-10.5rem)]";

/**
 * @deprecated Dùng {@link MARKETING_FRAME} hoặc {@link APP_FRAME} theo ngữ cảnh.
 * Giữ alias = marketing để code cũ không lỡ dùng fluid trên storefront.
 */
export const STOREFRONT_FRAME = MARKETING_FRAME;
