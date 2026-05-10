import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminBannerForm from "../../../../../components/admin/admin-banner-form";

export const metadata: Metadata = {
  title: "Tạo banner | Quản trị Zendo.vn",
  description: "Tạo banner mới trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewBannerPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/banners/new");
  }

  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tạo banner mới</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Chọn đúng vị trí hiển thị theo hệ thống 5 banner trang chủ để tránh lệch layout.
        </p>
      </header>
      <AdminBannerForm mode="create" />
    </main>
  );
}

