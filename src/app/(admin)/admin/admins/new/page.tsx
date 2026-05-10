import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminAdminForm from "../../../../../components/admin/admin-admin-form";

export const metadata: Metadata = {
  title: "Tạo tài khoản quản trị | Quản trị Zendo.vn",
  description: "Tạo tài khoản quản trị mới.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewAdminUserPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/admins/new");
  }

  return (
    <main className="w-full max-w-none space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Tạo quản trị viên moi
        </h1>
      </header>
      <AdminAdminForm mode="create" />
    </main>
  );
}

