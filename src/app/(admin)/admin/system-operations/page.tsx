import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminSystemOperationsClient from "@/components/admin/admin-system-operations-client";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vận hành hệ thống | Quản trị Zendo.vn",
  description: "Queue, cron, health và cache operations.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isStaff(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

function canMutate(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export default async function AdminSystemOperationsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  if (!isStaff(session.user.role)) {
    redirect("/admin");
  }
  return <AdminSystemOperationsClient canMutate={canMutate(session.user.role)} />;
}
