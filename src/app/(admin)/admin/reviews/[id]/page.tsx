import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminReviewForm from "../../../../../components/admin/admin-review-form";
import { adminCardBody, adminPageSubtitle, adminPageTitle, adminSecondaryButton } from "../../../../../lib/admin-ui";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa đánh giá | Quản trị Zendo.vn",
  description: "Cập nhật đánh giá trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function EditReviewPage({ params }: { params: ParamsInput }): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  const resolved = await Promise.resolve(params);
  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className={`${adminCardBody} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0 space-y-1">
          <h1 className={adminPageTitle}>Sửa đánh giá</h1>
          <p className={adminPageSubtitle}>Cập nhật nội dung review và trạng thái hiển thị trên storefront.</p>
        </div>
        <Link href="/admin/reviews" className={adminSecondaryButton}>
          Quay lại danh sách
        </Link>
      </header>
      <section className="w-full min-w-0">
        <AdminReviewForm mode="edit" reviewId={resolved.id} />
      </section>
    </main>
  );
}

