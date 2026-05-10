import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminSitePolicyForm from "../../../../../components/admin/admin-site-policy-form";
import { adminSecondaryButton } from "../../../../../lib/admin-ui";

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
    <main className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Thêm chính sách</h1>
        <Link href="/admin/site-policies" className={adminSecondaryButton}>
          ← Danh sách
        </Link>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <AdminSitePolicyForm mode="create" />
      </section>
    </main>
  );
}
