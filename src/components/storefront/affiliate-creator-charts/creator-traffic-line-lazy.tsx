"use client";

import dynamic from "next/dynamic";
import type { CreatorTimelinePoint } from "./creator-traffic-line-inner";

const Inner = dynamic(() => import("./creator-traffic-line-inner"), {
  ssr: false,
  loading: () => <div className="h-[12rem] w-full animate-pulse rounded-xl bg-slate-100/90 motion-reduce:animate-none" />,
});

export default function CreatorTrafficLineLazy(props: { buckets: CreatorTimelinePoint[] }): JSX.Element {
  return <Inner buckets={props.buckets} />;
}
