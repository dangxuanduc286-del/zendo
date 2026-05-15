"use client";

import { signOutAdminVoluntary } from "@/lib/admin-voluntary-signout-client";
import { adminCardBodyLoose } from "@/lib/admin-ui";
import { useMemo, useState } from "react";

const cardHeading =
  "mb-5 border-b border-slate-100 pb-4 text-lg font-semibold tracking-tight text-slate-900";

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
    <article className={`${adminCardBodyLoose} flex flex-col`}>
      <h2 className={cardHeading}>Phiên đăng nhập</h2>
      <dl className="space-y-0 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 first:pt-0">
          <dt className="shrink-0 text-slate-500">Thiết bị hiện tại</dt>
          <dd className="min-w-0 text-right font-medium text-slate-900">Trình duyệt hiện tại</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
          <dt className="shrink-0 text-slate-500">Trạng thái</dt>
          <dd className="text-right">
            <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Đang hoạt động
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
          <dt className="shrink-0 text-slate-500">Thời gian hiện tại</dt>
          <dd className="min-w-0 text-right font-medium tabular-nums text-slate-900">{currentTime}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất khỏi tài khoản này"}
        </button>
      </div>
    </article>
  );
}
