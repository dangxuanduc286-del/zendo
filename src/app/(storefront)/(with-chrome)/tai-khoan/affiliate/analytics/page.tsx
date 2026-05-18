import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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

  const customerId = String(session.user.id);
  const profile = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true, refCode: true },
  });
  if (!profile) {
    redirect("/tai-khoan?tab=affiliate");
  }

  const sp = (await searchParams) ?? {};
  const initialMenuKey = typeof sp.tab === "string" ? sp.tab : undefined;

  return <AffiliateAnalyticsDashboardClient affiliateRefCode={profile.refCode} initialMenuKey={initialMenuKey} />;
}

