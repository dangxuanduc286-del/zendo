import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminBannerForm from "../../../../../components/admin/admin-banner-form";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa banner | Quản trị Zendo.vn",
  description: "Cập nhật banner trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditBannerPage({
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
          Chỉnh sửa banner
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Cập nhật ảnh và vị trí hiển thị đúng chuẩn 5 banner để storefront hiển thị chính xác.
        </p>
      </header>
      <AdminBannerForm mode="edit" bannerId={resolvedParams.id} />
    </main>
  );
}

