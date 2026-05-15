import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminAffiliateFraudDashboard from "@/components/admin/admin-affiliate-fraud-dashboard";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Fraud affiliate | Quản trị Zendo.vn",
  description: "Case fraud, signal và điều tra attribution / CAPI.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isStaff(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

export default async function AdminAffiliateFraudPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  if (!isStaff(session.user.role)) {
    redirect("/admin");
  }
  return <AdminAffiliateFraudDashboard />;
}
