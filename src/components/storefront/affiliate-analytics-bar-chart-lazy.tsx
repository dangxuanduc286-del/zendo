"use client";

import dynamic from "next/dynamic";
import type { AffiliateBarBucket } from "./affiliate-analytics-bar-chart-inner";

const Inner = dynamic(() => import("./affiliate-analytics-bar-chart-inner"), {
  loading: () => <div className="h-full min-h-[10rem] w-full animate-pulse rounded-xl bg-slate-100/90 motion-reduce:animate-none" />,
  ssr: false,
});

export default function AffiliateAnalyticsBarChartLazy(props: {
  buckets: AffiliateBarBucket[];
  /** Taller chart for traffic tab. */
  size?: "default" | "tall";
}): JSX.Element {
  const box = props.size === "tall" ? "h-[15rem] min-h-[15rem] sm:h-[17rem]" : "h-[11.5rem] min-h-[11.5rem] sm:h-52";
  return (
    <div className={`w-full ${box}`}>
      <Inner data={props.buckets} compact />
    </div>
  );
}
