import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminCategoryForm from "../../../../../components/admin/admin-category-form";

export const metadata: Metadata = {
  title: "Tạo danh mục | Quản trị Zendo.vn",
  description: "Tạo danh mục mới trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/categories/new");
  }
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const parentIdValue = resolvedSearchParams.parentId;
  const parentIdPreset = Array.isArray(parentIdValue) ? parentIdValue[0] ?? "" : parentIdValue ?? "";

  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Tạo danh mục mới
        </h1>
      </header>
      <AdminCategoryForm mode="create" parentIdPreset={parentIdPreset} />
    </main>
  );
}
