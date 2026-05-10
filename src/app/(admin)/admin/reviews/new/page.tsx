import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminReviewForm from "../../../../../components/admin/admin-review-form";

export const metadata: Metadata = {
  title: "Tạo đánh giá | Quản trị Zendo.vn",
  description: "Tạo đánh giá mới trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function NewReviewPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/reviews/new");
  }
  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tạo đánh giá</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dùng để tạo review mẫu phục vụ bán hàng/marketing. Storefront chỉ hiển thị review đã duyệt.
          </p>
        </div>
        <Link
          href="/admin/reviews"
          className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700"
        >
          Quay lại danh sách
        </Link>
      </header>
      <section className="w-full max-w-5xl">
        <AdminReviewForm mode="create" />
      </section>
    </main>
  );
}

