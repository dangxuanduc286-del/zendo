import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminCouponForm from "../../../../../components/admin/admin-coupon-form";
import { adminCardBody, adminPageSubtitle, adminPageTitle, adminSecondaryButton } from "../../../../../lib/admin-ui";

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
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className={`${adminCardBody} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Tạo mã giảm giá</h1>
          <p className={adminPageSubtitle}>Thiết lập mã ưu đãi cho đơn hàng, sản phẩm hoặc nhóm khách hàng.</p>
        </div>
        <Link href="/admin/coupons" className={adminSecondaryButton}>
          Danh sách mã giảm giá
        </Link>
      </header>
      <section className="w-full min-w-0">
        <AdminCouponForm mode="create" />
      </section>
    </main>
  );
}

