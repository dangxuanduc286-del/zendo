"use client";

import type { ComponentProps } from "react";
import type { AffiliateCommissionTabSettings } from "../../lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "../../lib/settings";
import { isAffiliateOnly, isCustomerBuyer } from "../../lib/account-role";
import AffiliateOnlyAccountView from "./affiliate-only-account-view";
import CustomerBuyerAccountView from "./customer-buyer-account-view";

type DashboardProps = ComponentProps<typeof CustomerBuyerAccountView> & {
  initialAccountTab?: string;
  initialAffiliateSubTab?: string;
  affiliateCommissionTab: AffiliateCommissionTabSettings;
  affiliateProgramEnabled: boolean;
};

/** `/tai-khoan`: tách UX khách/CTV được mua vs CTV chỉ giới thiệu (`affiliateCanBuy`). */
export default function CustomerAccountDashboard(props: DashboardProps): JSX.Element {
  const slice: Pick<CustomerAccountSettings, "affiliateCanBuy"> = props.accountSettings;
  const roleUser = { affiliateActive: props.data.affiliate.isActive };
  const affiliateOnlyBlockedFromBuying = isAffiliateOnly(roleUser) && !isCustomerBuyer(roleUser, slice);

  if (affiliateOnlyBlockedFromBuying) {
    return <AffiliateOnlyAccountView {...props} />;
  }
  return <CustomerBuyerAccountView {...props} />;
}
