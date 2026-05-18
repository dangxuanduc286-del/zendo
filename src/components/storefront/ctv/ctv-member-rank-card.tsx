"use client";

import { memo, useMemo } from "react";
import { getCtvRank, formatCtvRankMoney } from "@/lib/ctv/ctv-rank";
import { CTV_V2_CARD_COMPACT, CTV_V2_MOTION, CTV_V2_SECTION_TITLE } from "./ctv-ui-tokens";

type CtvMemberRankCardProps = {
  totalRevenue: number;
  loading?: boolean;
};

function CtvMemberRankCardInner({ totalRevenue, loading = false }: CtvMemberRankCardProps): JSX.Element {
  const rank = useMemo(() => getCtvRank(totalRevenue), [totalRevenue]);
  const Icon = rank.icon;

  return (
    <article
      className={[
        CTV_V2_CARD_COMPACT,
        "group relative overflow-hidden",
        "rounded-2xl",
        "bg-gradient-to-br",
        rank.color.gradient,
        "ring-1 ring-black/[0.04]",
        "transition-[transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        rank.color.glow,
        CTV_V2_MOTION,
      ].join(" ")}
      aria-labelledby="ctv-member-rank-heading"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/40 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-2">
        <h3 id="ctv-member-rank-heading" className={CTV_V2_SECTION_TITLE}>
          Cấp bậc thành viên CTV
        </h3>
        <span
          className={[
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1",
            rank.color.badge,
            rank.level !== "none" ? "shadow-sm" : "",
          ].join(" ")}
        >
          {rank.badge}
        </span>
      </div>

      <div className="relative mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div
          className={[
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-white/60 sm:h-16 sm:w-16",
            rank.color.iconBg,
          ].join(" ")}
          aria-hidden
        >
          <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${rank.color.iconText}`} strokeWidth={1.6} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight tracking-tight text-[#0f172a]">{rank.name}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Hạng {rank.level === "none" ? "chưa kích hoạt" : rank.badge}
            {rank.nextThreshold != null && !rank.isMaxRank ? (
              <>
                {" "}
                · Mốc tiếp: <span className="font-semibold text-slate-700">{formatCtvRankMoney(rank.nextThreshold)}</span>
              </>
            ) : null}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-36 animate-pulse rounded-lg bg-slate-200/80" aria-hidden />
          ) : (
            <p className="mt-1.5 text-xl font-black tabular-nums tracking-tight text-[#0f172a]">
              {formatCtvRankMoney(totalRevenue)}
            </p>
          )}
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">Tổng doanh thu đơn thành công (đã thanh toán)</p>
          {!loading ? (
            <p className="mt-1 text-[13px] font-medium text-slate-600">{rank.progressHint}</p>
          ) : (
            <div className="mt-2 h-4 w-full max-w-sm animate-pulse rounded bg-slate-200/70" aria-hidden />
          )}
        </div>

        {!rank.isMaxRank && rank.level !== "none" ? (
          <div
            className={[
              "hidden shrink-0 rounded-xl px-3 py-2 text-center sm:block",
              "bg-white/70 ring-1 ring-white/80 backdrop-blur-sm",
              "shadow-[0_4px_16px_rgba(37,99,235,0.12)]",
            ].join(" ")}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tiến độ</p>
            <p className="text-lg font-bold tabular-nums text-blue-700">{rank.progress}%</p>
          </div>
        ) : null}
      </div>

      <div className="relative mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
          <span className="font-medium text-slate-500 truncate">{rank.progressHint}</span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-700 sm:hidden">{rank.progress}%</span>
          <span className="hidden shrink-0 font-semibold tabular-nums text-slate-700 sm:inline">{rank.progress}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200/80"
          role="progressbar"
          aria-valuenow={rank.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={rank.progressHint}
        >
          <div
            className={[
              "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
              rank.color.progress,
              "group-hover:shadow-[0_0_12px_rgba(59,130,246,0.35)]",
            ].join(" ")}
            style={{ width: loading ? "30%" : `${rank.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export const CtvMemberRankCard = memo(CtvMemberRankCardInner);
