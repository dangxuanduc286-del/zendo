import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AffiliateAccountSubpagesChrome } from "@/components/storefront/affiliate-account-subpages-chrome";
import { StorefrontAccountShell } from "@/components/storefront/storefront-account-shell";
import { authOptions } from "@/lib/auth";
import { getStorefrontCustomerAccountDashboardData } from "@/lib/server/storefront-customer-account-dashboard";
import { getStorefrontSettings } from "@/lib/storefront-settings";

export default async function AffiliateAccountBranchLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    redirect("/tai-khoan");
  }

  const storefrontSettings = await getStorefrontSettings();
  const data = await getStorefrontCustomerAccountDashboardData(String(session.user.id));
  if (!data.affiliate.isActive) {
    redirect("/tai-khoan?tab=affiliate");
  }

  const accountSettings = storefrontSettings.website.customerAccountSettings;

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 py-5 sm:py-6">
      <StorefrontAccountShell>
        <AffiliateAccountSubpagesChrome
          accountSettings={accountSettings}
          data={data}
          affiliateCommissionTab={storefrontSettings.website.affiliateCommissionTab}
          affiliateProgramEnabled={storefrontSettings.website.affiliateEnabled}
        >
          {children}
        </AffiliateAccountSubpagesChrome>
      </StorefrontAccountShell>
    </div>
  );
}
