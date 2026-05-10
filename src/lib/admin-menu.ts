export type AdminMenuItem = {
  label: string;
  href: string;
};

/** Menu “Đơn hàng” (danh sách) — dùng chung sidebar / badge. */
export const ADMIN_ORDERS_MENU_HREF = "/admin/orders";

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { label: "Tài khoản của tôi", href: "/admin/account" },
  { label: "Tổng quan", href: "/admin" },
  { label: "Sản phẩm", href: "/admin/products" },
  { label: "Danh mục", href: "/admin/categories" },
  { label: "Thương hiệu", href: "/admin/brands" },
  { label: "Đơn hàng", href: ADMIN_ORDERS_MENU_HREF },
  { label: "Tra cứu đơn", href: "/admin/orders/lookup" },
  { label: "Cộng tác viên", href: "/admin/collaborators" },
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
  { label: "Thông báo khách hàng", href: "/admin/customer-broadcast" },
];
