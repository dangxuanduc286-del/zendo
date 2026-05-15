"use client";

import dynamic from "next/dynamic";
import type { RtPoint } from "./creator-realtime-sparkline-inner";

const Inner = dynamic(() => import("./creator-realtime-sparkline-inner"), {
  ssr: false,
  loading: () => <div className="h-28 w-full animate-pulse rounded-lg bg-slate-100/90 motion-reduce:animate-none" />,
});

export default function CreatorRealtimeSparklineLazy(props: {
  history: RtPoint[];
  windowMinutes: 5 | 15 | 60;
}): JSX.Element {
  return <Inner history={props.history} windowMinutes={props.windowMinutes} />;
}
