import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import AdminLoginForm from "../../../../components/admin/admin-login-form";
import { authOptions } from "../../../../lib/auth";
import { resolveSiteUrl } from "../../../../lib/utils";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản | Zendo.vn",
  description:
    "Đăng nhập hoặc tạo tài khoản Zendo.vn để theo dõi đơn hàng, lưu giỏ hàng và nhận ưu đãi mua sắm.",
  alternates: {
    canonical: new URL("/tai-khoan", resolveSiteUrl()).toString(),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "CONTENT_MANAGER" ||
    session?.user?.role === "ADMIN";
  if (isAdmin) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">Đăng nhập quản trị</h1>
      <p className="mt-2 text-sm text-zinc-600">Đăng nhập để truy cập hệ thống quản trị.</p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <AdminLoginForm />
      </div>
    </main>
  );
}
