import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getWebsiteSettings } from "./settings";
import { resolveCustomerAffiliateProfile } from "./affiliate-customer-status";
import {
  effectiveAffiliateBlockMessage,
  isAffiliateOnly,
  isCustomerBuyer,
  type AccountRoleUser,
} from "./account-role";

export type StorefrontCheckoutLock = { locked: boolean; message: string };

/** Dùng cho SSR trang giỏ / thanh toán: khóa khi CTV ACTIVE và không được mua. */
export async function getStorefrontCheckoutLockState(): Promise<StorefrontCheckoutLock> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return { locked: false, message: "" };
    }
    const settings = await getWebsiteSettings();
    const cas = settings.customerAccountSettings;
    const affiliateActive = (await resolveCustomerAffiliateProfile(session.user.id)).active;
    const roleUser: AccountRoleUser = { role: "USER", affiliateActive };
    if (!isAffiliateOnly(roleUser) || isCustomerBuyer(roleUser, cas)) {
      return { locked: false, message: "" };
    }
    return { locked: true, message: effectiveAffiliateBlockMessage(cas.affiliateBlockCheckoutMessage) };
  } catch {
    return { locked: false, message: "" };
  }
}
