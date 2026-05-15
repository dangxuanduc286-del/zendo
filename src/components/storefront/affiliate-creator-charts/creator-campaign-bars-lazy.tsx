"use client";

import dynamic from "next/dynamic";
import type { CampaignBarRow } from "./creator-campaign-bars-inner";

const Inner = dynamic(() => import("./creator-campaign-bars-inner"), {
  ssr: false,
  loading: () => <div className="h-[14rem] w-full animate-pulse rounded-xl bg-slate-100/90 motion-reduce:animate-none" />,
});

export default function CreatorCampaignBarsLazy(props: {
  rows: CampaignBarRow[];
  metric: "revenue" | "epc" | "clicks";
}): JSX.Element {
  return <Inner rows={props.rows} metric={props.metric} />;
}
