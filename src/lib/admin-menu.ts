import { ADMIN_SUPPORT_DM_PAGE_HREF } from "@/lib/support-dm/admin-inbox-nav";

export type AdminMenuItem = {
  label: string;
  href: string;
};

/** Menu “Đơn hàng” (danh sách) — dùng chung sidebar / badge. */
export const ADMIN_ORDERS_MENU_HREF = "/admin/orders";

/** Đơn đăng ký CTV — badge chờ duyệt dùng chung với Cộng tác viên. */
export const ADMIN_AFFILIATE_APPLICATIONS_HREF = "/admin/affiliate-applications";

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { label: "Tài khoản của tôi", href: "/admin/account" },
  { label: "Tổng quan", href: "/admin" },
  { label: "Sản phẩm", href: "/admin/products" },
  { label: "Danh mục", href: "/admin/categories" },
  { label: "Thương hiệu", href: "/admin/brands" },
  { label: "Đơn hàng", href: ADMIN_ORDERS_MENU_HREF },
  { label: "Tra cứu đơn", href: "/admin/orders/lookup" },
  { label: "Cộng tác viên", href: "/admin/collaborators" },
  { label: "Đăng ký CTV", href: ADMIN_AFFILIATE_APPLICATIONS_HREF },
  { label: "Affiliate Analytics", href: "/admin/affiliate-analytics" },
  { label: "Fraud affiliate", href: "/admin/affiliate-fraud" },
  { label: "Vận hành hệ thống", href: "/admin/system-operations" },
  { label: "Thống kê truy cập", href: "/admin/analytics" },
  { label: "Tài khoản", href: "/admin/admins" },
  { label: "Cài đặt website & giao diện", href: "/admin/website-appearance" },
  { label: "Chính sách hệ thống", href: "/admin/site-policies" },
  { label: "Banner", href: "/admin/banners" },
  { label: "Bài viết", href: "/admin/posts" },
  { label: "Trang nội dung", href: "/admin/pages" },
  { label: "Mạng xã hội", href: "/admin/social" },
  { label: "Đánh giá", href: "/admin/reviews" },
  { label: "Mã giảm giá", href: "/admin/coupons" },
  { label: "Hỗ trợ (chat)", href: ADMIN_SUPPORT_DM_PAGE_HREF },
  { label: "Thông báo khách hàng", href: "/admin/customer-broadcast" },
];
