"use client";

import { Wallet } from "lucide-react";
import { memo, useMemo } from "react";
import { formatCtvRankMoney } from "@/lib/ctv/ctv-membership-tier-logic";
import { CtvFormattedValue } from "./ctv-formatted-value";
import {
  CTV_HUB_CARD_TITLE,
  CTV_HUB_WALLET_AMOUNT_ROW,
  CTV_HUB_WALLET_PENDING_AMOUNT,
  CTV_HUB_WALLET_PLUS,
  CTV_HUB_WALLET_SHELL,
  CTV_V2_BTN_WALLET,
} from "./ctv-ui-tokens";

const PENDING_UNLOCK_TOOLTIP = "Hoa hồng đang chờ mở khóa";

type CtvCommissionHeroProps = {
  withdrawableBalance: number;
  waitingReleaseCommission: number;
  withdrawalEnabled: boolean;
  onWithdraw: () => void;
};

function CtvCommissionHeroInner({
  withdrawableBalance,
  waitingReleaseCommission,
  withdrawalEnabled,
  onWithdraw,
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
      className={CTV_HUB_WALLET_SHELL}
      aria-labelledby="ctv-wallet-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 id="ctv-wallet-heading" className={CTV_HUB_CARD_TITLE}>
            Hoa hồng khả dụng
          </h2>
          <div className={CTV_HUB_WALLET_AMOUNT_ROW} aria-label={`Hoa hồng khả dụng ${ariaAmountLabel}`}>
            <CtvFormattedValue
              value={availableCommissionDisplay}
              variant="money-lg"
              className="min-w-0 shrink"
            />
            <span
              className={`${CTV_HUB_WALLET_PENDING_AMOUNT} inline-flex min-w-0 items-center gap-1`}
              title={PENDING_UNLOCK_TOOLTIP}
              aria-label={`${PENDING_UNLOCK_TOOLTIP}: ${pendingCommissionDisplay}`}
            >
              <span className={CTV_HUB_WALLET_PLUS} aria-hidden>
                +
              </span>
              <span className="inline-flex items-center gap-1 px-1" aria-hidden>
                <span>(</span>
                <CtvFormattedValue value={pendingCommissionDisplay} variant="money-sm" />
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
