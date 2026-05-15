"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./affiliate-analytics-pie-inner"), {
  loading: () => <div className="flex h-52 items-center justify-center text-sm text-[#64748B]">Đang tải…</div>,
  ssr: false,
});

export default function AffiliateAnalyticsPieLazy(props: {
  data: Array<{ name: string; value: number }>;
  compact?: boolean;
}): JSX.Element {
  return <Inner {...props} />;
}
