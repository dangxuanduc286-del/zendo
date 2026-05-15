import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminSitePolicyForm from "../../../../../components/admin/admin-site-policy-form";
import { adminCardBody, adminPageSubtitle, adminPageTitle, adminSecondaryButton } from "../../../../../lib/admin-ui";

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
    <main className="w-full min-w-0 max-w-none space-y-5">
      <div className={`${adminCardBody} flex flex-wrap items-center justify-between gap-2`}>
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Sửa chính sách</h1>
          <p className={`${adminPageSubtitle} truncate`}>{row.title}</p>
        </div>
        <Link href="/admin/site-policies" className={adminSecondaryButton}>
          ← Danh sách
        </Link>
      </div>
      <section className={adminCardBody}>
        <AdminSitePolicyForm mode="edit" policyId={row.id} />
      </section>
    </main>
  );
}
