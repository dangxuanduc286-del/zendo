"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import {
  CTV_METRIC_TILE,
  CTV_METRIC_TILE_ACCENT,
  CTV_SECTION_CARD,
  CTV_TYPE_BODY,
  CTV_TYPE_CARD_TITLE,
  CTV_TYPE_METRIC_HINT,
  CTV_TYPE_METRIC_LABEL,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import { CTV_MONEY_VALUE_SM } from "./ctv/ctv-ui-tokens";

/** KPI compact — clamp nhỏ hơn hub + ellipsis khi số cực đoan (visual regression). */
const CREATOR_METRIC_VALUE = [
  CTV_MONEY_VALUE_SM,
  "mt-auto block min-w-0 max-w-full truncate",
].join(" ");

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={clsx("animate-pulse rounded-lg bg-slate-100/90", className)} />;
}

const metricToneShell: Record<"blue" | "emerald" | "fuchsia" | "slate" | "amber", string> = {
  slate: CTV_METRIC_TILE,
  emerald: CTV_METRIC_TILE_ACCENT,
  blue: `${CTV_METRIC_TILE} ring-blue-100/80 hover:ring-blue-200/90`,
  fuchsia: `${CTV_METRIC_TILE} ring-fuchsia-100/80 hover:ring-fuchsia-200/90`,
  amber: `${CTV_METRIC_TILE} ring-amber-100/80 hover:ring-amber-200/90`,
};

export type CreatorMetricCardProps = {
  icon?: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof metricToneShell;
  loading?: boolean;
  pulse?: boolean;
  /** % so với lần tải trước (client-only). */
  trendPct?: number | null;
};

function CreatorMetricCardInner(props: CreatorMetricCardProps): JSX.Element {
  const tone = props.tone ?? "slate";
  const Icon = props.icon;
  const t = props.trendPct;
  const trendColor =
    t == null || !Number.isFinite(t) ? "text-slate-400" : t > 0 ? "text-emerald-600" : t < 0 ? "text-rose-600" : "text-slate-500";

  return (
    <div
      className={clsx(metricToneShell[tone], "overflow-hidden")}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {Icon ? (
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden />
          ) : null}
          <p className={`${CTV_TYPE_METRIC_LABEL} min-w-0 flex-1 truncate`}>{props.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {t != null && Number.isFinite(t) ? (
            <span className={clsx("rounded-md bg-white/80 px-1 py-0.5 text-[9px] font-bold tabular-nums ring-1 ring-slate-100", trendColor)}>
              {t > 0 ? "+" : ""}
              {t.toFixed(0)}%
            </span>
          ) : null}
          {props.pulse ? (
            <span
              className="motion-safe:animate-pulse inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.12)] motion-reduce:shadow-none"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
      {props.loading ? (
        <Skeleton className="mt-auto h-8 w-24" />
      ) : (
        <p className={CREATOR_METRIC_VALUE} title={props.value}>
          {props.value}
        </p>
      )}
      {props.sub ? <p className={`${CTV_TYPE_METRIC_HINT} mt-0.5 min-w-0`}>{props.sub}</p> : null}
    </div>
  );
}

/** Thẻ số kiểu creator: metric nổi, label nhỏ, icon Lucide, trend tùy chọn. */
export const CreatorMetricCard = memo(CreatorMetricCardInner);
CreatorMetricCard.displayName = "CreatorMetricCard";

export function CreatorSectionShell(props: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx(CTV_SECTION_CARD, props.className)}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-slate-200/60 pb-3">
        <h3 className={`${CTV_TYPE_CARD_TITLE} min-w-0 flex-1`}>{props.title}</h3>
        {props.hint ? (
          <span className={`${CTV_TYPE_BODY} min-w-0 max-w-[16rem] shrink-0 text-right text-xs`}>{props.hint}</span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>
    </div>
  );
}

export function CreatorEmptyState(props: { title: string; hint: string; icon?: LucideIcon; className?: string }): JSX.Element {
  const Icon = props.icon;
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center",
        props.className,
      )}
    >
      {Icon ? <Icon className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.25} aria-hidden /> : null}
      <p className="text-sm font-semibold text-slate-700">{props.title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{props.hint}</p>
    </div>
  );
}
