"use client";

import { memo } from "react";
import { CTV_V2_STAT_CAPTION, CTV_V2_STAT_VALUE } from "../ctv-ui-tokens";
import { CtvMetricTrend, type MetricTrendProps } from "./ctv-metric-trend";

type CtvKpiInlineProps = {
  label: string;
  value: string;
  trend?: MetricTrendProps;
  className?: string;
};

function CtvKpiInlineInner({ label, value, trend, className = "" }: CtvKpiInlineProps): JSX.Element {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className={CTV_V2_STAT_CAPTION}>{label}</p>
      <p className={`${CTV_V2_STAT_VALUE} text-lg lg:text-xl`}>{value}</p>
      {trend ? <div className="mt-1"><CtvMetricTrend {...trend} /></div> : null}
    </div>
  );
}

export const CtvKpiInline = memo(CtvKpiInlineInner);
