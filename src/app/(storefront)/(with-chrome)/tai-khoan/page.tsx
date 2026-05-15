import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CustomerAccountDashboard from "../../../../components/storefront/customer-account-dashboard";
import CustomerAuthCard from "../../../../components/storefront/customer-auth-card";
import { authOptions } from "../../../../lib/auth";
import { StorefrontAccountShell } from "../../../../components/storefront/storefront-account-shell";
import { getStorefrontSettings } from "../../../../lib/storefront-settings";
import { listPolicyHubCardsForAccount } from "../../../../lib/site-policy-queries";
import { getStorefrontCustomerAccountDashboardData } from "../../../../lib/server/storefront-customer-account-dashboard";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản | Zendo.vn",
  description:
    "Đăng nhập hoặc tạo tài khoản Zendo.vn để theo dõi đơn hàng, lưu giỏ hàng và nhận ưu đãi mua sắm.",
  alternates: {
    canonical: "https://zendo.vn/tai-khoan",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StoreAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; authError?: string; tab?: string; sub?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const params = (await searchParams) ?? {};
  const callbackUrl = params.callbackUrl ?? "/tai-khoan";
  const authError = params.authError ?? "";
  const initialAccountTab = typeof params.tab === "string" ? params.tab.trim() : "";
  const initialAffiliateSubTab = typeof params.sub === "string" ? params.sub.trim() : "";
  const storefrontSettings = await getStorefrontSettings();
  const accountSettings = storefrontSettings.website.customerAccountSettings;
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const isAdmin =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "CONTENT_MANAGER" ||
    session?.user?.role === "ADMIN";
  if (!session?.user?.id) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <CustomerAuthCard callbackUrl={callbackUrl} googleEnabled={googleEnabled} authError={authError} />
        </div>
      </main>
    );
  }

  if (isAdmin) {
    redirect("/");
  }

  const dashboardData = await getStorefrontCustomerAccountDashboardData(String(session.user.id));
  const policyHubCards = await listPolicyHubCardsForAccount(dashboardData.affiliate.isActive);
  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#F8FAFC] px-0 py-0 sm:px-4 sm:py-6 lg:px-6 lg:py-6">
      <StorefrontAccountShell variant="flush">
        <CustomerAccountDashboard
          accountSettings={accountSettings}
          data={dashboardData}
          policyHubCards={policyHubCards}
          initialAccountTab={initialAccountTab}
          initialAffiliateSubTab={initialAffiliateSubTab}
          affiliateCommissionTab={storefrontSettings.website.affiliateCommissionTab}
          affiliateProgramEnabled={storefrontSettings.website.affiliateEnabled}
        />
      </StorefrontAccountShell>
    </main>
  );
}
