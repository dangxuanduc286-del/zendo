"use client";

import { memo } from "react";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import { CTV_HUB_CLICK_LABEL } from "@/lib/ctv/ctv-click-display";
import {
  CTV_HUB_ORDER_HINT,
  CTV_HUB_ORDER_LABEL,
  CTV_PAID_ORDER_KPI_HINT,
  paidOrderLabelForAnalyticsRange,
} from "@/lib/ctv/ctv-order-display";
import {
  conversionPercentFromAnalyticsOverview,
  CTV_CONVERSION_FORMULA_HINT,
  CTV_CONVERSION_MONTH_LABEL,
} from "@/lib/ctv/ctv-conversion-month-kpi";
import { CtvDataError, CtvDataLoading } from "./data/ctv-data-states";
import { CtvFormattedValue } from "./ctv-formatted-value";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_INNER_CARD,
  CTV_HUB_KPI_GRID,
  CTV_HUB_KPI_HINT,
  CTV_HUB_KPI_LABEL,
  CTV_HUB_KPI_TILE,
  CTV_HUB_CARD_TITLE,
} from "./ctv-ui-tokens";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`;

type CtvPerformanceSectionProps = {
  metrics: CtvAffiliateMetrics;
};

function CtvPerformanceSectionInner({ metrics }: CtvPerformanceSectionProps): JSX.Element {
  const monthPaidOrders = metrics.monthOverview?.paidOrders ?? 0;
  const monthOrders = metrics.monthOverview?.orders ?? 0;
  const todayClicks = metrics.todayOverview?.totalClicks ?? 0;
  const monthCommission = metrics.income?.monthCommission ?? metrics.monthOverview?.approvedCommission ?? 0;
  const convPending = metrics.loading && !metrics.monthOverview;
  const conv = conversionPercentFromAnalyticsOverview(metrics.monthOverview, { pending: convPending });
  const monthPaidOrderLabel = paidOrderLabelForAnalyticsRange("month");

  return (
    <section
      className={[CTV_HUB_INNER_CARD, CTV_HUB_CARD_PAD].join(" ")}
      aria-labelledby="ctv-performance-heading"
    >
      <h2 id="ctv-performance-heading" className={CTV_HUB_CARD_TITLE}>
        Hiệu suất
      </h2>
      {metrics.loading ? (
        <CtvDataLoading
          title="Đang tải số liệu hiệu suất"
          className="!mt-6 !rounded-2xl !border !border-slate-200 !bg-slate-50/80 !p-6 !shadow-none"
        />
      ) : metrics.error ? (
        <CtvDataError
          title="Không tải được số liệu"
          description={metrics.error}
          className="!mt-6 !rounded-2xl !border !border-slate-200 !bg-slate-50/80 !p-6 !shadow-none"
        />
      ) : (
        <div className={`${CTV_HUB_KPI_GRID} mt-6`} role="list">
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`${CTV_HUB_CLICK_LABEL} ${todayClicks}`}>
            <CtvFormattedValue value={todayClicks.toLocaleString("vi-VN")} variant="metric" />
            <p className={CTV_HUB_KPI_LABEL}>{CTV_HUB_CLICK_LABEL}</p>
          </article>
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`${CTV_HUB_ORDER_LABEL} ${monthOrders}`}>
            <CtvFormattedValue value={monthOrders.toLocaleString("vi-VN")} variant="metric" />
            <p className={CTV_HUB_KPI_LABEL} title={CTV_HUB_ORDER_HINT}>
              {CTV_HUB_ORDER_LABEL}
            </p>
          </article>
          <article
            className={CTV_HUB_KPI_TILE}
            role="listitem"
            aria-label={conv != null ? `Tỷ lệ chuyển đổi ${conv}%` : "Tỷ lệ chuyển đổi chưa có"}
          >
            <CtvFormattedValue value={conv != null ? `${conv}%` : "—"} variant="percent" />
            <p className={CTV_HUB_KPI_LABEL} title={CTV_CONVERSION_FORMULA_HINT}>
              {CTV_CONVERSION_MONTH_LABEL}
            </p>
          </article>
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`${monthPaidOrderLabel} ${monthPaidOrders}`}>
            <CtvFormattedValue value={monthPaidOrders.toLocaleString("vi-VN")} variant="metric" />
            <p className={CTV_HUB_KPI_LABEL} title={CTV_PAID_ORDER_KPI_HINT}>
              {monthPaidOrderLabel}
            </p>
            {monthCommission > 0 ? (
              <p className={CTV_HUB_KPI_HINT}>
                HH tháng:{" "}
                <CtvFormattedValue value={money(monthCommission)} variant="money-sm" className="inline font-semibold text-slate-700" />
              </p>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}

export const CtvPerformanceSection = memo(CtvPerformanceSectionInner);
