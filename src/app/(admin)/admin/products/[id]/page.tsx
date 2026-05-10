import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminProductForm from "../../../../../components/admin/admin-product-form";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa sản phẩm | Quản trị Zendo.vn",
  description: "Chỉnh sửa thông tin sản phẩm trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }: { params: ParamsInput }): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  const resolved = await Promise.resolve(params);
  return (
    <main className="w-full max-w-none space-y-4 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Sửa sản phẩm</h1>
          <p className="mt-1 text-sm text-zinc-600">Quản lý nội dung, giá bán, tồn kho và SEO cho sản phẩm.</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
        >
          Danh sách sản phẩm
        </Link>
      </header>
      <AdminProductForm mode="edit" productId={resolved.id} />
    </main>
  );
}

