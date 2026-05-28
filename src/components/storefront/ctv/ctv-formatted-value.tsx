"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  CTV_METRIC_VALUE,
  CTV_MONEY_VALUE,
  CTV_MONEY_VALUE_LG,
  CTV_MONEY_VALUE_SM,
  CTV_PERCENT_VALUE,
  CTV_VALUE_LEN_LG,
  CTV_VALUE_LEN_MD,
  CTV_VALUE_LEN_XL,
} from "./ctv-ui-tokens";
import { ctvInferFormattedVariant } from "./ctv-infer-formatted-variant";
import { ctvValueLengthTier, type CtvValueLengthTier } from "./ctv-value-length-tier";

export type CtvFormattedValueVariant = "money" | "money-lg" | "money-sm" | "metric" | "percent";

const VARIANT_CLASS: Record<CtvFormattedValueVariant, string> = {
  money: CTV_MONEY_VALUE,
  "money-lg": CTV_MONEY_VALUE_LG,
  "money-sm": CTV_MONEY_VALUE_SM,
  metric: CTV_METRIC_VALUE,
  percent: CTV_PERCENT_VALUE,
};

const LEN_CLASS: Record<CtvValueLengthTier, string> = {
  sm: "",
  md: CTV_VALUE_LEN_MD,
  lg: CTV_VALUE_LEN_LG,
  xl: CTV_VALUE_LEN_XL,
};

export type CtvFormattedValueProps = {
  value: string;
  variant?: CtvFormattedValueVariant | "auto";
  className?: string;
  title?: string;
};

function CtvFormattedValueInner({
  value,
  variant = "auto",
  className = "",
  title,
}: CtvFormattedValueProps): JSX.Element {
  const resolved = variant === "auto" ? ctvInferFormattedVariant(value) : variant;
  const tier = ctvValueLengthTier(value);
  return (
    <span className={cn(VARIANT_CLASS[resolved], LEN_CLASS[tier], className)} title={title ?? value}>
      {value}
    </span>
  );
}

export const CtvFormattedValue = memo(CtvFormattedValueInner);
