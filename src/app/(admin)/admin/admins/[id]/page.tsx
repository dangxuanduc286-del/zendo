import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import AdminAccountDetail from "../../../../../components/admin/admin-account-detail";

type ParamsInput = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Chi tiết tài khoản | Quản trị Zendo.vn",
  description: "Xem và quản trị chi tiết tài khoản người dùng.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditAdminUserPage({
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
    <main className="w-full max-w-[1600px] space-y-4 py-2 sm:py-3">
      <AdminAccountDetail accountId={resolvedParams.id} />
    </main>
  );
}

