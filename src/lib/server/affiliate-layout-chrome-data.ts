import "server-only";

import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import { memoizeArgsPerRequest } from "@/lib/runtime/request-cache";
import {
  getStorefrontCustomerAccountNotifications,
  type StorefrontCustomerAccountNotifications,
} from "@/lib/server/storefront-customer-account-notifications";

/** Dữ liệu tối thiểu cho `affiliate/layout.tsx` + `AffiliateAccountSubpagesChrome` (sidebar, badge, banner). */
export type AffiliateLayoutChromeData = {
  affiliate: {
    isActive: boolean;
  };
  notifications: StorefrontCustomerAccountNotifications;
};

async function getAffiliateLayoutChromeDataInternal(userId: string): Promise<AffiliateLayoutChromeData> {
  const [profile, notifications] = await Promise.all([
    resolveCustomerAffiliateProfile(userId),
    getStorefrontCustomerAccountNotifications(userId),
  ]);

  return {
    affiliate: { isActive: profile.active },
    notifications,
  };
}

export const getAffiliateLayoutChromeData = memoizeArgsPerRequest(getAffiliateLayoutChromeDataInternal);
