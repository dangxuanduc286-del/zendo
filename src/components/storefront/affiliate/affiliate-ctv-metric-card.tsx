"use client";

import type { LucideIcon } from "lucide-react";
import {
  CTV_METRIC_ICON,
  CTV_METRIC_ICON_ACCENT,
  CTV_METRIC_TILE,
  CTV_METRIC_TILE_ACCENT,
  CTV_TYPE_METRIC_HINT,
  CTV_TYPE_METRIC_LABEL,
  CTV_TYPE_METRIC_VALUE,
} from "./affiliate-ctv-account-ui-tokens";

type AffiliateCtvMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  accent?: boolean;
};

export function AffiliateCtvMetricCard({
  label,
  value,
  hint,
  Icon,
  accent = false,
}: AffiliateCtvMetricCardProps): JSX.Element {
  const shell = accent ? CTV_METRIC_TILE_ACCENT : CTV_METRIC_TILE;

  return (
    <article className={`${shell} flex h-full min-h-[5.5rem] min-w-0 max-w-full flex-col justify-between`}>
      <div className="flex h-full min-h-0 items-start justify-between gap-1.5 sm:gap-2.5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <p className={`${CTV_TYPE_METRIC_LABEL} break-words`}>{label}</p>
          <p className={`${CTV_TYPE_METRIC_VALUE} min-w-0 max-w-full truncate`} title={value}>
            {value}
          </p>
          {hint ? (
            <p className={`${CTV_TYPE_METRIC_HINT} break-words`}>{hint}</p>
          ) : (
            <span className="mt-2 block min-h-[1.125rem]" aria-hidden />
          )}
        </div>
        <div
          className={`${CTV_METRIC_ICON} ${accent ? CTV_METRIC_ICON_ACCENT : ""}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </article>
  );
}
