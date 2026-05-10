import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminSitePolicyForm from "../../../../../components/admin/admin-site-policy-form";
import { adminSecondaryButton } from "../../../../../lib/admin-ui";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Sửa chính sách | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

function isStaff(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export default async function AdminSitePolicyEditPage({ params }: { params: ParamsInput }): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isStaff(session.user.role)) {
    redirect("/admin/login?callbackUrl=/admin/site-policies");
  }
  const { id } = await Promise.resolve(params);
  const { db } = await import("../../../../../lib/db");
  const row = await db.sitePolicy.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!row) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sửa chính sách</h1>
          <p className="mt-0.5 text-sm text-slate-500 truncate">{row.title}</p>
        </div>
        <Link href="/admin/site-policies" className={adminSecondaryButton}>
          ← Danh sách
        </Link>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <AdminSitePolicyForm mode="edit" policyId={row.id} />
      </section>
    </main>
  );
}
