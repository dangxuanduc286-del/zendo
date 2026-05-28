"use client";

import { memo } from "react";
import type { CtvTierProgressSummary } from "@/lib/ctv/ctv-affiliate-lifecycle";
import { CtvFormattedValue } from "./ctv-formatted-value";
import {
  CTV_HUB_CARD_TITLE,
  CTV_HUB_PROGRESS_TRACK,
  CTV_HUB_TIER_SHELL,
  CTV_TIER_PROGRESS_BODY,
  CTV_TIER_PROGRESS_PROGRESS_BLOCK,
  CTV_TIER_PROGRESS_PROGRESS_HEAD,
  CTV_TIER_PROGRESS_PROGRESS_LABEL,
  CTV_TIER_PROGRESS_PROGRESS_PCT,
  CTV_TIER_PROGRESS_REMAINING,
  CTV_TIER_PROGRESS_REVENUE_LABEL,
  CTV_TIER_PROGRESS_REVENUE_VALUE,
  CTV_TIER_PROGRESS_STAT_CELL,
  CTV_TIER_PROGRESS_STAT_GRID,
  CTV_TIER_PROGRESS_STAT_LABEL,
  CTV_TIER_PROGRESS_STAT_VALUE,
} from "./ctv-ui-tokens";

type CtvTierProgressWidgetProps = {
  progress: CtvTierProgressSummary;
  loading?: boolean;
};

function formatMoney(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n)))}₫`;
}

function CtvTierProgressWidgetInner({ progress, loading = false }: CtvTierProgressWidgetProps): JSX.Element {
  const progressWidth = loading ? 30 : progress.progressPercent;

  return (
    <section
      className={CTV_HUB_TIER_SHELL}
      aria-labelledby="ctv-tier-progress-heading"
    >
      <h2 id="ctv-tier-progress-heading" className={CTV_HUB_CARD_TITLE}>
        Tiến độ cấp bậc
      </h2>

      {loading ? (
        <div className={CTV_TIER_PROGRESS_BODY} aria-hidden>
          <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-slate-200/80" />
          <div className={CTV_TIER_PROGRESS_STAT_GRID}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[3.5rem] animate-pulse rounded-xl bg-slate-200/60 sm:h-[3.75rem]" />
            ))}
          </div>
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-200/60" />
          <div className={CTV_TIER_PROGRESS_PROGRESS_BLOCK}>
            <div className="h-4 w-full animate-pulse rounded bg-slate-200/60" />
            <div className={CTV_HUB_PROGRESS_TRACK}>
              <div className="h-full w-1/3 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ) : (
        <div className={CTV_TIER_PROGRESS_BODY}>
          <div className="min-w-0">
            <p className={CTV_TIER_PROGRESS_REVENUE_LABEL}>Doanh thu 30 ngày gần nhất</p>
            <div className={CTV_TIER_PROGRESS_REVENUE_VALUE}>
              <CtvFormattedValue value={formatMoney(progress.revenue30d)} variant="money-lg" />
            </div>
          </div>

          <dl className={CTV_TIER_PROGRESS_STAT_GRID}>
            <div className={CTV_TIER_PROGRESS_STAT_CELL}>
              <dt className={CTV_TIER_PROGRESS_STAT_LABEL}>Cấp hiện tại</dt>
              <dd className={CTV_TIER_PROGRESS_STAT_VALUE} title={progress.currentTierName}>
                {progress.currentTierName}
              </dd>
            </div>
            <div className={CTV_TIER_PROGRESS_STAT_CELL}>
              <dt className={CTV_TIER_PROGRESS_STAT_LABEL}>Hoa hồng hiện tại</dt>
              <dd className="mt-1 min-w-0">
                <CtvFormattedValue value={`${progress.currentCommissionPercent}%`} variant="percent" />
              </dd>
            </div>
            {!progress.isMaxRank && progress.nextTierName ? (
              <>
                <div className={CTV_TIER_PROGRESS_STAT_CELL}>
                  <dt className={CTV_TIER_PROGRESS_STAT_LABEL}>Mục tiêu tiếp theo</dt>
                  <dd className={CTV_TIER_PROGRESS_STAT_VALUE} title={progress.nextTierName}>
                    {progress.nextTierName}
                  </dd>
                </div>
                <div className={CTV_TIER_PROGRESS_STAT_CELL}>
                  <dt className={CTV_TIER_PROGRESS_STAT_LABEL}>Thưởng cấp tiếp</dt>
                  <dd className="mt-1 min-w-0 text-emerald-700">
                    <CtvFormattedValue
                      value={
                        progress.nextTierRewardAmount != null
                          ? formatMoney(progress.nextTierRewardAmount)
                          : "—"
                      }
                      variant="money-sm"
                    />
                  </dd>
                </div>
              </>
            ) : (
              <div className={[CTV_TIER_PROGRESS_STAT_CELL, "col-span-2 sm:col-span-2"].join(" ")}>
                <dt className={CTV_TIER_PROGRESS_STAT_LABEL}>Trạng thái</dt>
                <dd className={[CTV_TIER_PROGRESS_STAT_VALUE, "text-emerald-700"].join(" ")}>
                  Đã đạt cấp cao nhất
                </dd>
              </div>
            )}
          </dl>

          {!progress.isMaxRank && progress.remainingToNext > 0 ? (
            <p className={CTV_TIER_PROGRESS_REMAINING}>
              Còn thiếu{" "}
              <CtvFormattedValue value={formatMoney(progress.remainingToNext)} variant="money-sm" className="inline font-bold" />{" "}
              để đạt <strong className="text-[#0f172a]">{progress.nextTierName ?? "cấp tiếp theo"}</strong>
              {progress.revenueTargetNext != null ? (
                <>
                  {" "}
                  (mốc {formatMoney(progress.revenueTargetNext)})
                </>
              ) : null}
            </p>
          ) : null}

          <div className={CTV_TIER_PROGRESS_PROGRESS_BLOCK}>
            <div className={CTV_TIER_PROGRESS_PROGRESS_HEAD}>
              <span className={CTV_TIER_PROGRESS_PROGRESS_LABEL}>Tiến độ lên cấp</span>
              <span className={CTV_TIER_PROGRESS_PROGRESS_PCT} aria-hidden={false}>
                {progress.progressPercent}%
              </span>
            </div>
            <div
              className={CTV_HUB_PROGRESS_TRACK}
              role="progressbar"
              aria-valuenow={progress.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ lên cấp: ${progress.progressPercent}%`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 transition-[width] duration-300"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export const CtvTierProgressWidget = memo(CtvTierProgressWidgetInner);
