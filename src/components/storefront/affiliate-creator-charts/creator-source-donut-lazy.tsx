"use client";

import dynamic from "next/dynamic";
import type { SourceRow } from "./creator-source-donut-inner";

const Inner = dynamic(() => import("./creator-source-donut-inner"), {
  ssr: false,
  loading: () => <div className="h-[11.5rem] w-full animate-pulse rounded-xl bg-slate-100/90 motion-reduce:animate-none" />,
});

export default function CreatorSourceDonutLazy(props: { rows: SourceRow[] }): JSX.Element {
  return <Inner rows={props.rows} />;
}
