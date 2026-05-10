import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminPageForm from "../../../../../components/admin/admin-page-form";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chỉnh sửa trang nội dung | Quản trị Zendo.vn",
  description: "Cập nhật trang nội dung trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function EditContentPage({ params }: { params: ParamsInput }): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  const resolved = await Promise.resolve(params);
  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Chỉnh sửa trang nội dung</h1>
      </header>
      <AdminPageForm mode="edit" pageId={resolved.id} />
    </main>
  );
}

