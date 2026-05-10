import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminCategoriesTable from "../../../../components/admin/admin-categories-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Danh mục | Quản trị Zendo.vn",
  description: "Quản lý danh mục sản phẩm trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCategoriesPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/categories");
  }


  return (
    <main className="w-full max-w-none space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
            Danh mục
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Tạo mới, cập nhật và quản lý trạng thái danh mục sản phẩm.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className={adminPrimaryButton}
        >
          Thêm danh mục cha
        </Link>
      </header>

      <AdminCategoriesTable />
    </main>
  );
}
