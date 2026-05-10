import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminReviewsTable from "../../../../components/admin/admin-reviews-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Đánh giá | Quản trị Zendo.vn",
  description: "Quản trị nội dung đánh giá sản phẩm trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/reviews");
  }

  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Đánh giá</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Quản lý đánh giá sản phẩm, duyệt nội dung và hiển thị ngoài storefront.
          </p>
        </div>
        <Link
          href="/admin/reviews/new"
          className={adminPrimaryButton}
        >
          Tạo đánh giá
        </Link>
      </header>
      <AdminReviewsTable />
    </main>
  );
}
