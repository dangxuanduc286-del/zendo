"use client";

import { useSupportChatStore } from "../../../../stores/supportChatStore";

export default function AdminSupportTicketsPage(): JSX.Element {
  const open = useSupportChatStore((s) => s.open);

  return (
    <div className="flex w-full min-w-0 flex-col items-center space-y-4 py-6 text-center text-sm text-slate-600">
      <div className="w-full max-w-md px-4">
        <p className="text-base font-semibold text-slate-900">Hỗ trợ trực tiếp</p>
        <p className="mt-2 leading-relaxed">
          Chat với khách hàng / CTV trong cửa sổ nổi. Dùng nút bên dưới khi bạn muốn mở hộp thoại — hệ thống không tự mở chat.
        </p>
        <button
          type="button"
          onClick={() => open()}
          className="mt-5 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          Mở chat hỗ trợ
        </button>
      </div>
    </div>
  );
}
