"use client";

import { memo } from "react";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import { CtvDataError, CtvDataLoading } from "./data/ctv-data-states";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_INNER_CARD,
  CTV_HUB_KPI_GRID,
  CTV_HUB_KPI_HINT,
  CTV_HUB_KPI_LABEL,
  CTV_HUB_KPI_TILE,
  CTV_HUB_KPI_VALUE,
  CTV_HUB_CARD_TITLE,
} from "./ctv-ui-tokens";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`;

type CtvPerformanceSectionProps = {
  metrics: CtvAffiliateMetrics;
  conversionRatePercent: number | null;
};

function CtvPerformanceSectionInner({
  metrics,
  conversionRatePercent,
}: CtvPerformanceSectionProps): JSX.Element {
  const monthPaidOrders = metrics.monthOverview?.paidOrders ?? 0;
  const monthOrders = metrics.monthOverview?.orders ?? 0;
  const todayClicks = metrics.todayOverview?.totalClicks ?? 0;
  const monthCommission = metrics.income?.monthCommission ?? metrics.monthOverview?.approvedCommission ?? 0;
  const conv =
    conversionRatePercent != null
      ? conversionRatePercent
      : metrics.monthOverview
        ? Math.round(metrics.monthOverview.conversionRate * 1000) / 10
        : null;

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
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`Click hôm nay ${todayClicks}`}>
            <p className={`${CTV_HUB_KPI_VALUE} block`}>{todayClicks.toLocaleString("vi-VN")}</p>
            <p className={CTV_HUB_KPI_LABEL}>Click hôm nay</p>
          </article>
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`Đơn phát sinh ${monthOrders}`}>
            <p className={`${CTV_HUB_KPI_VALUE} block`}>{monthOrders.toLocaleString("vi-VN")}</p>
            <p className={CTV_HUB_KPI_LABEL}>Đơn phát sinh</p>
          </article>
          <article
            className={CTV_HUB_KPI_TILE}
            role="listitem"
            aria-label={conv != null ? `Tỷ lệ chuyển đổi ${conv}%` : "Tỷ lệ chuyển đổi chưa có"}
          >
            <p className={`${CTV_HUB_KPI_VALUE} block`}>{conv != null ? `${conv}%` : "—"}</p>
            <p className={CTV_HUB_KPI_LABEL}>Tỷ lệ chuyển đổi</p>
          </article>
          <article className={CTV_HUB_KPI_TILE} role="listitem" aria-label={`Đơn thành công ${monthPaidOrders}`}>
            <p className={`${CTV_HUB_KPI_VALUE} block`}>{monthPaidOrders.toLocaleString("vi-VN")}</p>
            <p className={CTV_HUB_KPI_LABEL}>Đơn thành công</p>
            {monthCommission > 0 ? (
              <p className={CTV_HUB_KPI_HINT}>
                HH tháng: <strong className="font-semibold text-slate-700">{money(monthCommission)}</strong>
              </p>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}

export const CtvPerformanceSection = memo(CtvPerformanceSectionInner);
