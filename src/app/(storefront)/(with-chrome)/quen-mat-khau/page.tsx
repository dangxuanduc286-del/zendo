import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "../../../../components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Quên mật khẩu | Zendo.vn",
  description: "Yêu cầu đặt lại mật khẩu tài khoản Zendo.vn",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF] px-4 py-10 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <header className="mb-5 space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Quên mật khẩu</h1>
          <p className="text-sm leading-6 text-[#64748B]">
            Nhập email hoặc số điện thoại để nhận hướng dẫn đặt lại mật khẩu tài khoản Zendo.vn.
          </p>
        </header>

        <ForgotPasswordForm />

        <div className="mt-5 text-center text-sm text-[#64748B]">
          <Link href="/tai-khoan" className="font-medium text-[#2563EB] transition hover:text-[#1D4ED8]">
            Quay lại đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
