"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";

const VisitsLineChart = dynamic(() => import("./visits-line-chart"), {
  loading: () => (
    <section className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#64748B]">
        Đang tải biểu đồ...
      </div>
    </section>
  ),
  ssr: false,
});

export default function VisitsLineChartLazy(props: ComponentProps<typeof VisitsLineChart>): JSX.Element {
  return <VisitsLineChart {...props} />;
}

