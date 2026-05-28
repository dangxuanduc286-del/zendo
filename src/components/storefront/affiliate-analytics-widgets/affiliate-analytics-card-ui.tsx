"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  CTV_ANALYTICS_CARD_BODY,
  CTV_ANALYTICS_CARD_HEADER,
  CTV_ANALYTICS_CHART_CONTAINER,
  CTV_ANALYTICS_CHART_CONTAINER_HEIGHT_PX,
  CTV_ANALYTICS_CHART_CONTAINER_INNER,
  CTV_ANALYTICS_REALTIME_METRIC_GRID,
  CTV_ANALYTICS_REALTIME_TAB,
  CTV_ANALYTICS_REALTIME_TAB_EMERALD,
  CTV_ANALYTICS_REALTIME_TAB_FUCHSIA,
  CTV_ANALYTICS_REALTIME_TAB_HEAD,
  CTV_ANALYTICS_REALTIME_TAB_ICON,
  CTV_ANALYTICS_REALTIME_TAB_LABEL,
  CTV_ANALYTICS_REALTIME_TAB_SLATE,
  CTV_ANALYTICS_REALTIME_TAB_VALUE,
  CTV_ANALYTICS_CARD_TITLE,
  CTV_ANALYTICS_SECTION_SHELL,
  CTV_SECTION_CARD,
  CTV_TYPE_CARD_TITLE,
} from "../affiliate/affiliate-ctv-account-ui-tokens";
import { renderAnalyticsHint } from "../affiliate/affiliate-analytics-card-hints";
import { CtvFormattedValue } from "../ctv/ctv-formatted-value";

export { CTV_ANALYTICS_CHART_CONTAINER_HEIGHT_PX as ANALYTICS_CHART_CONTAINER_HEIGHT_PX };

export type AnalyticsCardShellProps = {
  headingId: string;
  children: ReactNode;
  className?: string;
};

export function AnalyticsCardShell(props: AnalyticsCardShellProps): JSX.Element {
  return (
    <article
      className={clsx(CTV_SECTION_CARD, CTV_ANALYTICS_SECTION_SHELL, "max-lg:h-full", props.className)}
      aria-labelledby={props.headingId}
    >
      {props.children}
    </article>
  );
}

export type AnalyticsCardHeaderProps = {
  id: string;
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
};

export function AnalyticsCardHeader(props: AnalyticsCardHeaderProps): JSX.Element {
  return (
    <header className={CTV_ANALYTICS_CARD_HEADER}>
      <h3 id={props.id} className={`${CTV_TYPE_CARD_TITLE} ${CTV_ANALYTICS_CARD_TITLE}`}>
        {props.title}
      </h3>
      {props.actions ?? null}
      {!props.actions && props.hint != null && props.hint !== "" ? renderAnalyticsHint(props.hint) : null}
    </header>
  );
}

export type AnalyticsCardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function AnalyticsCardBody(props: AnalyticsCardBodyProps): JSX.Element {
  return <div className={clsx(CTV_ANALYTICS_CARD_BODY, props.className)}>{props.children}</div>;
}

export type AnalyticsChartContainerProps = {
  children: ReactNode;
  /** Bỏ padding — dùng cho bảng scroll bên trong. */
  flush?: boolean;
  className?: string;
};

export function AnalyticsChartContainer(props: AnalyticsChartContainerProps): JSX.Element {
  return (
    <div
      className={clsx(
        CTV_ANALYTICS_CHART_CONTAINER,
        props.flush && "p-0",
        props.className,
      )}
    >
      <div className={CTV_ANALYTICS_CHART_CONTAINER_INNER}>{props.children}</div>
    </div>
  );
}

export type AnalyticsEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function AnalyticsEmptyState(props: AnalyticsEmptyStateProps): JSX.Element {
  const Icon = props.icon;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <Icon className="h-8 w-8 shrink-0 text-slate-300" strokeWidth={1.25} aria-hidden />
      <p className="text-sm font-semibold text-slate-700">{props.title}</p>
      <p className="max-w-[16rem] text-xs leading-relaxed text-slate-500">{props.description}</p>
    </div>
  );
}

export function AnalyticsCardSkeleton(): JSX.Element {
  return <div className="h-full w-full animate-pulse rounded-lg bg-slate-100/90" aria-hidden />;
}

export type AnalyticsCardToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function AnalyticsCardToolbar(props: AnalyticsCardToolbarProps): JSX.Element {
  return (
    <div className={clsx("flex w-full min-w-0 shrink-0 flex-wrap gap-1.5", props.className)}>{props.children}</div>
  );
}

export type AnalyticsCardErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function AnalyticsCardError(props: AnalyticsCardErrorProps): JSX.Element {
  return (
    <p className="shrink-0 text-sm text-rose-700">
      {props.message}{" "}
      {props.onRetry ? (
        <button type="button" className="font-semibold underline" onClick={props.onRetry}>
          Thử lại
        </button>
      ) : null}
    </p>
  );
}

export type AnalyticsRealtimeMetricGridProps = {
  children: ReactNode;
};

export function AnalyticsRealtimeMetricGrid(props: AnalyticsRealtimeMetricGridProps): JSX.Element {
  return <div className={CTV_ANALYTICS_REALTIME_METRIC_GRID}>{props.children}</div>;
}

const realtimeTabToneClass: Record<"slate" | "emerald" | "fuchsia", string> = {
  slate: CTV_ANALYTICS_REALTIME_TAB_SLATE,
  emerald: CTV_ANALYTICS_REALTIME_TAB_EMERALD,
  fuchsia: CTV_ANALYTICS_REALTIME_TAB_FUCHSIA,
};

export type AnalyticsRealtimeMetricTabProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "fuchsia";
  pulse?: boolean;
};

/** Tab KPI Realtime — 4 ô cùng kích thước, layout dày, mobile-first. */
export function AnalyticsRealtimeMetricTab(props: AnalyticsRealtimeMetricTabProps): JSX.Element {
  const tone = props.tone ?? "slate";
  const Icon = props.icon;

  return (
    <div className={clsx(CTV_ANALYTICS_REALTIME_TAB, realtimeTabToneClass[tone])}>
      {props.pulse ? (
        <span
          className="motion-safe:animate-pulse absolute right-1.5 top-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.12)] motion-reduce:shadow-none sm:right-2 sm:top-2"
          aria-hidden
        />
      ) : null}
      <div className={CTV_ANALYTICS_REALTIME_TAB_HEAD}>
        <span className={CTV_ANALYTICS_REALTIME_TAB_ICON}>
          <Icon className="h-4 w-4 md:h-4 md:w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <p className={CTV_ANALYTICS_REALTIME_TAB_LABEL}>{props.label}</p>
      </div>
      <CtvFormattedValue
        value={props.value}
        variant="auto"
        className={CTV_ANALYTICS_REALTIME_TAB_VALUE}
        title={props.value}
      />
    </div>
  );
}

export function AnalyticsRealtimeMetricsSkeleton(): JSX.Element {
  return (
    <AnalyticsRealtimeMetricGrid>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={clsx(CTV_ANALYTICS_REALTIME_TAB, CTV_ANALYTICS_REALTIME_TAB_SLATE, "animate-pulse")}
          aria-hidden
        >
          <div className={CTV_ANALYTICS_REALTIME_TAB_HEAD}>
            <div className="h-7 w-7 shrink-0 rounded-lg bg-slate-100" />
            <div className="h-7 min-w-0 flex-1 rounded bg-slate-100" />
          </div>
          <div className="mt-1.5 h-6 w-4/5 rounded bg-slate-100" />
        </div>
      ))}
    </AnalyticsRealtimeMetricGrid>
  );
}
