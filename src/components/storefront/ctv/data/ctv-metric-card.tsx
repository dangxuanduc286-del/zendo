"use client";

import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CTV_METRIC_ICON,
  CTV_METRIC_ICON_ACCENT,
  CTV_METRIC_TILE,
  CTV_METRIC_TILE_ACCENT,
} from "../../affiliate/affiliate-ctv-account-ui-tokens";
import {
  CTV_MOBILE_KPI_HINT,
  CTV_MOBILE_KPI_LABEL,
  CTV_MOBILE_KPI_VALUE,
} from "../ctv-ui-tokens";
import { CTV_MOTION_CLASS } from "../ctv-motion-tokens";
import { CtvMetricTrend, type MetricTrendProps } from "./ctv-metric-trend";

export type CtvMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  Icon?: LucideIcon;
  accent?: boolean;
  trend?: MetricTrendProps;
  footer?: ReactNode;
  className?: string;
  id?: string;
};

function CtvMetricCardInner({
  label,
  value,
  hint,
  Icon,
  accent = false,
  trend,
  footer,
  className = "",
  id,
}: CtvMetricCardProps): JSX.Element {
  const shell = accent ? CTV_METRIC_TILE_ACCENT : CTV_METRIC_TILE;
  const labelId = id ? `${id}-label` : undefined;

  return (
    <article
      id={id}
      className={`${shell} min-w-0 max-w-full overflow-hidden break-words ${CTV_MOTION_CLASS.base} ${className}`}
      aria-labelledby={labelId}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 overflow-hidden break-words">
          <p id={labelId} className={`${CTV_MOBILE_KPI_LABEL} break-words`}>
            {label}
          </p>
          <p className={`${CTV_MOBILE_KPI_VALUE} mt-1.5`} title={value}>
            {value}
          </p>
          {trend ? (
            <div className="mt-1.5">
              <CtvMetricTrend {...trend} />
            </div>
          ) : null}
          {hint ? (
            <p className={CTV_MOBILE_KPI_HINT}>{hint}</p>
          ) : (
            <span className="mt-1.5 block min-h-[2.5rem] max-md:min-h-[2.25rem]" aria-hidden />
          )}
        </div>
        {Icon ? (
          <div
            className={`${CTV_METRIC_ICON} ${accent ? CTV_METRIC_ICON_ACCENT : ""}`}
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}
      </div>
      {footer ? <div className="mt-3 border-t border-black/[0.05] pt-3">{footer}</div> : null}
    </article>
  );
}

export const CtvMetricCard = memo(CtvMetricCardInner);
