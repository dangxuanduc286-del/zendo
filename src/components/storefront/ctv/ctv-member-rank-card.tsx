"use client";

import { Gift, Lock, LockOpen } from "lucide-react";
import { memo, useMemo } from "react";
import {
  CTV_RANK_REVENUE_CAPTION,
  formatCtvRankMoney,
  getCtvRankFromTiers,
  getCtvRankCardRewardFocus,
  formatCtvRevenueRewardAmount,
  type CtvRankResult,
} from "@/lib/ctv/ctv-membership-tier-logic";
import type { CtvMembershipTierRecord } from "@/lib/ctv/ctv-membership-tier-types";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_CARD_TITLE,
  CTV_HUB_INNER_CARD,
  CTV_HUB_PROGRESS_PCT,
  CTV_HUB_PROGRESS_TRACK,
  CTV_HUB_RANK_BADGE,
  CTV_HUB_RANK_BODY,
  CTV_HUB_RANK_CAPTION,
  CTV_HUB_RANK_CARD_SURFACE,
  CTV_HUB_RANK_CONTENT,
  CTV_HUB_RANK_FOOTER,
  CTV_HUB_RANK_FOOTER_HINT,
  CTV_HUB_RANK_FOOTER_ROW,
  CTV_HUB_RANK_ICON_WRAP,
  CTV_HUB_RANK_META,
  CTV_HUB_RANK_NAME,
  CTV_HUB_RANK_REVENUE,
  CTV_HUB_RANK_REWARD_AMOUNT,
  CTV_HUB_RANK_REWARD_AMOUNT_ACHIEVED,
  CTV_HUB_RANK_REWARD_AMOUNT_PENDING,
  CTV_HUB_RANK_REWARD_BODY,
  CTV_HUB_RANK_REWARD_COPY,
  CTV_HUB_RANK_REWARD_DIVIDER,
  CTV_HUB_RANK_REWARD_GIFT_GLYPH,
  CTV_HUB_RANK_REWARD_GIFT_ICON,
  CTV_HUB_RANK_REWARD_LABEL,
  CTV_HUB_RANK_REWARD_LINE,
  CTV_HUB_RANK_REWARD_MAIN,
  CTV_HUB_RANK_REWARD_SECTION,
  CTV_HUB_RANK_REWARD_STATUS,
  CTV_HUB_RANK_REWARD_SUFFIX,
} from "./ctv-ui-tokens";

type CtvMemberRankCardProps = {
  totalRevenue: number;
  tiers: readonly CtvMembershipTierRecord[];
  grantedTierIds?: readonly string[];
  loading?: boolean;
  tiersLoading?: boolean;
};

function buildTierMetaLine(rank: CtvRankResult): string {
  if (rank.isMaxRank) {
    return `Hạng ${rank.badge} • Đã đạt cấp cao nhất`;
  }
  if (rank.nextThreshold == null) {
    return rank.level === "none" ? "Hạng chưa kích hoạt" : `Hạng ${rank.badge}`;
  }
  const tierLabel = rank.level === "none" ? "chưa kích hoạt" : rank.badge;
  return `Hạng ${tierLabel} • Mốc tiếp: ${formatCtvRankMoney(rank.nextThreshold)}`;
}

function CtvMemberRankCardInner({
  totalRevenue,
  tiers,
  grantedTierIds = [],
  loading = false,
  tiersLoading = false,
}: CtvMemberRankCardProps): JSX.Element {
  const grantedSet = useMemo(() => new Set(grantedTierIds), [grantedTierIds]);
  const tiersReady = !tiersLoading && tiers.length > 0;

  const rank = useMemo(() => {
    if (!tiersReady) return getCtvRankFromTiers(0, []);
    return getCtvRankFromTiers(totalRevenue, tiers);
  }, [tiersReady, totalRevenue, tiers]);

  const rewardFocus = useMemo(() => {
    if (tiersLoading || tiers.length === 0) return null;
    return getCtvRankCardRewardFocus(totalRevenue, tiers, grantedSet);
  }, [totalRevenue, tiers, grantedSet, tiersLoading]);

  const Icon = rank.icon;
  const tierMetaLine = useMemo(() => buildTierMetaLine(rank), [rank]);
  const currentRevenueFormatted = formatCtvRankMoney(totalRevenue);
  const busy = loading || tiersLoading || tiers.length === 0 || rewardFocus == null;

  const progressFill = rank.isMaxRank
    ? "from-emerald-500 via-green-500 to-emerald-600"
    : rank.color.progress;
  const progressWidth = busy ? 30 : rank.progress;

  return (
    <article
      className={[
        CTV_HUB_INNER_CARD,
        CTV_HUB_CARD_PAD,
        CTV_HUB_RANK_CARD_SURFACE,
        rank.color.gradient,
      ].join(" ")}
      aria-labelledby="ctv-member-rank-heading"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/25 blur-2xl"
        aria-hidden
      />

      <header className="relative flex min-w-0 items-center justify-between gap-3">
        <h2 id="ctv-member-rank-heading" className={CTV_HUB_CARD_TITLE}>
          Cấp bậc thành viên CTV
        </h2>
        <span className={[CTV_HUB_RANK_BADGE, rank.color.badge].join(" ")}>{rank.badge}</span>
      </header>

      <div className={CTV_HUB_RANK_BODY}>
        <div className={[CTV_HUB_RANK_ICON_WRAP, rank.color.iconBg].join(" ")} aria-hidden>
          <Icon className={`h-8 w-8 sm:h-9 sm:w-9 ${rank.color.iconText}`} strokeWidth={1.6} />
        </div>

        <div className={CTV_HUB_RANK_CONTENT}>
          <p className={`${CTV_HUB_RANK_NAME} truncate`} title={rank.name}>
            {rank.name}
          </p>
          <p className={CTV_HUB_RANK_META} title={tierMetaLine}>
            {tierMetaLine}
          </p>
          {busy ? (
            <div className="h-7 w-36 max-w-full animate-pulse rounded-md bg-slate-200/80" aria-hidden />
          ) : (
            <p className={CTV_HUB_RANK_REVENUE} title={currentRevenueFormatted}>
              {currentRevenueFormatted}
            </p>
          )}
          <p className={CTV_HUB_RANK_CAPTION} title={CTV_RANK_REVENUE_CAPTION}>
            {CTV_RANK_REVENUE_CAPTION}
          </p>
        </div>
      </div>

      <footer className={CTV_HUB_RANK_FOOTER}>
        <div className={CTV_HUB_RANK_FOOTER_ROW}>
          {busy ? (
            <div className="h-5 min-w-0 flex-1 animate-pulse rounded bg-slate-200/70" aria-hidden />
          ) : (
            <p className={CTV_HUB_RANK_FOOTER_HINT} title={rank.progressHint}>
              {rank.progressHint}
            </p>
          )}
          <span className={CTV_HUB_PROGRESS_PCT} aria-hidden={busy}>
            {busy ? "—" : `${rank.progress}%`}
          </span>
        </div>
        <div
          className={CTV_HUB_PROGRESS_TRACK}
          role="progressbar"
          aria-valuenow={rank.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={rank.progressHint}
        >
          <div
            className={["h-full rounded-full bg-gradient-to-r transition-[width] duration-300", progressFill].join(
              " ",
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className={CTV_HUB_RANK_REWARD_SECTION}>
          <div className={CTV_HUB_RANK_REWARD_DIVIDER} role="separator" aria-hidden />

          <div className={CTV_HUB_RANK_REWARD_BODY}>
            <div className={CTV_HUB_RANK_REWARD_MAIN}>
              <span className={CTV_HUB_RANK_REWARD_GIFT_ICON} aria-hidden>
                <Gift className={CTV_HUB_RANK_REWARD_GIFT_GLYPH} strokeWidth={2.25} />
              </span>

              {busy ? (
                <div className="flex min-w-[9rem] flex-col items-center gap-1.5" aria-hidden>
                  <div className="h-6 w-full max-w-[12rem] animate-pulse rounded-md bg-slate-200/70" />
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200/60" />
                </div>
              ) : rewardFocus ? (
                <div className={CTV_HUB_RANK_REWARD_COPY}>
                  <p className={CTV_HUB_RANK_REWARD_LINE}>
                    <span className={CTV_HUB_RANK_REWARD_LABEL}>Thưởng:</span>
                    <span
                      className={[
                        CTV_HUB_RANK_REWARD_AMOUNT,
                        rewardFocus.achieved
                          ? CTV_HUB_RANK_REWARD_AMOUNT_ACHIEVED
                          : CTV_HUB_RANK_REWARD_AMOUNT_PENDING,
                        !rewardFocus.achieved ? rewardFocus.amountTextClass : "",
                      ].join(" ")}
                    >
                      {formatCtvRevenueRewardAmount(rewardFocus.tier)}
                    </span>
                  </p>
                  <p className={CTV_HUB_RANK_REWARD_SUFFIX}>khi đạt yêu cầu</p>
                </div>
              ) : null}
            </div>

            {busy ? (
              <div className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-slate-200/70" aria-hidden />
            ) : rewardFocus?.granted ? (
              <span
                className={[CTV_HUB_RANK_REWARD_STATUS, "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"].join(
                  " ",
                )}
                title="Đã nhận thưởng doanh thu hạng này"
              >
                <LockOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Đã nhận thưởng
              </span>
            ) : rewardFocus?.achieved ? (
              <span
                className={[CTV_HUB_RANK_REWARD_STATUS, "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"].join(" ")}
                title="Đã đạt mốc, thưởng sẽ được cộng khi tải trung tâm CTV"
              >
                <LockOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Chờ nhận thưởng
              </span>
            ) : (
              <span
                className={[CTV_HUB_RANK_REWARD_STATUS, "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80"].join(" ")}
                title="Chưa đạt mốc doanh thu thưởng"
              >
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Chưa đạt
              </span>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}

export const CtvMemberRankCard = memo(CtvMemberRankCardInner);
