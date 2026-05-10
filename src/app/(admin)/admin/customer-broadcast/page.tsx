import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminCustomerBroadcastForm from "../../../../components/admin/admin-customer-broadcast-form";

export const metadata: Metadata = {
  title: "Gửi thông báo khách | Quản trị Zendo.vn",
  robots: { index: false, follow: false },
};

export default async function AdminCustomerBroadcastPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/customer-broadcast");
  }

  return (
    <main className="w-full max-w-none space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Gửi thông báo tài khoản khách</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Marketing (PROMOTION) hoặc hệ thống (SYSTEM). Fan-out tới CustomerAccountNotification — không tạo bảng mới.
        </p>
      </header>
      <AdminCustomerBroadcastForm />
    </main>
  );
}
