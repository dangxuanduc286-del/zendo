"use client";

import { memo, type ReactNode } from "react";
import {
  CTV_MOBILE_KPI_GRID,
  CTV_MONEY_VALUE_MD,
  CTV_V2_STATS_CELL,
  CTV_V2_STATS_GRID,
  CTV_V2_LABEL,
} from "../ctv-ui-tokens";

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
  3: "grid w-full min-w-0 auto-rows-fr items-stretch grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2 sm:gap-3",
  4: CTV_MOBILE_KPI_GRID,
  6: "grid w-full min-w-0 auto-rows-fr items-stretch grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-2 sm:gap-3",
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
          <div key={item.id} className={CTV_V2_STATS_CELL}>
            <dt className={CTV_V2_LABEL}>{item.label}</dt>
            <dd className={`mt-2 block ${CTV_MONEY_VALUE_MD}`}>{item.value}</dd>
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
        <div
          key={item.id}
          className="min-w-0 break-words rounded-xl border border-black/[0.04] bg-slate-50/80 p-3 transition-[transform,box-shadow] duration-[250ms] ease-out hover:-translate-y-0.5 hover:shadow-md max-lg:rounded-lg max-lg:p-3 sm:p-4"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className={`mt-2 block ${CTV_MONEY_VALUE_MD}`}>{item.value}</dd>
          {item.sub ? <dd className="mt-1">{item.sub}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export const CtvMetricStrip = memo(CtvMetricStripInner);
