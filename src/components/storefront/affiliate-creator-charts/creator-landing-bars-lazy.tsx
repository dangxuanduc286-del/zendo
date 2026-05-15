"use client";

import dynamic from "next/dynamic";
import type { LandingRow } from "./creator-landing-bars-inner";

const Inner = dynamic(() => import("./creator-landing-bars-inner"), {
  ssr: false,
  loading: () => <div className="h-[13rem] w-full animate-pulse rounded-xl bg-slate-100/90 motion-reduce:animate-none" />,
});

export default function CreatorLandingBarsLazy(props: { rows: LandingRow[] }): JSX.Element {
  return <Inner rows={props.rows} />;
}
