import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminReviewForm from "../../../../../components/admin/admin-review-form";
import { adminCardBody, adminPageSubtitle, adminPageTitle, adminSecondaryButton } from "../../../../../lib/admin-ui";

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
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className={`${adminCardBody} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Tạo đánh giá</h1>
          <p className={adminPageSubtitle}>
            Dùng để tạo review mẫu phục vụ bán hàng/marketing. Storefront chỉ hiển thị review đã duyệt.
          </p>
        </div>
        <Link href="/admin/reviews" className={adminSecondaryButton}>
          Quay lại danh sách
        </Link>
      </header>
      <section className="w-full min-w-0">
        <AdminReviewForm mode="create" />
      </section>
    </main>
  );
}

