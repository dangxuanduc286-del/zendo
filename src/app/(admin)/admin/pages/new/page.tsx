import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminPageForm from "../../../../../components/admin/admin-page-form";

export const metadata: Metadata = {
  title: "Tạo trang nội dung | Quản trị Zendo.vn",
  description: "Tạo trang nội dung mới trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function NewContentPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/pages/new");
  }
  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tạo trang nội dung mới</h1>
      </header>
      <AdminPageForm mode="create" />
    </main>
  );
}

