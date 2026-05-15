import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminAffiliateAnalyticsDashboard from "@/components/admin/admin-affiliate-analytics-dashboard";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Affiliate Analytics | Quản trị Zendo.vn",
  description: "Trung tâm analytics affiliate toàn hệ thống.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isStaff(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

export default async function AdminAffiliateAnalyticsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  if (!isStaff(session.user.role)) {
    redirect("/admin");
  }
  return <AdminAffiliateAnalyticsDashboard />;
}
