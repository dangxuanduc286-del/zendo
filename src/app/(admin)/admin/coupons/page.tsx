import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminCouponsTable from "../../../../components/admin/admin-coupons-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Mã giảm giá | Quản trị Zendo.vn",
  description: "CRUD coupons trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCouponsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/coupons");
  }

  return (
    <main className="w-full max-w-none space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
            Mã giảm giá
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">Tạo mới, cập nhật và xóa mã giảm giá khuyến mãi.</p>
        </div>
        <Link
          href="/admin/coupons/new"
          className={adminPrimaryButton}
        >
          Tạo mã giảm giá
        </Link>
      </header>
      <AdminCouponsTable />
    </main>
  );
}

