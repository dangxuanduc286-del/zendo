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
  const box =
    props.size === "tall"
      ? "h-[15rem] min-h-[14rem] w-full sm:h-[17rem] lg:h-full lg:min-h-0"
      : "h-[11.5rem] min-h-[11.5rem] w-full sm:h-52";
  return (
    <div className={box}>
      <Inner data={props.buckets} compact={props.size !== "tall"} wide={props.size === "tall"} />
    </div>
  );
}
