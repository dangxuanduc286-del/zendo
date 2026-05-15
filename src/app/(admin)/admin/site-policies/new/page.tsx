import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminSitePolicyForm from "../../../../../components/admin/admin-site-policy-form";
import { adminCardBody, adminPageTitle, adminSecondaryButton } from "../../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Chính sách mới | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

function isStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export default async function AdminSitePolicyNewPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isStaff(session.user.role)) {
    redirect("/admin/login?callbackUrl=/admin/site-policies/new");
  }

  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <div className={`${adminCardBody} flex flex-wrap items-center justify-between gap-2`}>
        <h1 className={adminPageTitle}>Thêm chính sách</h1>
        <Link href="/admin/site-policies" className={adminSecondaryButton}>
          ← Danh sách
        </Link>
      </div>
      <section className={adminCardBody}>
        <AdminSitePolicyForm mode="create" />
      </section>
    </main>
  );
}
