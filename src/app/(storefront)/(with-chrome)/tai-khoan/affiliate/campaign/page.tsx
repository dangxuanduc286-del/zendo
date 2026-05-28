import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import AffiliateCampaignDashboardClient from "@/components/storefront/affiliate-campaign-dashboard-client";

export const metadata: Metadata = {
  title: "Campaign CTV | Zendo.vn",
  robots: { index: false, follow: false },
};

export default async function AffiliateCampaignPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    redirect("/tai-khoan");
  }

  const profile = await resolveCustomerAffiliateProfile(String(session.user.id));
  if (!profile.active) {
    redirect("/tai-khoan?tab=affiliate");
  }

  return <AffiliateCampaignDashboardClient />;
}
