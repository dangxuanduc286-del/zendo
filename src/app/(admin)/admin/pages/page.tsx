import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminPagesTable from "../../../../components/admin/admin-pages-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Trang nội dung | Quản trị Zendo.vn",
  description: "Quản trị danh sách trang nội dung tĩnh trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function AdminPagesPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/pages");
  }

  return (
    <main className="w-full max-w-none space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Trang nội dung</h1>
        <p className="mt-1 text-sm text-[#64748B]">Danh sách trang giới thiệu/chính sách và trạng thái xuất bản.</p>
        </div>
        <Link
          href="/admin/pages/new"
          className={adminPrimaryButton}
        >
          Tạo trang nội dung
        </Link>
      </header>
      <AdminPagesTable />
    </main>
  );
}
