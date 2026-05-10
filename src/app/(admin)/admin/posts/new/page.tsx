import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminPostForm from "../../../../../components/admin/admin-post-form";

export const metadata: Metadata = {
  title: "Tạo bài viết | Quản trị Zendo.vn",
  description: "Tạo bài viết mới trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewPostPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/posts/new");
  }

  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Tạo bài viết moi
        </h1>
      </header>
      <AdminPostForm mode="create" />
    </main>
  );
}

