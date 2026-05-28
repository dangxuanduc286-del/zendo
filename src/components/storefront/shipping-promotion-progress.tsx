"use client";

import { formatVnd } from "../../lib/currency";
import type { ShippingPromotionProgress, ShippingPromotionResult } from "../../lib/shipping";

export default function ShippingPromotionProgressCard({
  progress,
  applied,
  subtotal,
  compact = false,
}: {
  progress: ShippingPromotionProgress | null;
  applied: ShippingPromotionResult | null;
  subtotal: number;
  compact?: boolean;
}): JSX.Element | null {
  if (applied) {
    return (
      <div className={`rounded-xl border border-emerald-100 bg-emerald-50 ${compact ? "px-3 py-2" : "p-3"}`}>
        <p className="text-xs font-extrabold text-emerald-900">
          {applied.freeShipping
            ? "🎉 Bạn đã nhận miễn phí vận chuyển"
            : `🎉 Bạn đã nhận ưu đãi vận chuyển ${formatVnd(applied.discountAmount)}`}
        </p>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className={`rounded-xl border border-sky-100 bg-sky-50 ${compact ? "px-3 py-2" : "p-3"}`}>
      <p className="text-xs font-extrabold text-sky-950">
        🚚 Mua thêm {formatVnd(progress.amountNeeded)} để nhận {progress.label}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-sky-800">
        <span>{formatVnd(subtotal)}</span>
        <span>{formatVnd(progress.tier.minOrderValue)}</span>
      </div>
    </div>
  );
}
