import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminAccountsTable from "../../../../components/admin/admin-accounts-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

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
    <main className="w-full max-w-[1600px] space-y-5 py-2 sm:py-3">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Tài khoản</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Người dùng đã đăng ký trên Zendo.vn — tìm kiếm, lọc và quản lý an toàn.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/admins/new" className={adminPrimaryButton}>Tạo quản trị viên</Link>
        </div>
      </header>
      <AdminAccountsTable />
    </main>
  );
}

