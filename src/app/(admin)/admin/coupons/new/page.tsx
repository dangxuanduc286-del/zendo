import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminCouponForm from "../../../../../components/admin/admin-coupon-form";

export const metadata: Metadata = {
  title: "Tạo mã giảm giá | Quản trị Zendo.vn",
  description: "Tạo mã giảm giá mới trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCouponPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/coupons/new");
  }

  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tạo mã giảm giá</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Thiết lập mã ưu đãi cho đơn hàng, sản phẩm hoặc nhóm khách hàng.
          </p>
        </div>
        <Link
          href="/admin/coupons"
          className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
        >
          Danh sách mã giảm giá
        </Link>
      </header>
      <section className="w-full max-w-5xl">
        <AdminCouponForm mode="create" />
      </section>
    </main>
  );
}

