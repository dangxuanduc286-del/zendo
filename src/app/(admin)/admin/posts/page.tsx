import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminPostsTable from "../../../../components/admin/admin-posts-table";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Bài viết | Quản trị Zendo.vn",
  description: "Tạo và quản lý bài viết blog trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPostsPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/posts");
  }

  return (
    <main className="w-full max-w-none space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
            Bài viết
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">Tạo mới, cập nhật và xóa bài viết blog.</p>
        </div>
        <Link
          href="/admin/posts/new"
          className={adminPrimaryButton}
        >
          Tạo bài viết
        </Link>
      </header>
      <AdminPostsTable />
    </main>
  );
}

