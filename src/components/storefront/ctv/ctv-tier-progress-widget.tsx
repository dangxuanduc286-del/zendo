"use client";

import { memo } from "react";
import type { CtvTierProgressSummary } from "@/lib/ctv/ctv-affiliate-lifecycle";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_INNER_CARD,
  CTV_HUB_CARD_TITLE,
  CTV_HUB_PROGRESS_PCT,
  CTV_HUB_PROGRESS_TRACK,
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
      className={[CTV_HUB_INNER_CARD, CTV_HUB_CARD_PAD].join(" ")}
      aria-labelledby="ctv-tier-progress-heading"
    >
      <h2 id="ctv-tier-progress-heading" className={CTV_HUB_CARD_TITLE}>
        Tiến độ cấp bậc
      </h2>

      {loading ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200/80" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200/60" />
          <div className={CTV_HUB_PROGRESS_TRACK}>
            <div className="h-full w-1/3 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Doanh thu 30 ngày gần nhất</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-[#0f172a]">
              {formatMoney(progress.revenue30d)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Cấp hiện tại</dt>
              <dd className="font-semibold text-[#0f172a]">{progress.currentTierName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Hoa hồng hiện tại</dt>
              <dd className="font-semibold text-[#0f172a]">{progress.currentCommissionPercent}%</dd>
            </div>
            {!progress.isMaxRank && progress.nextTierName ? (
              <>
                <div>
                  <dt className="text-xs text-slate-500">Mục tiêu tiếp theo</dt>
                  <dd className="font-semibold text-[#0f172a]">{progress.nextTierName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Thưởng cấp tiếp</dt>
                  <dd className="font-semibold text-emerald-700">
                    {progress.nextTierRewardAmount != null
                      ? formatMoney(progress.nextTierRewardAmount)
                      : "—"}
                  </dd>
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Trạng thái</dt>
                <dd className="font-semibold text-emerald-700">Đã đạt cấp cao nhất</dd>
              </div>
            )}
          </dl>

          {!progress.isMaxRank && progress.remainingToNext > 0 ? (
            <p className="text-sm text-slate-600">
              Còn thiếu{" "}
              <strong className="font-bold text-[#0f172a]">{formatMoney(progress.remainingToNext)}</strong> để đạt{" "}
              <strong className="text-[#0f172a]">{progress.nextTierName ?? "cấp tiếp theo"}</strong>
              {progress.revenueTargetNext != null ? (
                <>
                  {" "}
                  (mốc {formatMoney(progress.revenueTargetNext)})
                </>
              ) : null}
            </p>
          ) : null}

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Tiến độ lên cấp</span>
              <span className={CTV_HUB_PROGRESS_PCT}>{progress.progressPercent}%</span>
            </div>
            <div
              className={CTV_HUB_PROGRESS_TRACK}
              role="progressbar"
              aria-valuenow={progress.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
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
