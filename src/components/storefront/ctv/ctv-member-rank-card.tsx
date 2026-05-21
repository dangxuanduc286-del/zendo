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
  CTV_HUB_CARD_HEADER,
  CTV_HUB_CARD_TITLE,
  CTV_HUB_OVERVIEW_CARD,
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
  CTV_HUB_SECTION_DIVIDER,
  CTV_HUB_RANK_REWARD_GIFT_GLYPH,
  CTV_HUB_RANK_REWARD_GIFT_ICON,
  CTV_HUB_RANK_REWARD_LABEL,
  CTV_HUB_RANK_REWARD_LOCK_GLYPH,
  CTV_HUB_RANK_REWARD_ROW,
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
        CTV_HUB_OVERVIEW_CARD,
        CTV_HUB_RANK_CARD_SURFACE,
        rank.color.gradient,
        "lg:flex lg:flex-col",
      ].join(" ")}
      aria-labelledby="ctv-member-rank-heading"
    >
      <div
        className="pointer-events-none absolute -right-3 -top-3 h-[4.5rem] w-[4.5rem] rounded-full bg-white/25 blur-2xl sm:-right-5 sm:-top-5 sm:h-20 sm:w-20"
        aria-hidden
      />

      <header className={CTV_HUB_CARD_HEADER}>
        <h2 id="ctv-member-rank-heading" className={`${CTV_HUB_CARD_TITLE} min-w-0`}>
          Cấp bậc thành viên CTV
        </h2>
        <span className={[CTV_HUB_RANK_BADGE, "shrink-0", rank.color.badge].join(" ")}>{rank.badge}</span>
      </header>

      <div className={CTV_HUB_RANK_BODY}>
        <div className={[CTV_HUB_RANK_ICON_WRAP, rank.color.iconBg].join(" ")} aria-hidden>
          <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${rank.color.iconText}`} strokeWidth={1.6} />
        </div>

        <div className={CTV_HUB_RANK_CONTENT}>
          <p className={CTV_HUB_RANK_NAME} title={rank.name}>
            {rank.name}
          </p>
          <p className={CTV_HUB_RANK_META} title={tierMetaLine}>
            {tierMetaLine}
          </p>
          {busy ? (
            <div className="h-7 w-36 max-w-full animate-pulse rounded-md bg-slate-200/80" aria-hidden />
          ) : (
            <p className={`${CTV_HUB_RANK_REVENUE} block`} title={currentRevenueFormatted}>
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
          <div className={CTV_HUB_SECTION_DIVIDER} role="separator" aria-hidden />

          <div className={CTV_HUB_RANK_REWARD_BODY}>
            {busy ? (
              <div className={CTV_HUB_RANK_REWARD_ROW} aria-hidden>
                <span className={CTV_HUB_RANK_REWARD_GIFT_ICON}>
                  <span className={`${CTV_HUB_RANK_REWARD_GIFT_GLYPH} block rounded-md bg-slate-200/80`} />
                </span>
                <span className="h-[1em] w-[10em] max-w-[70%] animate-pulse rounded bg-slate-200/70" />
                <span className="h-[1.35em] w-[4.5em] shrink-0 animate-pulse rounded-full bg-slate-200/70" />
              </div>
            ) : rewardFocus ? (
              <div className={CTV_HUB_RANK_REWARD_ROW} role="text">
                <span className={CTV_HUB_RANK_REWARD_GIFT_ICON} aria-hidden>
                  <Gift className={CTV_HUB_RANK_REWARD_GIFT_GLYPH} strokeWidth={2.25} />
                </span>
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
                <span className={CTV_HUB_RANK_REWARD_SUFFIX}>khi đạt yêu cầu</span>
                {rewardFocus.granted ? (
                  <span
                    className={[
                      CTV_HUB_RANK_REWARD_STATUS,
                      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
                    ].join(" ")}
                    title="Đã nhận thưởng doanh thu hạng này"
                  >
                    <LockOpen className={CTV_HUB_RANK_REWARD_LOCK_GLYPH} strokeWidth={2.25} aria-hidden />
                    Đã nhận thưởng
                  </span>
                ) : rewardFocus.achieved ? (
                  <span
                    className={[
                      CTV_HUB_RANK_REWARD_STATUS,
                      "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
                    ].join(" ")}
                    title="Đã đạt mốc, thưởng sẽ được cộng khi tải trung tâm CTV"
                  >
                    <LockOpen className={CTV_HUB_RANK_REWARD_LOCK_GLYPH} strokeWidth={2.25} aria-hidden />
                    Chờ nhận thưởng
                  </span>
                ) : (
                  <span
                    className={[
                      CTV_HUB_RANK_REWARD_STATUS,
                      "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80",
                    ].join(" ")}
                    title="Chưa đạt mốc doanh thu thưởng"
                  >
                    <Lock className={CTV_HUB_RANK_REWARD_LOCK_GLYPH} strokeWidth={2.25} aria-hidden />
                    Chưa đạt
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </footer>
    </article>
  );
}

export const CtvMemberRankCard = memo(CtvMemberRankCardInner);
