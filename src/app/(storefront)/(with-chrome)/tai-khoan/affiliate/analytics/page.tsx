import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import AffiliateAnalyticsDashboardClient from "@/components/storefront/affiliate-analytics-dashboard-client";

export const metadata: Metadata = {
  title: "Analytics CTV | Zendo.vn",
  robots: { index: false, follow: false },
};

export default async function AffiliateAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    redirect("/tai-khoan");
  }

  const profile = await resolveCustomerAffiliateProfile(String(session.user.id));
  if (!profile.active) {
    redirect("/tai-khoan?tab=affiliate");
  }

  const sp = (await searchParams) ?? {};
  if (sp.tab === "campaign") {
    redirect("/tai-khoan/affiliate/campaign");
  }
  const initialMenuKey = typeof sp.tab === "string" ? sp.tab : undefined;

  return (
    <AffiliateAnalyticsDashboardClient
      affiliateRefCode={profile.refCode ?? ""}
      initialMenuKey={initialMenuKey}
    />
  );
}

