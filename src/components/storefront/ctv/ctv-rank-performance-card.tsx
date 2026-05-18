"use client";

import { Wallet } from "lucide-react";
import { memo } from "react";
import type { CtvAffiliateMetrics } from "@/lib/ctv/use-ctv-affiliate-metrics";
import { CtvDataError, CtvDataLoading } from "./data/ctv-data-states";
import { CtvMemberRankCard } from "./ctv-member-rank-card";
import {
  CTV_V2_BTN_WALLET,
  CTV_V2_CARD_COMPACT,
  CTV_V2_DASHBOARD_COL_STACK,
  CTV_V2_LABEL_UPPER,
  CTV_V2_SECTION_TITLE,
  CTV_V2_STATS_CELL,
  CTV_V2_STATS_GRID_4,
  CTV_V2_STAT_VALUE,
  CTV_V2_WALLET_CARD,
} from "./ctv-ui-tokens";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`;

type CtvRankPerformanceCardProps = {
  ctvRankRevenue: number;
  ctvRankRevenueLoading?: boolean;
  withdrawableBalance: number;
  conversionRatePercent: number | null;
  metrics: CtvAffiliateMetrics;
  withdrawalEnabled: boolean;
  onWithdraw: () => void;
};

function CtvRankPerformanceCardInner({
  ctvRankRevenue,
  ctvRankRevenueLoading = false,
  withdrawableBalance,
  conversionRatePercent,
  metrics,
  withdrawalEnabled,
  onWithdraw,
}: CtvRankPerformanceCardProps): JSX.Element {
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
    <div className={`${CTV_V2_DASHBOARD_COL_STACK} h-full`}>
      <CtvMemberRankCard totalRevenue={ctvRankRevenue} loading={ctvRankRevenueLoading} />

      <article className={CTV_V2_WALLET_CARD} aria-labelledby="ctv-wallet-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 id="ctv-wallet-heading" className={CTV_V2_LABEL_UPPER}>
              Hoa hồng khả dụng
            </h3>
            <p className={`${CTV_V2_STAT_VALUE} mt-1`} title={money(withdrawableBalance)}>
              {money(withdrawableBalance)}
            </p>
          </div>
          {withdrawalEnabled ? (
            <button
              type="button"
              onClick={onWithdraw}
              className={`${CTV_V2_BTN_WALLET} w-full max-lg:min-h-10 max-lg:px-4 sm:w-auto sm:shrink-0`}
              aria-label="Rút tiền hoa hồng khả dụng"
              title="Rút tiền ngay"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              Rút tiền
            </button>
          ) : null}
        </div>
      </article>

      <article className={`${CTV_V2_CARD_COMPACT} flex-1 overflow-hidden !p-0`} aria-labelledby="ctv-performance-heading">
        <header className="border-b border-black/[0.05] px-4 py-3">
          <h3 id="ctv-performance-heading" className={CTV_V2_SECTION_TITLE}>
            Hiệu suất
          </h3>
        </header>
        {metrics.loading ? (
          <CtvDataLoading
            title="Đang tải số liệu hiệu suất"
            className="!rounded-none !border-0 !bg-transparent !shadow-none"
          />
        ) : metrics.error ? (
          <CtvDataError
            title="Không tải được số liệu"
            description={metrics.error}
            className="!rounded-none !border-0 !bg-transparent !shadow-none"
          />
        ) : (
          <dl className={CTV_V2_STATS_GRID_4}>
            <div className={CTV_V2_STATS_CELL}>
              <dt className={CTV_V2_LABEL_UPPER}>Click hôm nay</dt>
              <dd className={`${CTV_V2_STAT_VALUE} mt-1.5`}>{todayClicks.toLocaleString("vi-VN")}</dd>
            </div>
            <div className={CTV_V2_STATS_CELL}>
              <dt className={CTV_V2_LABEL_UPPER}>Đơn phát sinh</dt>
              <dd className={`${CTV_V2_STAT_VALUE} mt-1.5`}>{monthOrders.toLocaleString("vi-VN")}</dd>
            </div>
            <div className={CTV_V2_STATS_CELL}>
              <dt className={CTV_V2_LABEL_UPPER}>Tỷ lệ chuyển đổi</dt>
              <dd className={`${CTV_V2_STAT_VALUE} mt-1.5`}>{conv != null ? `${conv}%` : "—"}</dd>
            </div>
            <div className={CTV_V2_STATS_CELL}>
              <dt className={CTV_V2_LABEL_UPPER}>Đơn thành công</dt>
              <dd className={`${CTV_V2_STAT_VALUE} mt-1.5`}>{monthPaidOrders.toLocaleString("vi-VN")}</dd>
              {monthCommission > 0 ? (
                <dd className="mt-1 text-[11px] text-[#6B7280]">
                  HH tháng: <strong>{money(monthCommission)}</strong>
                </dd>
              ) : null}
            </div>
          </dl>
        )}
      </article>
    </div>
  );
}

export const CtvRankPerformanceCard = memo(CtvRankPerformanceCardInner);
