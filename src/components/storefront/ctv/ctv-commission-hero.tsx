"use client";

import { Wallet } from "lucide-react";
import { memo, useMemo } from "react";
import { formatCtvRankMoney } from "@/lib/ctv/ctv-membership-tier-logic";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_CARD_TITLE,
  CTV_HUB_INNER_CARD,
  CTV_HUB_RANK_CARD_SURFACE,
  CTV_HUB_WALLET_AMOUNT,
  CTV_HUB_WALLET_AMOUNT_ROW,
  CTV_HUB_WALLET_PENDING_AMOUNT,
  CTV_HUB_WALLET_PLUS,
  CTV_V2_BTN_WALLET,
} from "./ctv-ui-tokens";

const PENDING_UNLOCK_TOOLTIP = "Hoa hồng đang chờ mở khóa";

type CtvCommissionHeroProps = {
  withdrawableBalance: number;
  waitingReleaseCommission: number;
  withdrawalEnabled: boolean;
  onWithdraw: () => void;
  /** Cùng gradient nền card Cấp bậc (`getCtvRank(...).color.gradient`) */
  cardGradient: string;
};

function CtvCommissionHeroInner({
  withdrawableBalance,
  waitingReleaseCommission,
  withdrawalEnabled,
  onWithdraw,
  cardGradient,
}: CtvCommissionHeroProps): JSX.Element {
  const availableCommissionDisplay = useMemo(
    () => formatCtvRankMoney(withdrawableBalance),
    [withdrawableBalance],
  );
  const pendingCommissionDisplay = useMemo(
    () => formatCtvRankMoney(waitingReleaseCommission),
    [waitingReleaseCommission],
  );

  const ariaAmountLabel = `${availableCommissionDisplay} + ( ${pendingCommissionDisplay} )`;

  return (
    <section
      className={[CTV_HUB_INNER_CARD, CTV_HUB_CARD_PAD, CTV_HUB_RANK_CARD_SURFACE, cardGradient].join(" ")}
      aria-labelledby="ctv-wallet-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="ctv-wallet-heading" className={CTV_HUB_CARD_TITLE}>
            Hoa hồng khả dụng
          </h2>
          <div className={CTV_HUB_WALLET_AMOUNT_ROW} aria-label={`Hoa hồng khả dụng ${ariaAmountLabel}`}>
            <span className={`${CTV_HUB_WALLET_AMOUNT} shrink-0 whitespace-nowrap`}>
              {availableCommissionDisplay}
            </span>
            <span
              className={`${CTV_HUB_WALLET_PENDING_AMOUNT} inline-flex shrink-0 items-center gap-1 whitespace-nowrap`}
              title={PENDING_UNLOCK_TOOLTIP}
              aria-label={`${PENDING_UNLOCK_TOOLTIP}: ${pendingCommissionDisplay}`}
            >
              <span className={CTV_HUB_WALLET_PLUS} aria-hidden>
                +
              </span>
              <span className="inline-flex items-center gap-1 px-1" aria-hidden>
                <span>(</span>
                <span>{pendingCommissionDisplay}</span>
                <span>)</span>
              </span>
            </span>
          </div>
        </div>
        {withdrawalEnabled ? (
          <button
            type="button"
            onClick={onWithdraw}
            className={`${CTV_V2_BTN_WALLET} w-full shrink-0 sm:w-auto`}
            aria-label="Rút tiền hoa hồng khả dụng"
            title="Rút tiền ngay"
          >
            <Wallet className="h-4 w-4" aria-hidden />
            Rút tiền
          </button>
        ) : null}
      </div>
    </section>
  );
}

export const CtvCommissionHero = memo(CtvCommissionHeroInner);
