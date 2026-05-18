/**
 * Điều hướng tab `/tai-khoan` — CTV/affiliate mặc định «Tổng quan» sau đăng nhập / reload.
 */

export const ACCOUNT_TAB_STORAGE_KEY = "zendo.storefront.accountTab";
export const ACCOUNT_LOGIN_OVERVIEW_SESSION_KEY = "zendo.account.entryOverview";

/** Gọi sau đăng nhập khách thành công (trước redirect). */
export function markAccountLoginOverviewEntry(): void {
  try {
    sessionStorage.setItem(ACCOUNT_LOGIN_OVERVIEW_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeAccountLoginOverviewEntry(): boolean {
  try {
    if (sessionStorage.getItem(ACCOUNT_LOGIN_OVERVIEW_SESSION_KEY) !== "1") return false;
    sessionStorage.removeItem(ACCOUNT_LOGIN_OVERVIEW_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readPersistedAccountTab(): string | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_TAB_STORAGE_KEY)?.trim() ?? "";
    return raw || null;
  } catch {
    return null;
  }
}

export function persistAccountTab(tab: string): void {
  const t = tab.trim();
  if (!t) return;
  try {
    localStorage.setItem(ACCOUNT_TAB_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

/** CTV / affiliate active — dùng quy tắc dashboard tổng quan. */
export function isCtvAffiliateAccount(affiliateActive: boolean): boolean {
  return affiliateActive;
}

/**
 * Tab khởi tạo cho CTV:
 * - Không có `?tab=` → Tổng quan
 * - `?tab=affiliate` không kèm `sub` → Tổng quan (tránh mở trung tâm affiliate cũ)
 * - Có `sub` hoặc tab sâu (đơn, thông báo, …) → giữ URL
 */
export function resolveCtvAccountTab(
  initialTab: string,
  initialSub: string,
  options?: { forceLoginOverview?: boolean },
): { tab: string; sub?: string } {
  if (options?.forceLoginOverview) {
    return { tab: "overview" };
  }

  const tab = (initialTab ?? "").trim();
  const sub = (initialSub ?? "").trim();

  if (!tab || tab === "overview") {
    return { tab: "overview" };
  }

  if (tab === "support") {
    return { tab: "policyHub" };
  }

  if (tab === "affiliate") {
    if (sub) return { tab: "affiliate", sub };
    return { tab: "overview" };
  }

  return { tab };
}

/**
 * Tab khởi tạo cho khách mua thường (không CTV).
 */
export function resolveBuyerAccountTab(initialTab: string, allowedTabs: readonly string[]): string {
  const normalized = (initialTab ?? "").trim();
  const fromUrl = normalized === "support" ? "policyHub" : normalized;

  if (fromUrl && allowedTabs.includes(fromUrl)) {
    return fromUrl;
  }

  const saved = readPersistedAccountTab();
  if (saved && allowedTabs.includes(saved)) {
    return saved;
  }

  return allowedTabs.includes("overview") ? "overview" : allowedTabs[0] ?? "overview";
}

/** Sau đăng nhập: `/tai-khoan` không tab → thêm `tab=overview`. */
export function resolveCustomerLoginCallbackUrl(callbackUrl: string | null | undefined): string {
  const value = (callbackUrl ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/tai-khoan?tab=overview";
  }
  if (value.startsWith("/admin") || value.startsWith("/account") || value.startsWith("/me") || value.startsWith("/profile")) {
    return value;
  }

  if (value === "/tai-khoan") {
    return "/tai-khoan?tab=overview";
  }

  if (value.startsWith("/tai-khoan?")) {
    try {
      const u = new URL(value, "https://zendo.vn");
      if (!u.searchParams.get("tab")) {
        u.searchParams.set("tab", "overview");
        return `${u.pathname}${u.search}`;
      }
      return value;
    } catch {
      return "/tai-khoan?tab=overview";
    }
  }

  return value || "/";
}

export function buildTaiKhoanTabHref(tab: string, sub?: string): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (sub?.trim()) params.set("sub", sub.trim());
  return `/tai-khoan?${params.toString()}`;
}
