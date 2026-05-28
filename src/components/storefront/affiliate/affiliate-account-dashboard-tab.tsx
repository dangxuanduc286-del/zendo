"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  Gift,
  Link2,
  Loader2,
  MousePointerClick,
  Package,
  Percent,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CustomerAccountSettings } from "../../../lib/settings";
import {
  useAffiliateAccountDashboardModel,
  type AffiliateAccountDashboardSource,
  type AffiliateSubTab,
} from "../../../lib/affiliate-account-dashboard-model";
import {
  CTV_WORKSPACE_CLICK_HINT,
  CTV_WORKSPACE_CLICK_LABEL,
} from "../../../lib/ctv/ctv-click-display";
import {
  CTV_WORKSPACE_ORDER_HINT,
  CTV_WORKSPACE_ORDER_LABEL,
} from "../../../lib/ctv/ctv-order-display";
import {
  CTV_CONVERSION_FORMULA_HINT,
  CTV_CONVERSION_MONTH_LABEL,
} from "../../../lib/ctv/ctv-conversion-month-kpi";
import { AffiliateCtvAccountApplyGate } from "../affiliate-ctv-account-apply-gate";
import { CtvFormattedValue } from "../ctv/ctv-formatted-value";
import {
  CTV_MOBILE_KPI_GRID,
  CTV_MOBILE_KPI_LABEL,
  CTV_MOBILE_KPI_HINT,
  CTV_MOBILE_STATUS_BADGE,
} from "../ctv/ctv-ui-tokens";
import {
  AFFILIATE_METRIC_TILE,
  AFFILIATE_METRIC_TILE_MUTED,
  AFFILIATE_PROMO_BLOCK,
  AFFILIATE_SECTION_CARD,
  AFFILIATE_TAB_PANEL_CLASS,
} from "./affiliate-account-ui-tokens";
import { AffiliateCtvSegmentedTabs } from "./affiliate-ctv-segmented-tabs";
import { AffiliateCtvMetricCard } from "./affiliate-ctv-metric-card";
import { AffiliateCtvSection } from "./affiliate-ctv-section";
import { CTV_BLOCK, CTV_CONTENT_SURFACE, CTV_CTA_PRIMARY, CTV_CTA_SECONDARY } from "./affiliate-ctv-account-ui-tokens";
import { useCtvAffiliateDashboardModel } from "../ctv/ctv-affiliate-dashboard-context";
import { CtvMetricCard } from "../ctv/data/ctv-metric-card";
import type { MetricTrendProps } from "../ctv/data/ctv-metric-trend";
import { CtvDataEmpty, CtvDataError } from "../ctv/data/ctv-data-states";
import { CtvMetricGridSkeleton, CtvPanelSkeleton } from "../ctv/data/ctv-skeleton";
import { CtvMetricsDetailTable } from "../ctv/data/ctv-metrics-detail-table";
import { CTV_V2_PANEL_INSET } from "../ctv/ctv-ui-tokens";
import { CtvRevenueInsightsPanel } from "../ctv/ctv-revenue-insights-panel";
import { AffiliateToolsSection } from "./affiliate-tools-section";

const AffiliateLinkBuilder = dynamic(() => import("../affiliate-link-builder"), {
  loading: () => <PanelSkeleton />,
});
const AffiliateEarningsPanel = dynamic(() => import("../affiliate-earnings-panel"), {
  loading: () => <PanelSkeleton />,
});
const AffiliateOrdersPanel = dynamic(() => import("../affiliate-orders-panel"), {
  loading: () => <PanelSkeleton />,
});
const AffiliateWithdrawalPanel = dynamic(() => import("../affiliate-withdrawal-panel"), {
  loading: () => <PanelSkeleton />,
});
const AffiliatePayoutAccountPanel = dynamic(() => import("../affiliate-payout-account-panel"), {
  loading: () => <PanelSkeleton />,
});
const AffiliateGuidePanel = dynamic(() => import("../affiliate-guide-panel"), {
  loading: () => <PanelSkeleton />,
});
const CtvRevenueRewardsPanel = dynamic(() => import("../ctv/ctv-revenue-rewards-panel").then((m) => m.CtvRevenueRewardsPanel), {
  loading: () => <PanelSkeleton />,
});
const CtvAccountHistoryPanel = dynamic(() => import("../ctv/ctv-account-history-panel").then((m) => m.CtvAccountHistoryPanel), {
  loading: () => <PanelSkeleton />,
});
const AffiliateShortLinksPanel = dynamic(() => import("../affiliate-short-links-panel"), {
  loading: () => <PanelSkeleton />,
});
const AffiliateRevenueInsightsCard = dynamic(() => import("../affiliate-revenue-insights-card"), {
  loading: () => <div className="h-16 animate-pulse rounded-xl bg-slate-100" aria-hidden />,
});
const AffiliateOnboardingChecklist = dynamic(() => import("../affiliate-onboarding-checklist"));
const AffiliateQuickShareButtons = dynamic(() => import("../affiliate-quick-share-buttons"));

function PanelSkeleton(): JSX.Element {
  return <CtvPanelSkeleton />;
}

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`;

type PayoutAccount = null | {
  id: string;
  bankName: string;
  bankAccountNumberMasked: string;
  bankAccountHolder: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  verifiedAt?: string | null;
  changeRequests?: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestedAt: string;
    reviewedAt: string | null;
    rejectionReason: string;
    requestedBankName: string;
    requestedBankAccountNumberMasked: string;
    requestedBankAccountHolder: string;
  }>;
};

function AffiliateMetricCard({
  label,
  labelTitle,
  value,
  hint,
  Icon,
  variant = "primary",
  ctv = false,
  ctvPanels = false,
  trend,
}: {
  label: string;
  labelTitle?: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  variant?: "primary" | "muted" | "emerald";
  ctv?: boolean;
  ctvPanels?: boolean;
  trend?: MetricTrendProps;
}): JSX.Element {
  if (ctvPanels) {
    return (
      <CtvMetricCard
        label={label}
        labelTitle={labelTitle}
        value={value}
        hint={hint}
        Icon={Icon}
        accent={variant === "emerald"}
        trend={trend}
      />
    );
  }
  if (ctv) {
    return (
      <AffiliateCtvMetricCard
        label={label}
        labelTitle={labelTitle}
        value={value}
        hint={hint}
        Icon={Icon}
        accent={variant === "emerald"}
      />
    );
  }
  const shell =
    variant === "primary"
      ? AFFILIATE_METRIC_TILE
      : variant === "emerald"
        ? "rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-[0_4px_18px_rgba(16,185,129,0.08)] max-lg:rounded-lg max-lg:border-0 max-lg:bg-emerald-50 max-lg:p-2.5 max-lg:shadow-none"
        : AFFILIATE_METRIC_TILE_MUTED;
  const iconWrap =
    variant === "primary"
      ? "border-orange-100 bg-white/80 text-orange-500"
      : variant === "emerald"
        ? "border-emerald-100 bg-white/80 text-emerald-600"
        : "border-slate-200 bg-white text-slate-500";

  return (
    <article className={`${shell} flex min-h-[5.5rem] flex-col justify-between max-lg:min-h-[5.5rem] max-lg:rounded-2xl max-lg:p-4 max-lg:shadow-[0_2px_10px_rgba(15,23,42,0.05)]`}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className={`${CTV_MOBILE_KPI_LABEL} max-lg:normal-case max-lg:break-words lg:whitespace-nowrap lg:break-normal`}>
            {label}
          </p>
          <CtvFormattedValue value={value} className="mt-1.5" />
          {hint ? <p className={CTV_MOBILE_KPI_HINT}>{hint}</p> : null}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border max-lg:h-9 max-lg:w-9 sm:h-10 sm:w-10 lg:h-10 lg:w-10 ${iconWrap}`}
          aria-hidden
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
      </div>
    </article>
  );
}

function AffiliateSectionShell({
  title,
  description,
  children,
  className = "",
  ctv = false,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  ctv?: boolean;
}): JSX.Element {
  if (ctv) {
    return (
      <AffiliateCtvSection title={title} description={description} className={className}>
        {children}
      </AffiliateCtvSection>
    );
  }
  return (
    <section className={`${AFFILIATE_SECTION_CARD} ${className}`}>
      {title ? <h4 className="text-sm font-semibold text-[#0F172A] sm:text-base">{title}</h4> : null}
      {description ? <p className="mt-1 text-xs text-[#64748B] sm:text-sm">{description}</p> : null}
      <div className={title || description ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

export type AffiliateAccountDashboardTabProps = {
  accountSettings: CustomerAccountSettings;
  data: AffiliateAccountDashboardSource;
  supportHref: string;
  shoppingHomeHref: string;
  activeSubTab: AffiliateSubTab;
  onSelectSubTab: (sub: AffiliateSubTab) => void;
  highlightOrderCode?: string;
  panelClassName?: string;
  /** Bộ công cụ tăng trưởng (link ngắn, checklist, insights) — bật cho CTV-only và buyer có affiliate. */
  showGrowthToolkit?: boolean;
  /** Shell tối giản cho tài khoản CTV-only desktop. */
  uiShell?: "default" | "ctv" | "ctv-panels";
  /** Tab trang Tổng quan: không render panel sub-tab «overview» trùng hero. */
  embedInPageOverview?: boolean;
};

export function AffiliateAccountDashboardTab({
  accountSettings,
  data,
  supportHref,
  shoppingHomeHref,
  activeSubTab,
  onSelectSubTab,
  highlightOrderCode = "",
  panelClassName = AFFILIATE_TAB_PANEL_CLASS,
  showGrowthToolkit = true,
  uiShell = "default",
  embedInPageOverview = false,
}: AffiliateAccountDashboardTabProps): JSX.Element {
  const isCtvPanels = uiShell === "ctv-panels";
  const isCtvShell = uiShell === "ctv" || isCtvPanels;
  const shellClass = isCtvPanels
    ? "min-w-0 max-w-full overflow-x-hidden"
    : isCtvShell
      ? "w-full min-w-0 space-y-5"
      : panelClassName;
  const sharedModel = useCtvAffiliateDashboardModel();
  const localModel = useAffiliateAccountDashboardModel(accountSettings, data, {
    dashboardEnabled: activeSubTab !== "history",
    metricsEnabled: activeSubTab === "overview",
    runDashboardLifecycle: activeSubTab === "overview" || activeSubTab === "revenueRewards",
  });
  const model = isCtvPanels && sharedModel ? sharedModel : localModel;
  const {
    referralUrl,
    affDash,
    approvedCommission,
    pendingCommission,
    waitingReleaseCommission,
    paidCommission,
    cancelledCommission,
    referralRevenueUi,
    totalClicksUi,
    referredOrdersUi,
    withdrawableBalanceUi,
    conversionRate,
    isAffiliateDataEmpty,
    affiliateSubTabs,
    rewardRows,
    guideTitle,
    guideIntro,
    guideSteps,
    showWithdrawable,
  } = model;

  const referredOrders = Array.isArray(affDash.data?.referredOrders) ? affDash.data.referredOrders : [];
  const commissions = Array.isArray(affDash.data?.commissions) ? affDash.data.commissions : [];
  const withdrawals = Array.isArray(affDash.data?.withdrawals) ? affDash.data.withdrawals : [];
  const productQuickLinks = Array.isArray(affDash.data?.productQuickLinks) ? affDash.data.productQuickLinks : [];

  const [affiliateCopied, setAffiliateCopied] = useState(false);
  const [affiliateCopyError, setAffiliateCopyError] = useState("");
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount>(null);

  useEffect(() => {
    if (activeSubTab !== "withdrawal") return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash !== "affiliate-payout-account") return;
    requestAnimationFrame(() => {
      document.getElementById("affiliate-payout-account")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [activeSubTab]);

  const copyReferralLink = () => {
    setAffiliateCopyError("");
    navigator.clipboard
      ?.writeText(referralUrl)
      .then(() => {
        setAffiliateCopied(true);
        window.setTimeout(() => setAffiliateCopied(false), 1600);
      })
      .catch(() => {
        setAffiliateCopyError("Không thể sao chép, vui lòng copy thủ công.");
      });
  };

  const activeSubLabel = affiliateSubTabs.find((t) => t.key === activeSubTab)?.label ?? "";

  const metricsDetailRows = useMemo(
    () => [
      { id: "ref", label: "Mã ref", value: data.affiliate.refCode || "—" },
      { id: "waiting", label: "Đang chờ mở khóa", value: money(waitingReleaseCommission) },
      { id: "available", label: "Hoa hồng khả dụng", value: money(approvedCommission) },
      { id: "pending", label: "Hoa hồng chờ duyệt", value: money(pendingCommission) },
      { id: "paid", label: "Đã thanh toán", value: money(paidCommission) },
      { id: "cancelled", label: "Đã hủy", value: money(cancelledCommission) },
      { id: "points", label: "Điểm thưởng", value: data.stats.rewardPoints.toLocaleString("vi-VN") },
      {
        id: "conversion",
        label: CTV_CONVERSION_MONTH_LABEL,
        value:
          conversionRate === null || conversionRate === undefined ? "—" : `${conversionRate}%`,
      },
      { id: "revenue", label: "Doanh thu ghi nhận", value: money(referralRevenueUi) },
      { id: "clicks", label: CTV_WORKSPACE_CLICK_LABEL, value: totalClicksUi.toLocaleString("vi-VN") },
      { id: "orders", label: CTV_WORKSPACE_ORDER_LABEL, value: referredOrdersUi.toLocaleString("vi-VN") },
      ...(showWithdrawable
        ? [{ id: "withdrawable", label: "Khả dụng rút", value: money(withdrawableBalanceUi) }]
        : []),
    ],
    [
      approvedCommission,
      cancelledCommission,
      conversionRate,
      data.affiliate.refCode,
      data.stats.rewardPoints,
      paidCommission,
      pendingCommission,
      waitingReleaseCommission,
      referralRevenueUi,
      referredOrdersUi,
      showWithdrawable,
      totalClicksUi,
      withdrawableBalanceUi,
    ],
  );

  return (
    <section id="affiliate" className={shellClass}>
      {data.affiliate.isActive ? (
        <div className={isCtvPanels ? "space-y-4 max-lg:space-y-4" : isCtvShell ? "space-y-5 lg:space-y-6" : "space-y-4"}>
          {isCtvShell && !isCtvPanels ? (
            <AffiliateCtvSegmentedTabs tabs={affiliateSubTabs} activeKey={activeSubTab} onSelect={onSelectSubTab} />
          ) : !isCtvShell ? (
            <AffiliateCtvSegmentedTabs tabs={affiliateSubTabs} activeKey={activeSubTab} onSelect={onSelectSubTab} />
          ) : null}

          <div
            className={
              isCtvPanels
                ? "min-w-0 max-w-full space-y-4 overflow-x-hidden pt-2 max-md:space-y-4"
                : isCtvShell
                  ? `${CTV_CONTENT_SURFACE} space-y-6 max-lg:rounded-none max-lg:px-0 max-lg:py-0 max-lg:ring-0 max-lg:shadow-none`
                  : undefined
            }
          >
          {activeSubTab === "overview" && !embedInPageOverview ? (
            <div className={isCtvShell ? "space-y-6" : "space-y-4"}>
              <div className="overflow-hidden rounded-[20px] border border-orange-100/90 bg-gradient-to-br from-orange-50 via-amber-50 to-white px-4 py-4 shadow-[0_4px_20px_rgba(251,146,60,0.08)] max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-orange-100/80 max-lg:px-4 max-lg:py-4 max-lg:shadow-none lg:hidden sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700/90">
                      Cộng tác viên
                    </p>
                    <h3 className="mt-1 text-[22px] font-bold leading-[1.2] tracking-tight text-slate-900">
                      {accountSettings.affiliateTitle || "Trung tâm CTV / Affiliate"}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-slate-600 line-clamp-2">
                      {accountSettings.affiliateSubtitle ||
                        "Theo dõi hiệu suất giới thiệu, hoa hồng và điểm thưởng của bạn."}
                    </p>
                  </div>
                  <span className={CTV_MOBILE_STATUS_BADGE}>
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Đang hoạt động
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Mã giới thiệu:{" "}
                  <span className="font-semibold text-slate-900">{data.affiliate.refCode || "—"}</span>
                </p>
                {affDash.error ? <p className="mt-2 text-xs text-rose-600">{affDash.error}</p> : null}
                {affDash.loading ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Đang cập nhật số liệu CTV…
                  </p>
                ) : null}
              </div>

              {accountSettings.affiliateBanner.enabled ? (
                <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:shadow-none">
                  {accountSettings.affiliateBanner.imageUrl ? (
                    <Image
                      src={accountSettings.affiliateBanner.imageUrl}
                      alt={accountSettings.affiliateBanner.title || "Banner CTV"}
                      width={1200}
                      height={360}
                      className="h-32 w-full object-cover sm:h-36"
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {accountSettings.affiliateBanner.title || "Ưu đãi dành cho CTV"}
                    </p>
                    {accountSettings.affiliateBanner.subtitle ? (
                      <p className="mt-1 text-xs text-[#64748B]">{accountSettings.affiliateBanner.subtitle}</p>
                    ) : null}
                    {accountSettings.affiliateBanner.buttonUrl ? (
                      <Link
                        href={accountSettings.affiliateBanner.buttonUrl}
                        className="mt-3 inline-flex rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                      >
                        {accountSettings.affiliateBanner.buttonText || "Xem chi tiết"}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ) : null}

              {isCtvPanels && affDash.error ? (
                <CtvDataError
                  title="Không tải được số liệu"
                  description={affDash.error}
                  action={
                    <button type="button" onClick={() => affDash.refetch()} className={CTV_CTA_SECONDARY}>
                      Thử lại
                    </button>
                  }
                />
              ) : null}

              {isCtvPanels && affDash.loading && !affDash.data ? (
                <CtvMetricGridSkeleton count={4} />
              ) : (
              <div
                className={isCtvPanels || isCtvShell ? CTV_MOBILE_KPI_GRID : "grid min-w-0 auto-rows-fr items-stretch grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-3"}
              >
                <AffiliateMetricCard
                  label={CTV_WORKSPACE_CLICK_LABEL}
                  labelTitle={CTV_WORKSPACE_CLICK_HINT}
                  value={totalClicksUi.toLocaleString("vi-VN")}
                  Icon={MousePointerClick}
                  ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  trend={{ caption: "Xu hướng sắp có", direction: "neutral" }}
                />
                <AffiliateMetricCard
                  label={CTV_WORKSPACE_ORDER_LABEL}
                  labelTitle={CTV_WORKSPACE_ORDER_HINT}
                  value={referredOrdersUi.toLocaleString("vi-VN")}
                  Icon={Package}
                  ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                />
                <AffiliateMetricCard
                  label="Hoa hồng chờ duyệt"
                  value={money(pendingCommission)}
                  hint="Đang đối soát"
                  Icon={CircleDollarSign}
                  ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                />
                {showWithdrawable ? (
                  <AffiliateMetricCard
                    label="Có thể rút"
                    value={money(withdrawableBalanceUi)}
                    hint="Số dư khả dụng"
                    Icon={Wallet}
                    variant="emerald"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                ) : (
                  <AffiliateMetricCard
                    label="Doanh thu ghi nhận"
                    value={money(referralRevenueUi)}
                    hint="Tổng doanh thu ref"
                    Icon={TrendingUp}
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                )}
              </div>
              )}

              {showGrowthToolkit ? (
                <div className="min-w-0 max-md:px-0">
                  {isCtvPanels ? <CtvRevenueInsightsPanel /> : <AffiliateRevenueInsightsCard />}
                </div>
              ) : null}

              {showGrowthToolkit && (isCtvShell || isCtvPanels) ? (
                <div className="min-w-0 space-y-3 max-md:px-0">
                  <div id="affiliate-ctv-tools" className="scroll-mt-24">
                    <AffiliateToolsSection
                      referralUrl={referralUrl}
                      onCopyLink={copyReferralLink}
                      onNavigateShare={() => onSelectSubTab("links")}
                      copyCopied={affiliateCopied}
                      copyError={affiliateCopyError}
                    />
                  </div>
                  <Link
                    href={`${accountSettings.continueShoppingUrl || "/cua-hang"}${data.affiliate.refCode ? `?ref=${encodeURIComponent(data.affiliate.refCode)}` : ""}`}
                    className={`${CTV_CTA_SECONDARY} w-full max-w-full sm:w-auto`}
                  >
                    Tạo link sản phẩm
                  </Link>
                </div>
              ) : null}

              {!(isCtvShell || isCtvPanels) ? (
              <AffiliateSectionShell
                title="Link giới thiệu"
                description="Sao chép hoặc chia sẻ link ref để bắt đầu kiếm hoa hồng."
                className={AFFILIATE_PROMO_BLOCK}
              >
                <div id="affiliate-promo-tools" className="scroll-mt-28 space-y-4">
                  <p className="break-all rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-xs text-slate-600">
                    {referralUrl || "—"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      className="inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                      aria-label="Sao chép link giới thiệu"
                    >
                      Sao chép link
                    </button>
                    {referralUrl ? (
                      <Link
                        href={referralUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                      >
                        Mở link
                      </Link>
                    ) : null}
                    <Link
                      href={`${accountSettings.continueShoppingUrl || "/cua-hang"}${data.affiliate.refCode ? `?ref=${encodeURIComponent(data.affiliate.refCode)}` : ""}`}
                      className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                    >
                      Tạo link sản phẩm
                    </Link>
                  </div>
                  {affiliateCopied ? (
                    <p className="text-xs font-medium text-emerald-700">Đã sao chép link giới thiệu</p>
                  ) : null}
                  {affiliateCopyError ? (
                    <p className="text-xs font-medium text-rose-700">{affiliateCopyError}</p>
                  ) : null}
                  {referralUrl ? (
                    <AffiliateQuickShareButtons shareUrl={referralUrl} className="mt-1.5" />
                  ) : null}
                </div>
              </AffiliateSectionShell>
              ) : null}

              {showGrowthToolkit && (isAffiliateDataEmpty || totalClicksUi < 8) ? (
                <AffiliateOnboardingChecklist />
              ) : null}

              <AffiliateSectionShell title="Chi tiết số liệu" ctv={isCtvShell}>
                {isCtvPanels ? (
                  <CtvMetricsDetailTable rows={metricsDetailRows} />
                ) : (
                <div
                  className={
                    isCtvShell
                      ? CTV_MOBILE_KPI_GRID
                      : "grid min-w-0 auto-rows-fr items-stretch grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-2 sm:gap-3"
                  }
                >
                  <AffiliateMetricCard
                    label="Mã ref"
                    value={data.affiliate.refCode || "—"}
                    Icon={Link2}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label="Hoa hồng đã duyệt"
                    value={money(approvedCommission)}
                    Icon={CircleDollarSign}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label="Đã thanh toán"
                    value={money(paidCommission)}
                    Icon={Wallet}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label="Đã hủy"
                    value={money(cancelledCommission)}
                    Icon={Percent}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label="Điểm thưởng"
                    value={data.stats.rewardPoints.toLocaleString("vi-VN")}
                    Icon={Gift}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label={CTV_CONVERSION_MONTH_LABEL}
                    labelTitle={CTV_CONVERSION_FORMULA_HINT}
                    value={
                      conversionRate === null || conversionRate === undefined
                        ? "—"
                        : `${conversionRate}%`
                    }
                    Icon={Sparkles}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                  <AffiliateMetricCard
                    label="Doanh thu ghi nhận"
                    value={money(referralRevenueUi)}
                    Icon={TrendingUp}
                    variant="muted"
                    ctv={isCtvShell}
                  ctvPanels={isCtvPanels}
                  />
                </div>
                )}
              </AffiliateSectionShell>

              {!isCtvPanels ? (
              <nav className="flex flex-wrap gap-2" aria-label="Thao tác CTV nhanh">
                <button
                  type="button"
                  onClick={() => onSelectSubTab("links")}
                  className={isCtvShell ? CTV_CTA_PRIMARY : "rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"}
                >
                  Tạo link giới thiệu
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSubTab("orders")}
                  className={isCtvShell ? CTV_CTA_SECONDARY : "rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"}
                >
                  Đơn phát sinh
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSubTab("earnings")}
                  className={isCtvShell ? CTV_CTA_SECONDARY : "rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"}
                >
                  Hoa hồng
                </button>
                {accountSettings.affiliateShowWithdrawals ? (
                  <button
                    type="button"
                    onClick={() => onSelectSubTab("withdrawal")}
                    className={isCtvShell ? CTV_CTA_SECONDARY : "rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"}
                  >
                    Rút tiền
                  </button>
                ) : null}
                <Link
                  href={supportHref}
                  className={isCtvShell ? CTV_CTA_SECONDARY : "rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"}
                >
                  Hỗ trợ CTV
                </Link>
              </nav>
              ) : null}

              <aside
                className={
                  isCtvShell
                    ? `${CTV_BLOCK} text-xs text-slate-600`
                    : "rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#475569] max-lg:rounded-lg max-lg:border-0 max-lg:bg-slate-50"
                }
              >
                <p>
                  {accountSettings.affiliateDefaultCommissionText ||
                    "Hoa hồng được đối soát theo đơn hàng đủ điều kiện."}
                </p>
                <p className="mt-1">
                  {accountSettings.affiliateSupportText ||
                    "Liên hệ đội ngũ hỗ trợ CTV nếu bạn cần trợ giúp về link giới thiệu và hoa hồng."}
                </p>
              </aside>

              {isAffiliateDataEmpty ? (
                isCtvPanels ? (
                  <CtvDataEmpty
                    title="Bạn chưa có đơn giới thiệu nào"
                    description="Tạo và chia sẻ link ref để bắt đầu ghi nhận click và hoa hồng."
                    action={
                      <button type="button" onClick={() => onSelectSubTab("links")} className={CTV_CTA_PRIMARY}>
                        Tạo link giới thiệu đầu tiên
                      </button>
                    }
                  />
                ) : (
                  <div
                    className={
                      isCtvShell
                        ? "rounded-2xl bg-slate-50/90 p-6 text-center ring-1 ring-dashed ring-slate-200"
                        : "rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center max-lg:mx-0"
                    }
                  >
                    <p className="text-sm font-semibold text-slate-900">Bạn chưa có đơn giới thiệu nào.</p>
                    <button
                      type="button"
                      onClick={() => onSelectSubTab("links")}
                      className={`mt-4 ${isCtvShell ? CTV_CTA_PRIMARY : "inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8]"}`}
                    >
                      Tạo link giới thiệu đầu tiên
                    </button>
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {activeSubTab !== "overview" ? (
            <AffiliateSectionShell title={isCtvShell ? undefined : activeSubLabel} ctv={isCtvShell} className="min-w-0">
              {activeSubTab === "orders" ? (
                <AffiliateOrdersPanel
                  variant={isCtvPanels ? "ctv" : "default"}
                  highlightOrderCode={highlightOrderCode}
                  loading={affDash.loading && !affDash.data}
                  orders={referredOrders.map((o) => ({
                    id: o.id,
                    code: o.code,
                    createdAt: o.createdAt,
                    orderStatus: o.orderStatus,
                    orderStatusVi: o.orderStatusVi,
                    totalAmount: o.totalAmount,
                    estimatedCommission: o.estimatedCommission,
                    commissionStatus: o.commissionStatus,
                    commissionStatusVi: o.commissionStatusVi,
                  }))}
                />
              ) : null}
              {activeSubTab === "earnings" ? (
                <AffiliateEarningsPanel
                  variant={isCtvPanels ? "ctv" : "default"}
                  loading={affDash.loading && !affDash.data}
                  commissions={commissions.map((c) => ({
                    id: c.id,
                    createdAt: c.createdAt,
                    amount: c.amount,
                    orderRevenue: c.orderRevenue,
                    status: c.status,
                    statusKey: c.statusKey,
                    statusDisplayVi: c.statusDisplayVi,
                    orderCode: c.orderCode,
                    approvedAt: c.approvedAt,
                    paidAt: c.paidAt,
                  }))}
                  rewards={rewardRows}
                />
              ) : null}
              {activeSubTab === "withdrawal" ? (
                <div className="space-y-4">
                  <AffiliatePayoutAccountPanel onChanged={(acc) => setPayoutAccount(acc as PayoutAccount)} />
                  <AffiliateWithdrawalPanel
                    withdrawnEnabled={Boolean(
                      affDash.data?.program.withdrawalEnabled && accountSettings.affiliateShowWithdrawals,
                    )}
                    payoutAccount={payoutAccount}
                    availableAmount={affDash.data?.summary?.withdrawableBalance ?? 0}
                    withdrawals={withdrawals.map((w) => ({
                      id: w.id,
                      createdAt: w.createdAt,
                      amount: w.amount,
                      status: w.status,
                      statusDisplayVi: w.statusDisplayVi,
                      approvedAt: w.approvedAt,
                      paidAt: w.paidAt,
                    }))}
                    minWithdrawalAmount={accountSettings.affiliateMinWithdrawalAmount ?? 100000}
                    payoutThreshold={
                      affDash.data?.program.payoutThreshold ??
                      accountSettings.affiliateMinWithdrawalAmount ??
                      100000
                    }
                    busy={affDash.loading && !affDash.data}
                    onSubmitRequest={async (payload) => {
                      const res = await fetch("/api/account/affiliate/withdrawal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify(payload),
                      });
                      const j = (await res.json()) as { ok?: boolean; message?: string };
                      if (res.ok && j.ok) {
                        affDash.refetch();
                        return { ok: true, message: j.message };
                      }
                      return { ok: false, message: j.message ?? "Không gửi được yêu cầu." };
                    }}
                  />
                </div>
              ) : null}
              {activeSubTab === "links" ? (
                <div className="min-w-0 space-y-4">
                  {showGrowthToolkit ? <AffiliateShortLinksPanel /> : null}
                  <AffiliateLinkBuilder refCode={data.affiliate.refCode} variant={isCtvPanels ? "ctv" : "default"} />
                  {productQuickLinks.length > 0 ? (
                    <section className={isCtvPanels ? CTV_V2_PANEL_INSET : "rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"}>
                      <p className="text-sm font-semibold text-slate-900">Link theo sản phẩm (gợi ý)</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Gợi ý sản phẩm để tạo link ref nhanh — không hiển thị dữ liệu khách mua.
                      </p>
                      <div className="mt-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto overscroll-contain">
                        {productQuickLinks.map((p) => (
                          <Link
                            key={p.id}
                            href={`/san-pham/${encodeURIComponent(p.slug)}`}
                            className={
                              isCtvPanels
                                ? "truncate rounded-lg bg-white/90 px-3 py-2 text-xs font-medium text-blue-700 ring-1 ring-slate-200/50 transition-colors hover:bg-blue-50/80"
                                : "truncate rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                            }
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ) : affDash.loading ? (
                    <p className="text-sm text-[#64748B]">Đang tải gợi ý sản phẩm…</p>
                  ) : null}
                </div>
              ) : null}
              {activeSubTab === "revenueRewards" ? (
                <CtvRevenueRewardsPanel affiliateProfileEnabled={Boolean(data.affiliate.hasProfile)} affiliateDashboard={affDash} />
              ) : null}
              {activeSubTab === "history" ? <CtvAccountHistoryPanel /> : null}
              {activeSubTab === "guide" ? (
                <AffiliateGuidePanel
                  title={guideTitle}
                  intro={guideIntro}
                  steps={guideSteps}
                  guideUrl={accountSettings.affiliateGuideUrl}
                  termsUrl={accountSettings.affiliateTermsUrl}
                  supportZaloUrl={accountSettings.supportZaloUrl}
                  systemGuideContent={affDash.data?.program.ctvGuideResolved}
                  affiliateCanBuy={affDash.data?.program.affiliateCanBuy ?? true}
                />
              ) : null}
            </AffiliateSectionShell>
          ) : null}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-semibold text-[#0F172A]">Chương trình CTV / Affiliate</h3>
          <p className="mt-2 text-sm text-[#64748B]">
            Tài khoản của bạn chưa được kích hoạt chức năng CTV. Bạn có thể gửi yêu cầu đăng ký để quản trị viên xét
            duyệt.
          </p>
          <AffiliateCtvAccountApplyGate shoppingHomeHref={shoppingHomeHref} />
        </div>
      )}
    </section>
  );
}
