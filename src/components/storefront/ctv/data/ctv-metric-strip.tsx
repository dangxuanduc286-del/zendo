"use client";

import { memo, type ReactNode } from "react";
import { CtvFormattedValue } from "../ctv-formatted-value";
import {
  CTV_HUB_KPI_TILE,
  CTV_METRIC_STRIP_GRID_3,
  CTV_METRIC_STRIP_LABEL,
  CTV_METRIC_STRIP_TILE,
  CTV_MOBILE_KPI_GRID,
  CTV_V2_STATS_GRID,
  CTV_V2_LABEL,
} from "../ctv-ui-tokens";

function CtvMetricStripValue({ value, className = "mt-2" }: { value: ReactNode; className?: string }): JSX.Element {
  if (typeof value === "string") {
    return (
      <dd className={`${className} block min-w-0 max-w-full`}>
        <CtvFormattedValue value={value} />
      </dd>
    );
  }
  return <dd className={`${className} block min-w-0 max-w-full`}>{value}</dd>;
}

export type CtvMetricStripItem = {
  id: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
};

type CtvMetricStripProps = {
  items: CtvMetricStripItem[];
  columns?: 2 | 3 | 4 | 6;
  className?: string;
  "aria-label"?: string;
  variant?: "inset" | "dashboard";
};

const COL_CLASS: Record<NonNullable<CtvMetricStripProps["columns"]>, string> = {
  2: CTV_MOBILE_KPI_GRID,
  3: CTV_METRIC_STRIP_GRID_3,
  4: CTV_MOBILE_KPI_GRID,
  6: [
    "grid w-full min-w-0 auto-rows-fr items-stretch gap-2 sm:gap-3",
    "max-lg:grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]",
    "lg:grid-cols-6 lg:gap-3",
  ].join(" "),
};

function CtvMetricStripInner({
  items,
  columns = 3,
  className = "",
  "aria-label": ariaLabel,
  variant = "inset",
}: CtvMetricStripProps): JSX.Element {
  if (variant === "dashboard") {
    return (
      <dl className={`${CTV_V2_STATS_GRID} ${className}`} aria-label={ariaLabel}>
        {items.map((item) => (
          <div key={item.id} className={CTV_HUB_KPI_TILE}>
            <dt className={`${CTV_V2_LABEL} lg:whitespace-nowrap lg:break-normal`}>{item.label}</dt>
            <CtvMetricStripValue value={item.value} />
            {item.sub ? <dd className="mt-1 text-[10px] text-slate-500">{item.sub}</dd> : null}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={`grid w-full min-w-0 max-w-full ${COL_CLASS[columns]} ${className}`}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div key={item.id} className={CTV_METRIC_STRIP_TILE}>
          <dt className={CTV_METRIC_STRIP_LABEL}>{item.label}</dt>
          <CtvMetricStripValue value={item.value} />
          {item.sub ? <dd className="mt-1">{item.sub}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export const CtvMetricStrip = memo(CtvMetricStripInner);
