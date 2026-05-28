"use client";

import { clsx } from "clsx";
import { Fragment, type ReactNode } from "react";
import { CTV_ANALYTICS_CARD_HINT, CTV_ANALYTICS_SECTION_HINT } from "./affiliate-ctv-account-ui-tokens";

function normalizeHintText(text: string): string {
  return text.replace(/\s*HH\s*\/\s*click/gi, "HH/click");
}

/** Tách hint thành các cụm nghĩa — tránh nowrap một khối dài (vd. CAPI). */
function splitHintClauses(text: string): string[] {
  const normalized = normalizeHintText(text);
  let parts: string[] = [normalized];

  for (const sep of [" — ", " · "] as const) {
    parts = parts.flatMap((p) => (p.includes(sep) ? p.split(sep).map((s) => s.trim()).filter(Boolean) : [p]));
  }

  parts = parts.flatMap((p) => {
    if (p.length > 36 && p.includes(". ")) {
      const segs = p.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
      return segs.map((t, i) => (i < segs.length - 1 ? `${t}.` : t));
    }
    if (p.length > 32 && p.includes(" & ")) {
      const bits = p.split(/\s+&\s+/).map((b) => b.trim()).filter(Boolean);
      return bits.map((b, i) => (i < bits.length - 1 ? `${b} &` : b));
    }
    return [p];
  });

  return parts.map((p) => p.trim()).filter(Boolean);
}

function HintClause({ children, desktopWrap }: { children: string; desktopWrap?: boolean }): JSX.Element {
  return (
    <span
      className={clsx(
        "inline max-md:break-words max-md:[overflow-wrap:anywhere] md:inline-block",
        desktopWrap
          ? "lg:whitespace-normal lg:break-words lg:[overflow-wrap:anywhere] md:whitespace-nowrap"
          : "md:whitespace-nowrap",
      )}
    >
      {children}
    </span>
  );
}

function renderClauses(clauses: string[], className: string, desktopWrap?: boolean): JSX.Element {
  if (clauses.length <= 1) {
    return <span className={className}>{clauses[0] ?? ""}</span>;
  }

  return (
    <span className={className}>
      {clauses.map((clause, i) => (
        <Fragment key={`${clause}-${i}`}>
          {i > 0 ? (
            <>
              <span className={clsx("hidden md:inline", desktopWrap && "lg:hidden")}> · </span>
              <br className={desktopWrap ? "md:hidden lg:block" : "md:hidden"} aria-hidden />
            </>
          ) : null}
          <HintClause desktopWrap={desktopWrap}>{clause}</HintClause>
        </Fragment>
      ))}
    </span>
  );
}

const CTV_ANALYTICS_CARD_HINT_DESKTOP_WRAP = [
  CTV_ANALYTICS_CARD_HINT,
  "lg:max-w-[min(100%,22rem)] lg:overflow-hidden lg:whitespace-normal lg:break-words lg:[overflow-wrap:anywhere]",
].join(" ");

type AnalyticsCardHintTextProps = {
  text: string;
  className?: string;
  /** lg+: wrap cụm hint trong card (vd. CAPI) — mobile/tablet md giữ hành vi cũ. */
  desktopWrap?: boolean;
};

/** Tiêu đề phụ — mobile: co/wrap trong card; desktop giữ nowrap từng cụm ngắn. */
export function AnalyticsCardHintText(props: AnalyticsCardHintTextProps): JSX.Element {
  const className = props.desktopWrap
    ? (props.className ?? CTV_ANALYTICS_CARD_HINT_DESKTOP_WRAP)
    : (props.className ?? CTV_ANALYTICS_CARD_HINT);
  return renderClauses(splitHintClauses(props.text), className, props.desktopWrap);
}

export function AnalyticsSectionHintText(props: { text: string }): JSX.Element {
  return renderClauses(splitHintClauses(props.text), CTV_ANALYTICS_SECTION_HINT);
}

export function renderAnalyticsHint(hint: ReactNode): ReactNode {
  if (typeof hint === "string") return <AnalyticsCardHintText text={hint} />;
  return hint;
}
