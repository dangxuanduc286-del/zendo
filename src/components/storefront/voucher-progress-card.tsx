"use client";

import { formatVnd } from "../../lib/currency";
import type { VoucherMilestone } from "../../lib/coupon";

export default function VoucherProgressCard({
  milestone,
  subtotal,
  compact = false,
}: {
  milestone: VoucherMilestone;
  subtotal: number;
  compact?: boolean;
}): JSX.Element {
  const target = milestone.coupon.minOrderValue ?? subtotal + milestone.amountNeeded;
  const progress = target > 0 ? Math.min(100, Math.max(0, (subtotal / target) * 100)) : 0;

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 ${compact ? "px-3 py-2" : "p-3"}`}>
      <p className="text-xs font-bold text-amber-950">
        🎁 Mua thêm {formatVnd(milestone.amountNeeded)} để nhận {milestone.coupon.code}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
        <div
          className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-amber-800">
        <span>{formatVnd(subtotal)}</span>
        <span>{formatVnd(target)}</span>
      </div>
      <p className="mt-1 text-xs font-medium text-amber-800">
        Mua thêm để tiết kiệm thêm {formatVnd(milestone.estimatedSavings)}
      </p>
    </div>
  );
}
