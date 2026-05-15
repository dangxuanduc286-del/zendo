import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import AffiliateAttributionDashboard from "@/components/storefront/affiliate-attribution-dashboard";

export const metadata: Metadata = {
  title: "Attribution CTV | Zendo.vn",
  robots: { index: false, follow: false },
};

export default async function AffiliateAttributionPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    redirect("/tai-khoan");
  }

  const customerId = String(session.user.id);
  const profile = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!profile) {
    redirect("/tai-khoan?tab=affiliate");
  }

  return <AffiliateAttributionDashboard />;
}
