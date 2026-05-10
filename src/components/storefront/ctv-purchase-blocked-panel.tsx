"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function CtvPurchaseBlockedPanel({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-zinc-900 shadow-sm sm:p-5 ${className}`.trim()}
    >
      <p className="text-sm font-semibold leading-snug text-amber-950 sm:text-base">{message}</p>
      <div className="mt-4 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        <Link
          href="/tai-khoan"
          className="inline-flex min-h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-amber-950 transition hover:bg-amber-100 sm:w-auto sm:min-w-[140px]"
        >
          Về trang CTV
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" }).catch(() => {})}
          className="inline-flex min-h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:w-auto sm:min-w-[140px]"
        >
          Đăng xuất
        </button>
        <Link
          href="/tai-khoan"
          className="inline-flex min-h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto sm:min-w-[160px]"
        >
          Lấy link giới thiệu
        </Link>
      </div>
    </div>
  );
}
