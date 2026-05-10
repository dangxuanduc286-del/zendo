import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminProductsTable from "../../../../components/admin/admin-products-table";
import { adminPrimaryButton, adminSecondaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Quản lý sản phẩm | Quản trị Zendo.vn",
  description: "Quản trị sản phẩm trong khu vực admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/products");
  }

  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Sản phẩm</h1>
          <p className="mt-1 text-sm text-[#64748B]">Quản lý sản phẩm đang bán, nháp, lưu trữ và tồn kho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products/new"
            className={adminPrimaryButton}
          >
            + Tạo mới
          </Link>
          <Link
            href="/admin/products?status=ARCHIVED"
            className={adminSecondaryButton}
          >
            Xem lưu trữ
          </Link>
        </div>
      </header>
      <AdminProductsTable />
    </main>
  );
}
