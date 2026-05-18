import type { CustomerAccountSettings } from "./settings";

/** Thông điệp UI mặc định khi chặn mua (API dùng `affiliateBlockCheckoutMessage` từ settings nếu có). */
export const DEFAULT_CTV_PURCHASE_UI_MESSAGE =
  "Tài khoản CTV chỉ dùng để giới thiệu sản phẩm. Để mua hàng, vui lòng đăng xuất và dùng tài khoản khách hàng.";

export function effectiveAffiliateBlockMessage(raw?: string | null): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t || DEFAULT_CTV_PURCHASE_UI_MESSAGE;
}

/** Storefront session / account payload slice used for AFF/CTV rules */
export type AccountRoleUser = {
  role?: string | null;
  affiliateActive?: boolean;
};

/** CTV có hồ sơ affiliate đang hoạt động (role khách storefront). */
export function isAffiliateOnly(user: AccountRoleUser): boolean {
  const role = (user.role ?? "USER").toString();
  if (role !== "USER") return false;
  return user.affiliateActive === true;
}

export type AccountSettingsRoleSlice = Pick<CustomerAccountSettings, "affiliateCanBuy">;

/** Được phép luồng mua/checkout như khách (CTV mặc định không; bật qua affiliateCanBuy). */
export function isCustomerBuyer(user: AccountRoleUser, settings: AccountSettingsRoleSlice): boolean {
  if (!isAffiliateOnly(user)) return true;
  return settings.affiliateCanBuy === true;
}

export type AffiliateAccountDefaultTabId = "affiliate" | "overview";

export type AccountSettingsDefaultTabSlice = Pick<
  CustomerAccountSettings,
  "showAffiliate" | "affiliateDefaultTab" | "showOverview"
>;

/**
 * Tab mặc định khi mở `/tai-khoan` — CTV/affiliate luôn ưu tiên «Tổng quan» (dashboard seller).
 */
export function getDefaultAccountTab(user: AccountRoleUser, settings: AccountSettingsDefaultTabSlice): AffiliateAccountDefaultTabId {
  if (!isAffiliateOnly(user)) return "overview";
  if (settings.showOverview) return "overview";
  if (settings.showAffiliate) return "affiliate";
  return "overview";
}
