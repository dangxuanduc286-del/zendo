"use client";

import { memo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CTV_V2_LABEL } from "../ctv-ui-tokens";
import { CTV_MOTION_CLASS } from "../ctv-motion-tokens";

export type MetricTrendDirection = "up" | "down" | "flat" | "neutral";

export type MetricTrendProps = {
  /** e.g. "+12%" — when API ready */
  delta?: string | null;
  /** e.g. "so với hôm qua" */
  caption?: string | null;
  direction?: MetricTrendDirection;
  className?: string;
};

const TONE: Record<MetricTrendDirection, string> = {
  up: "text-emerald-700 bg-emerald-50/90 ring-emerald-100/80",
  down: "text-rose-700 bg-rose-50/90 ring-rose-100/80",
  flat: "text-slate-600 bg-slate-100/80 ring-slate-200/60",
  neutral: "text-slate-500 bg-slate-50/90 ring-slate-100/80",
};

function TrendIcon({ direction }: { direction: MetricTrendDirection }): JSX.Element | null {
  if (direction === "up") return <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />;
  if (direction === "down") return <ArrowDownRight className="h-3 w-3 shrink-0" aria-hidden />;
  if (direction === "flat") return <Minus className="h-3 w-3 shrink-0" aria-hidden />;
  return null;
}

function CtvMetricTrendInner({ delta, caption, direction = "neutral", className = "" }: MetricTrendProps): JSX.Element {
  const hasDelta = Boolean(delta?.trim());
  const hasCaption = Boolean(caption?.trim());

  if (!hasDelta && !hasCaption) {
    return (
      <span className={`${CTV_V2_LABEL} opacity-60 ${className}`} aria-hidden>
        —
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {hasDelta ? (
        <span
          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ${CTV_MOTION_CLASS.base} ${TONE[direction]}`}
        >
          <TrendIcon direction={direction} />
          {delta}
        </span>
      ) : null}
      {hasCaption ? <span className="text-[10px] font-medium text-slate-500">{caption}</span> : null}
    </span>
  );
}

export const CtvMetricTrend = memo(CtvMetricTrendInner);
