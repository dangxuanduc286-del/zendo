import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminPostForm from "../../../../../components/admin/admin-post-form";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa bài viết | Quản trị Zendo.vn",
  description: "Cập nhật bài viết trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditPostPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  const resolvedParams = await Promise.resolve(params);
  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Chỉnh sửa bài viết
        </h1>
      </header>
      <AdminPostForm mode="edit" postId={resolvedParams.id} />
    </main>
  );
}

