import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminBrandForm from "../../../../../components/admin/admin-brand-form";

export const metadata: Metadata = {
  title: "Tạo thương hiệu | Quản trị Zendo.vn",
  description: "Tạo thương hiệu mới trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewBrandPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/brands/new");
  }

  return (
    <main className="w-full max-w-none space-y-4 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Thương hiệu mới
        </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Quản lý logo, mô tả và SEO cho thương hiệu sản phẩm.
          </p>
        </div>
        <Link
          href="/admin/brands"
          className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
        >
          Danh sách thương hiệu
        </Link>
      </header>
      <AdminBrandForm mode="create" />
    </main>
  );
}
