import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminAffiliateAnalyticsDetailClient from "@/components/admin/admin-affiliate-analytics-detail-client";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chi tiết Affiliate Analytics | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isStaff(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

export default async function AdminAffiliateAnalyticsDetailPage(props: {
  params: Promise<{ affiliateId: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  if (!isStaff(session.user.role)) {
    redirect("/admin");
  }
  const { affiliateId } = await props.params;
  const id = affiliateId?.trim();
  if (!id || id.length < 16) {
    redirect("/admin/affiliate-analytics");
  }
  return <AdminAffiliateAnalyticsDetailClient affiliateId={id} />;
}
