"use client";

import { signOut } from "next-auth/react";

/** Sau khi admin bấm "Đăng xuất" chủ động — không dùng `/admin/login` (route đó dành cho chưa đăng nhập / session hết). */
export const ADMIN_VOLUNTARY_LOGOUT_LANDING_URL = "/";

/**
 * Kết thúc phiên NextAuth rồi đưa user về storefront bằng `replace` (giảm khả năng quay lại admin bằng nút Back).
 */
export async function signOutAdminVoluntary(): Promise<void> {
  await signOut({ redirect: false });
  window.location.replace(ADMIN_VOLUNTARY_LOGOUT_LANDING_URL);
}
