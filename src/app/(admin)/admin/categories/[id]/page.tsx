import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminCategoryForm from "../../../../../components/admin/admin-category-form";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa danh mục | Quản trị Zendo.vn",
  description: "Cập nhật thông tin danh mục trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditCategoryPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const categoryId = resolvedParams.id;

  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Chỉnh sửa danh mục
        </h1>
      </header>
      <AdminCategoryForm mode="edit" categoryId={categoryId} />
    </main>
  );
}
