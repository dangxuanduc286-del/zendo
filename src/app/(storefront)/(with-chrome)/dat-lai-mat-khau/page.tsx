import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ResetPasswordForm from "../../../../components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | Zendo.vn",
  description: "Đặt lại mật khẩu tài khoản Zendo.vn",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF] px-4 py-10 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <header className="mb-5 space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Đặt lại mật khẩu</h1>
          <p className="text-sm leading-6 text-[#64748B]">
            Nhập mật khẩu mới có tối thiểu 8 ký tự để bảo vệ tài khoản của bạn.
          </p>
        </header>

        <Suspense fallback={<p className="text-sm text-[#64748B]">Đang tải biểu mẫu...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-5 text-center text-sm text-[#64748B]">
          <Link href="/tai-khoan" className="font-medium text-[#2563EB] transition hover:text-[#1D4ED8]">
            Quay lại đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
