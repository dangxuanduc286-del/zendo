import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminAccountsTable from "../../../../components/admin/admin-accounts-table";
import { adminCardBody, adminPageSubtitle, adminPageTitle, adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Tài khoản | Quản trị Zendo.vn",
  description: "Người dùng đã đăng ký trên Zendo.vn — tìm kiếm, lọc và quản lý an toàn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAdminsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/admins");
  }

  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className={`${adminCardBody} flex flex-wrap items-start justify-between gap-4`}>
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Tài khoản</h1>
          <p className={adminPageSubtitle}>
            Người dùng đã đăng ký trên Zendo.vn — tìm kiếm, lọc và quản lý an toàn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/admins/new" className={adminPrimaryButton}>
            Tạo quản trị viên
          </Link>
        </div>
      </header>
      <AdminAccountsTable />
    </main>
  );
}

