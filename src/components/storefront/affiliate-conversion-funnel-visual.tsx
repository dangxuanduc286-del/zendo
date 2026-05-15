"use client";

import { memo, useMemo } from "react";

const STEP_VI: Record<string, string> = {
  AFFILIATE_CLICK: "Click",
  PRODUCT_VIEW: "Xem SP",
  ADD_TO_CART: "Thêm giỏ",
  CHECKOUT_STARTED: "Checkout",
  CHECKOUT_COMPLETED: "Hoàn tất checkout",
  ORDER_PAID: "Đã thanh toán",
};

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

export type FunnelStepRow = { step: string; count: number; dropoff: number; conversionPct: number };

function topLeakIndex(steps: FunnelStepRow[]): number {
  let best = 1;
  let maxDrop = -1;
  for (let i = 1; i < steps.length; i += 1) {
    const prev = steps[i - 1]!;
    const cur = steps[i]!;
    if (prev.count > 0 && cur.dropoff > maxDrop) {
      maxDrop = cur.dropoff;
      best = i;
    }
  }
  return best;
}

export default memo(function AffiliateConversionFunnelVisual(props: {
  steps: FunnelStepRow[];
  loading?: boolean;
  variant?: "compact" | "full";
}): JSX.Element {
  const variant = props.variant ?? "full";
  const maxCount = useMemo(() => Math.max(1, ...props.steps.map((s) => s.count)), [props.steps]);
  const leakIdx = useMemo(() => topLeakIndex(props.steps), [props.steps]);
  const leak = props.steps[leakIdx];

  if (props.loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100/90" />
      </div>
    );
  }

  if (!props.steps.length) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu funnel.</p>;
  }

  return (
    <div className={variant === "compact" ? "space-y-2" : "space-y-3"}>
      {leak && leakIdx > 0 ? (
        <p className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/80 px-3 py-2 text-[11px] font-medium leading-snug text-amber-950 shadow-sm">
          Bottleneck: <span className="font-bold">{STEP_VI[leak.step] ?? leak.step}</span>
          {leak.dropoff > 0 ? (
            <>
              {" "}
              · rớt <span className="font-bold tabular-nums">{leak.dropoff}</span> · còn{" "}
              <span className="font-bold text-emerald-800">{fmtPct(leak.conversionPct)}</span> sang bước sau
            </>
          ) : null}
        </p>
      ) : null}
      <div className="space-y-2.5">
        {props.steps.map((s, idx) => {
          const w = maxCount > 0 ? Math.min(100, Math.round((s.count / maxCount) * 100)) : 0;
          const isLeak = idx === leakIdx;
          return (
            <div
              key={s.step}
              className={`rounded-xl border bg-gradient-to-br from-white to-slate-50/90 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] motion-safe:transition-shadow ${
                isLeak ? "border-amber-300/90 ring-1 ring-amber-100" : "border-slate-200/90"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold tracking-tight text-slate-900">{STEP_VI[s.step] ?? s.step}</span>
                <span className="tabular-nums text-sm font-bold text-slate-900">{s.count.toLocaleString("vi-VN")}</span>
              </div>
              <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`motion-safe:transition-[width] motion-safe:duration-500 motion-reduce:transition-none h-full rounded-full ${
                    idx === 0 ? "bg-slate-500" : isLeak ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  }`}
                  style={{ width: `${w}%` }}
                />
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                <span>
                  Giữ chân: <span className="font-semibold text-emerald-700">{fmtPct(s.conversionPct)}</span>
                </span>
                {idx > 0 ? (
                  <span className="text-rose-600">
                    Rớt <span className="font-semibold tabular-nums">{s.dropoff}</span>
                  </span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
