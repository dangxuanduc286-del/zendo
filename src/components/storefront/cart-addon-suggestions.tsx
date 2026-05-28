"use client";

import Link from "next/link";
import { formatVnd } from "../../lib/currency";

const ADDON_SUGGESTIONS = [
  { name: "Cáp sạc", price: 99000, href: "/cua-hang" },
  { name: "Tai nghe", price: 199000, href: "/cua-hang" },
  { name: "Ốp lưng", price: 59000, href: "/cua-hang" },
];

export default function CartAddonSuggestions({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <section className={`rounded-xl border border-blue-100 bg-blue-50 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-blue-950">🎯 Mua thêm để tiết kiệm hơn</h3>
          <p className="mt-0.5 text-xs font-medium text-blue-800">Gợi ý phụ kiện giá nhỏ, dễ mua kèm.</p>
        </div>
        <Link href="/cua-hang" className="hidden text-xs font-bold text-[#2563EB] sm:inline">
          Xem thêm
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ADDON_SUGGESTIONS.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-left transition hover:border-[#2563EB]/50 hover:bg-blue-50"
          >
            <p className="truncate text-xs font-bold text-zinc-900">{item.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#2563EB]">{formatVnd(item.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
