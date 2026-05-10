"use client";

import type { SerializedDealCoupon } from "../../../lib/deals/serializers";

export default function DealsVoucherRail({
  coupons,
}: {
  coupons: SerializedDealCoupon[];
}): JSX.Element | null {
  if (!coupons.length) return null;
  return (
    <div className="grid grid-cols-1 gap-2" data-deals-block="voucher-rail">
      {coupons.map((c) => (
        <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F172A]">{c.name}</p>
              <p className="mt-0.5 text-xs font-medium text-[#64748B]">{c.description || ""}</p>
            </div>
            <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-extrabold tracking-wide text-slate-800">
              {c.code}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

