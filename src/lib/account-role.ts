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

const DEFAULT_TAB_IDS = ["affiliate", "overview"] as const;
export type AffiliateAccountDefaultTabId = (typeof DEFAULT_TAB_IDS)[number];

export type AccountSettingsDefaultTabSlice = Pick<
  CustomerAccountSettings,
  "showAffiliate" | "affiliateDefaultTab" | "showOverview"
>;

/**
 * Tab mặc định khi mở `/tai-khoan` — dashboard vẫn rơi về fallback nếu tab bị ẩn bởi show* khác.
 */
export function getDefaultAccountTab(user: AccountRoleUser, settings: AccountSettingsDefaultTabSlice): AffiliateAccountDefaultTabId {
  if (!isAffiliateOnly(user)) return "overview";
  const raw = (settings.affiliateDefaultTab ?? "affiliate").toString().toLowerCase();
  const normalized: AffiliateAccountDefaultTabId =
    DEFAULT_TAB_IDS.find((id) => id === raw) ?? "affiliate";
  if (normalized === "affiliate" && !settings.showAffiliate) return "overview";
  if (normalized === "overview" && !settings.showOverview) {
    return settings.showAffiliate ? "affiliate" : "overview";
  }
  return normalized;
}
