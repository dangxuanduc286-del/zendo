import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không tìm thấy | Zendo.vn",
  description: "Trang không tồn tại hoặc đã được di chuyển.",
  robots: { index: false, follow: false },
};

/** Root App Router 404 — dùng khi gọi `notFound()` hoặc không khớp route. */
export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Trang không tồn tại</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Đường dẫn này chưa được đăng ký trên Zendo hoặc đã được gỡ bỏ.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Về trang chủ
        </Link>
        <Link
          href="/tai-khoan"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Tài khoản
        </Link>
      </div>
    </div>
  );
}
