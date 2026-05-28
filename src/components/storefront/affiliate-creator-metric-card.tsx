"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import {
  CTV_ANALYTICS_CARD_HEADER,
  CTV_ANALYTICS_CARD_TITLE,
  CTV_METRIC_TILE,
  CTV_METRIC_TILE_ACCENT,
  CTV_SECTION_CARD,
  CTV_TYPE_CARD_TITLE,
  CTV_TYPE_METRIC_HINT,
  CTV_TYPE_METRIC_LABEL,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import { AnalyticsCardHintText } from "./affiliate/affiliate-analytics-card-hints";
import { CtvFormattedValue } from "./ctv/ctv-formatted-value";

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
  /** Tooltip nhãn (vd. công thức conversion). */
  labelTitle?: string;
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
          <p
            className={`${CTV_TYPE_METRIC_LABEL} min-w-0 flex-1 truncate`}
            title={props.labelTitle}
          >
            {props.label}
          </p>
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
        <CtvFormattedValue value={props.value} variant="money" className="mt-auto" />
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
  /** lg+: hint xuống dòng trong card, không tràn (mobile/md giữ nguyên). */
  hintDesktopWrap?: boolean;
  children: ReactNode;
  className?: string;
  /** lg+: body flex-1 để cặp card traffic cùng chiều cao. */
  bodyClassName?: string;
}): JSX.Element {
  return (
    <div className={clsx(CTV_SECTION_CARD, props.className)}>
      <div
        className={clsx(
          CTV_ANALYTICS_CARD_HEADER,
          props.hintDesktopWrap && "lg:flex-wrap lg:items-start lg:gap-y-1.5",
        )}
      >
        <h3 className={`${CTV_TYPE_CARD_TITLE} ${CTV_ANALYTICS_CARD_TITLE}`}>{props.title}</h3>
        {props.hint ? (
          <AnalyticsCardHintText text={props.hint} desktopWrap={props.hintDesktopWrap} />
        ) : null}
      </div>
      <div
        className={clsx(
          "flex min-h-0 flex-col",
          props.bodyClassName ?? "max-lg:min-h-0 lg:flex-none",
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

export function CreatorEmptyState(props: { title: string; hint: string; icon?: LucideIcon; className?: string }): JSX.Element {
  const Icon = props.icon;
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center",
        props.className,
      )}
    >
      {Icon ? <Icon className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.25} aria-hidden /> : null}
      <p className="text-sm font-semibold text-slate-700">{props.title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{props.hint}</p>
    </div>
  );
}
