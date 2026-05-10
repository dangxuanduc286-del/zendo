"use client";

import { signOutAdminVoluntary } from "@/lib/admin-voluntary-signout-client";
import { useMemo, useState } from "react";

export default function AccountSessionCard(): JSX.Element {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentTime = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOutAdminVoluntary();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">Phiên đăng nhập</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Thiết bị hiện tại</dt>
          <dd className="font-medium text-slate-900">Trình duyệt hiện tại</dd>
        </div>
        <div className="flex items-start justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Trạng thái</dt>
          <dd className="font-medium text-emerald-700">Đang hoạt động</dd>
        </div>
        <div className="flex items-start justify-between">
          <dt className="text-slate-500">Thời gian hiện tại</dt>
          <dd className="text-right font-medium text-slate-900">{currentTime}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 text-sm font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất khỏi tài khoản này"}
      </button>
    </article>
  );
}
