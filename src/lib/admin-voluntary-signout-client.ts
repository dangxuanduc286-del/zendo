"use client";

import { getSession, signOut } from "next-auth/react";
import {
  fetchAuthSessionSnapshot,
  logAuthTrace,
} from "@/lib/auth-runtime-trace";

/** Sau khi admin bấm "Đăng xuất" chủ động — không dùng `/admin/login` (route đó dành cho chưa đăng nhập / session hết). */
export const ADMIN_VOLUNTARY_LOGOUT_LANDING_URL = "/";

/**
 * Kết thúc phiên NextAuth rồi đưa user về storefront bằng `replace` (giảm khả năng quay lại admin bằng nút Back).
 */
export async function signOutAdminVoluntary(): Promise<void> {
  const beforeSnapshot = await fetchAuthSessionSnapshot();
  const beforeClient = await getSession();
  logAuthTrace("signOutAdminVoluntary:before", {
    useSessionUserId: beforeClient?.user?.id ?? null,
    serverSnapshot: beforeSnapshot,
  });

  const signOutResult = await signOut({ redirect: false });

  const afterSnapshot = await fetchAuthSessionSnapshot();
  const afterClient = await getSession();
  logAuthTrace("signOutAdminVoluntary:after-signOut-redirect-false", {
    signOutResultUrl: (signOutResult as { url?: string } | undefined)?.url ?? null,
    getSessionUserId: afterClient?.user?.id ?? null,
    serverSnapshot: afterSnapshot,
  });

  window.location.replace(ADMIN_VOLUNTARY_LOGOUT_LANDING_URL);
}
