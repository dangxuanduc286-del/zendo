import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import {
  formatRewardPointsVi,
  getAffiliateClicks,
  getAffiliateCommissions,
  getAffiliateOrders,
  getAffiliateApplicationsForAdmin,
  type AffiliateApplicationScoreTierFilter,
  getAffiliateProfiles,
  getAffiliateReconciliation,
  getAffiliateRewardPoints,
  getAffiliateSettings,
  getAffiliateAdminPendingBadgeCounts,
  getAffiliateWithdrawals,
  type AffiliateApplicationAdminFilter,
  type AffiliateWithdrawalListSort,
  type AffiliateWithdrawalListStatusFilter,
  type AffiliateClickOrderLinkFilter,
  type AffiliateClickRangePreset,
  type AffiliateClickSortOrder,
  type AffiliateCommissionListSort,
  type AffiliateCommissionListStatusFilter,
  type AffiliateCtvOrderRangePreset,
  type AffiliateCtvOrderSort,
  type AffiliateCtvOrderStatusFilter,
  type ReconciliationEligibilityFilter,
  type ReconciliationSort,
  type RewardPointListSort,
  type RewardPointListStatusFilter,
  type RewardPointListTypeFilter,
} from "../../../../lib/admin/affiliate";
import AffiliateCommissionActions from "../../../../components/admin/affiliate-commission-actions";
import AffiliateWithdrawalsAdminPanel from "../../../../components/admin/affiliate-withdrawals-admin-panel";
import AffiliateReconciliationPayForm from "../../../../components/admin/affiliate-reconciliation-pay-form";
import AffiliateAdminGuide from "../../../../components/admin/affiliate-admin-guide";
import AffiliateCtvSettingsForm from "../../../../components/admin/affiliate-ctv-settings-form";
import { CtvMembershipTiersAdmin } from "../../../../components/admin/ctv-membership-tiers-admin";
import { CtvRewardTransactionsAdminPanel } from "../../../../components/admin/ctv-admin-history-panels";
import AdminPayoutChangeRequestsTable from "../affiliates/payout-accounts/change-requests-table";
import AdminPayoutAccountsTable from "../affiliates/payout-accounts/table";
import { getCtvTierHistoryList } from "../../../../lib/admin/ctv-tier-history-admin";
import { getCtvNotificationList } from "../../../../lib/admin/ctv-notifications-admin";
import { getCtvRewardTransactionList } from "../../../../lib/admin/ctv-reward-transactions-admin";
import { getCtvRevenueRewardAuditList } from "../../../../lib/admin/ctv-revenue-reward-audit";
import { fetchCtvMembershipTiersFromDb } from "../../../../lib/ctv/ctv-membership-tier-repository";
import AffiliateCopyLinkButton from "../../../../components/admin/affiliate-copy-link-button";
import AdminUnifiedHistoryPanel from "../../../../components/admin/admin-unified-history-panel";
import { Suspense } from "react";
import { adminTabActive, adminTabBase, adminTabInactive } from "../../../../lib/admin-ui";

const CTV_PAYOUT_ACCOUNTS_ADMIN_HREF =
  "/admin/affiliates/payout-accounts?mode=accounts&status=PENDING";

const CTV_TABS = [
  { id: "danh-sach", label: "Danh sách CTV" },
  { id: "yeu-cau-ctv", label: "Yêu cầu CTV" },
  { id: "hoa-hong", label: "Hoa hồng" },
  { id: "click-theo-doi", label: "Click / Theo dõi giới thiệu" },
  { id: "don-phat-sinh", label: "Đơn phát sinh" },
  { id: "doi-soat", label: "Đối soát / Thanh toán" },
  { id: "rut-tien", label: "Rút tiền CTV" },
  { id: "lich-su", label: "Lịch sử" },
  { id: "huong-dan", label: "Hướng dẫn CTV" },
  { id: "cai-dat", label: "Cài đặt" },
] as const;
const HIDDEN_CTV_TAB_IDS = ["diem-thuong"] as const;

type VisibleCtvTabId = (typeof CTV_TABS)[number]["id"];
type HiddenCtvTabId = (typeof HIDDEN_CTV_TAB_IDS)[number];
type CtvActiveTabId = VisibleCtvTabId | HiddenCtvTabId;
type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED";
type PayoutMode = "accounts" | "change-requests";
type RequestSection = "applications" | "payout-account";
type PaymentSection = "reconciliation" | "reward-transactions";

function isCtvActiveTabId(value: string | undefined): value is CtvActiveTabId {
  return (
    CTV_TABS.some((tab) => tab.id === value) ||
    HIDDEN_CTV_TAB_IDS.some((tab) => tab === value)
  );
}

export const metadata: Metadata = {
  title: "Cộng tác viên | Quản trị Zendo.vn",
  description: "Danh sách cộng tác viên nội dung và vận hành trong admin Zendo.vn.",
  robots: { index: false, follow: false },
};

type CollaboratorsPageProps = {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    status?: "ALL" | "ACTIVE" | "PAUSED" | "LOCKED";
    sort?: "newest" | "most_clicks" | "highest_revenue" | "highest_commission";
    click_q?: string;
    click_order?: string;
    click_range?: string;
    click_sort?: string;
    ord_q?: string;
    ord_status?: string;
    ord_range?: string;
    ord_sort?: string;
    refCode?: string;
    hh_q?: string;
    hh_status?: string;
    hh_range?: string;
    hh_sort?: string;
    commissionError?: string;
    rp_q?: string;
    rp_status?: string;
    rp_type?: string;
    rp_range?: string;
    rp_sort?: string;
    rec_q?: string;
    rec_eligible?: string;
    rec_sort?: string;
    payError?: string;
    ctvSettingsError?: string;
    ctvSettingsSaved?: string;
    app_status?: string;
    app_score_tier?: string;
    app_error?: string;
    rr_q?: string;
    rr_tier?: string;
    rr_from?: string;
    rr_to?: string;
    th_q?: string;
    th_tier?: string;
    th_from?: string;
    th_to?: string;
    tx_q?: string;
    tx_from?: string;
    tx_to?: string;
    nt_q?: string;
    nt_type?: string;
    nt_from?: string;
    nt_to?: string;
    wd_q?: string;
    wd_status?: string;
    wd_sort?: string;
    withdrawalError?: string;
    hist?: string;
    request?: string;
    payout_mode?: string;
    payout_status?: string;
    payout_q?: string;
    payment_section?: string;
  }>;
};

export default async function AdminCollaboratorsPage({
  searchParams,
}: CollaboratorsPageProps): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/collaborators");
  }

  const resolvedSearch = searchParams ? await searchParams : {};
  if (resolvedSearch.tab === "tk-nhan-tien-ctv") {
    const qs = new URLSearchParams();
    qs.set("tab", "yeu-cau-ctv");
    qs.set("request", "payout-account");
    qs.set("payout_mode", resolvedSearch.payout_mode === "change-requests" ? "change-requests" : "accounts");
    const status = resolvedSearch.payout_status ?? resolvedSearch.status;
    qs.set("payout_status", status === "APPROVED" || status === "REJECTED" ? status : "PENDING");
    const payoutQ = (resolvedSearch.payout_q ?? resolvedSearch.q ?? "").trim();
    if (payoutQ) qs.set("payout_q", payoutQ);
    redirect(`/admin/collaborators?${qs.toString()}`);
  }
  if (resolvedSearch.tab === "giao-dich-thuong") {
    const qs = new URLSearchParams();
    qs.set("tab", "doi-soat");
    qs.set("payment_section", "reward-transactions");
    const txQ = (resolvedSearch.tx_q ?? "").trim();
    const txFromVal = (resolvedSearch.tx_from ?? "").trim();
    const txToVal = (resolvedSearch.tx_to ?? "").trim();
    if (txQ) qs.set("tx_q", txQ);
    if (txFromVal) qs.set("tx_from", txFromVal);
    if (txToVal) qs.set("tx_to", txToVal);
    redirect(`/admin/collaborators?${qs.toString()}`);
  }
  if (resolvedSearch.tab === "thuong-doanh-thu") {
    redirect("/admin/collaborators?tab=lich-su&hist=REVENUE_REWARD");
  }
  if (resolvedSearch.tab === "lich-su-cap") {
    redirect("/admin/collaborators?tab=lich-su&hist=TIER");
  }
  if (resolvedSearch.tab === "thong-bao-ctv") {
    const histQs = new URLSearchParams();
    histQs.set("tab", "lich-su");
    histQs.set("hist", "NOTIFICATION");
    const ntQ = (resolvedSearch.nt_q ?? "").trim();
    const ntTypeVal = (resolvedSearch.nt_type ?? "").trim();
    const ntFromVal = (resolvedSearch.nt_from ?? "").trim();
    const ntToVal = (resolvedSearch.nt_to ?? "").trim();
    if (ntQ) histQs.set("nt_q", ntQ);
    if (ntTypeVal) histQs.set("nt_type", ntTypeVal);
    if (ntFromVal) histQs.set("nt_from", ntFromVal);
    if (ntToVal) histQs.set("nt_to", ntToVal);
    redirect(`/admin/collaborators?${histQs.toString()}`);
  }

  const activeTab: CtvActiveTabId = isCtvActiveTabId(resolvedSearch.tab) ? resolvedSearch.tab : "danh-sach";
  const query = (resolvedSearch.q ?? "").trim();
  const statusFilter = resolvedSearch.status ?? "ALL";
  const sortFilter = resolvedSearch.sort ?? "newest";

  const clickQuery = (resolvedSearch.click_q ?? "").trim();
  const clickOrderRaw = resolvedSearch.click_order ?? "ALL";
  const clickOrder: AffiliateClickOrderLinkFilter =
    clickOrderRaw === "NO_ORDER" || clickOrderRaw === "HAS_ORDER" ? clickOrderRaw : "ALL";
  const clickRangeRaw = resolvedSearch.click_range ?? "all";
  const clickRange: AffiliateClickRangePreset =
    clickRangeRaw === "today" ||
    clickRangeRaw === "7d" ||
    clickRangeRaw === "30d" ||
    clickRangeRaw === "month" ||
    clickRangeRaw === "year"
      ? clickRangeRaw
      : "all";
  const clickSortRaw = resolvedSearch.click_sort ?? "newest";
  const clickSort: AffiliateClickSortOrder = clickSortRaw === "oldest" ? "oldest" : "newest";

  const ordQuery = (resolvedSearch.ord_q ?? "").trim();
  const ordStatusRaw = resolvedSearch.ord_status ?? "ALL";
  const ordStatus: AffiliateCtvOrderStatusFilter =
    ordStatusRaw === "PENDING" ||
    ordStatusRaw === "PAID" ||
    ordStatusRaw === "COMPLETED" ||
    ordStatusRaw === "CANCELED" ||
    ordStatusRaw === "FAILED" ||
    ordStatusRaw === "REFUNDED"
      ? ordStatusRaw
      : "ALL";
  const ordRangeRaw = resolvedSearch.ord_range ?? "all";
  const ordRange: AffiliateCtvOrderRangePreset =
    ordRangeRaw === "today" ||
    ordRangeRaw === "7d" ||
    ordRangeRaw === "30d" ||
    ordRangeRaw === "month" ||
    ordRangeRaw === "year"
      ? ordRangeRaw
      : "all";
  const ordSortRaw = resolvedSearch.ord_sort ?? "newest";
  const ordSort: AffiliateCtvOrderSort =
    ordSortRaw === "oldest" ? "oldest" : ordSortRaw === "highest_value" ? "highest_value" : "newest";
  const refCodeFromUrl = (resolvedSearch.refCode ?? "").trim();

  const hhQuery = (resolvedSearch.hh_q ?? "").trim();
  const hhStatusRaw = resolvedSearch.hh_status ?? "ALL";
  const hhStatus: AffiliateCommissionListStatusFilter =
    hhStatusRaw === "PENDING" ||
    hhStatusRaw === "APPROVED" ||
    hhStatusRaw === "WAITING_RELEASE" ||
    hhStatusRaw === "AVAILABLE" ||
    hhStatusRaw === "PAID" ||
    hhStatusRaw === "CANCELLED"
      ? hhStatusRaw
      : "ALL";
  const hhRangeRaw = resolvedSearch.hh_range ?? "all";
  const hhRange: AffiliateClickRangePreset =
    hhRangeRaw === "today" ||
    hhRangeRaw === "7d" ||
    hhRangeRaw === "30d" ||
    hhRangeRaw === "month" ||
    hhRangeRaw === "year"
      ? hhRangeRaw
      : "all";
  const hhSortRaw = resolvedSearch.hh_sort ?? "newest";
  const hhSort: AffiliateCommissionListSort =
    hhSortRaw === "oldest" ? "oldest" : hhSortRaw === "highest_amount" ? "highest_amount" : "newest";
  const commissionError = (resolvedSearch.commissionError ?? "").trim();

  const commissionRedirectQs = new URLSearchParams();
  commissionRedirectQs.set("tab", "hoa-hong");
  if (hhQuery) commissionRedirectQs.set("hh_q", hhQuery);
  if (hhStatus !== "ALL") commissionRedirectQs.set("hh_status", hhStatus);
  if (hhRange !== "all") commissionRedirectQs.set("hh_range", hhRange);
  if (hhSort !== "newest") commissionRedirectQs.set("hh_sort", hhSort);
  const commissionRedirectTo = `/admin/collaborators?${commissionRedirectQs.toString()}`;

  const rpQuery = (resolvedSearch.rp_q ?? "").trim();
  const rpStatusRaw = resolvedSearch.rp_status ?? "ALL";
  const rpStatus: RewardPointListStatusFilter =
    rpStatusRaw === "PENDING" ||
    rpStatusRaw === "AVAILABLE" ||
    rpStatusRaw === "USED" ||
    rpStatusRaw === "CANCELLED"
      ? rpStatusRaw
      : "ALL";
  const rpTypeRaw = resolvedSearch.rp_type ?? "ALL";
  const rpType: RewardPointListTypeFilter =
    rpTypeRaw === "EARN" || rpTypeRaw === "SPEND" || rpTypeRaw === "ADJUST" ? rpTypeRaw : "ALL";
  const rpRangeRaw = resolvedSearch.rp_range ?? "all";
  const rpRange: AffiliateClickRangePreset =
    rpRangeRaw === "today" ||
    rpRangeRaw === "7d" ||
    rpRangeRaw === "30d" ||
    rpRangeRaw === "month" ||
    rpRangeRaw === "year"
      ? rpRangeRaw
      : "all";
  const rpSortRaw = resolvedSearch.rp_sort ?? "newest";
  const rpSort: RewardPointListSort =
    rpSortRaw === "oldest" ? "oldest" : rpSortRaw === "highest_points" ? "highest_points" : "newest";

  const recQuery = (resolvedSearch.rec_q ?? "").trim();
  const recEligibleRaw = resolvedSearch.rec_eligible ?? "ALL";
  const recEligible: ReconciliationEligibilityFilter =
    recEligibleRaw === "ELIGIBLE" || recEligibleRaw === "NOT_ELIGIBLE" ? recEligibleRaw : "ALL";
  const recSortRaw = resolvedSearch.rec_sort ?? "outstanding_desc";
  const recSort: ReconciliationSort =
    recSortRaw === "newest" || recSortRaw === "volume_desc" ? recSortRaw : "outstanding_desc";
  const payError = (resolvedSearch.payError ?? "").trim();

  const ctvSettingsError = (resolvedSearch.ctvSettingsError ?? "").trim();
  const ctvSettingsSaved = (resolvedSearch.ctvSettingsSaved ?? "").trim();
  const ctvSettingsRedirectTo = "/admin/collaborators?tab=cai-dat";

  const rrQuery = (resolvedSearch.rr_q ?? "").trim();
  const rrTier = (resolvedSearch.rr_tier ?? "").trim();
  const rrFrom = (resolvedSearch.rr_from ?? "").trim();
  const rrTo = (resolvedSearch.rr_to ?? "").trim();

  const thQuery = (resolvedSearch.th_q ?? "").trim();
  const thTier = (resolvedSearch.th_tier ?? "").trim();
  const thFrom = (resolvedSearch.th_from ?? "").trim();
  const thTo = (resolvedSearch.th_to ?? "").trim();
  const txQuery = (resolvedSearch.tx_q ?? "").trim();
  const txFrom = (resolvedSearch.tx_from ?? "").trim();
  const txTo = (resolvedSearch.tx_to ?? "").trim();
  const ntQuery = (resolvedSearch.nt_q ?? "").trim();
  const ntType = (resolvedSearch.nt_type ?? "").trim();
  const ntFrom = (resolvedSearch.nt_from ?? "").trim();
  const ntTo = (resolvedSearch.nt_to ?? "").trim();

  const requestSection: RequestSection =
    resolvedSearch.request === "payout-account" ? "payout-account" : "applications";
  const payoutMode: PayoutMode = resolvedSearch.payout_mode === "change-requests" ? "change-requests" : "accounts";
  const payoutStatusRaw = resolvedSearch.payout_status ?? "PENDING";
  const payoutStatus: PayoutStatus =
    payoutStatusRaw === "APPROVED" || payoutStatusRaw === "REJECTED" ? payoutStatusRaw : "PENDING";
  const payoutQuery = (resolvedSearch.payout_q ?? "").trim();
  const paymentSection: PaymentSection =
    resolvedSearch.payment_section === "reward-transactions" ? "reward-transactions" : "reconciliation";

  const appStatusRaw = resolvedSearch.app_status ?? "ALL";
  const appStatusFilter: AffiliateApplicationAdminFilter =
    appStatusRaw === "PENDING" || appStatusRaw === "APPROVED" || appStatusRaw === "REJECTED"
      ? appStatusRaw
      : "ALL";
  const appScoreTierRaw = resolvedSearch.app_score_tier ?? "ALL";
  const appScoreTierFilter: AffiliateApplicationScoreTierFilter =
    appScoreTierRaw === "HIGH" ||
    appScoreTierRaw === "MEDIUM" ||
    appScoreTierRaw === "LOW" ||
    appScoreTierRaw === "UNSCORED"
      ? appScoreTierRaw
      : "ALL";
  const appErrorCode = (resolvedSearch.app_error ?? "").trim();

  const appRedirectQs = new URLSearchParams();
  appRedirectQs.set("tab", "yeu-cau-ctv");
  if (appStatusFilter !== "ALL") appRedirectQs.set("app_status", appStatusFilter);
  if (appScoreTierFilter !== "ALL") appRedirectQs.set("app_score_tier", appScoreTierFilter);
  const affiliateAppRedirectTo = `/admin/collaborators?${appRedirectQs.toString()}`;

  const recRedirectQs = new URLSearchParams();
  recRedirectQs.set("tab", "doi-soat");
  if (recQuery) recRedirectQs.set("rec_q", recQuery);
  if (recEligible !== "ALL") recRedirectQs.set("rec_eligible", recEligible);
  if (recSort !== "outstanding_desc") recRedirectQs.set("rec_sort", recSort);
  const reconciliationRedirectTo = `/admin/collaborators?${recRedirectQs.toString()}`;

  const wdQuery = (resolvedSearch.wd_q ?? "").trim();
  const wdStatusRaw = resolvedSearch.wd_status ?? "ALL";
  const wdStatus: AffiliateWithdrawalListStatusFilter =
    wdStatusRaw === "PENDING" ||
    wdStatusRaw === "APPROVED" ||
    wdStatusRaw === "PAID" ||
    wdStatusRaw === "REJECTED"
      ? wdStatusRaw
      : "ALL";
  const wdSortRaw = resolvedSearch.wd_sort ?? "newest";
  const wdSort: AffiliateWithdrawalListSort =
    wdSortRaw === "oldest" ? "oldest" : wdSortRaw === "highest_amount" ? "highest_amount" : "newest";
  const withdrawalError = (resolvedSearch.withdrawalError ?? "").trim();

  const withdrawalRedirectQs = new URLSearchParams();
  withdrawalRedirectQs.set("tab", "rut-tien");
  if (wdQuery) withdrawalRedirectQs.set("wd_q", wdQuery);
  if (wdStatus !== "ALL") withdrawalRedirectQs.set("wd_status", wdStatus);
  if (wdSort !== "newest") withdrawalRedirectQs.set("wd_sort", wdSort);
  const withdrawalRedirectTo = `/admin/collaborators?${withdrawalRedirectQs.toString()}`;

  const [
    settings,
    profiles,
    clickBundle,
    orderBundle,
    commissionBundle,
    rewardBundle,
    reconciliationBundle,
    affiliateApplicationRows,
    pendingBadgeCounts,
    revenueRewardAuditBundle,
    membershipTiersForAdmin,
    tierHistoryBundle,
    rewardTxBundle,
    ctvNotificationsBundle,
    withdrawalBundle,
  ] = await Promise.all([
    getAffiliateSettings(),
    activeTab === "danh-sach"
      ? getAffiliateProfiles({
          query,
          status: statusFilter,
          sort: sortFilter,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof getAffiliateProfiles>>),
    activeTab === "click-theo-doi"
      ? getAffiliateClicks({
          query: clickQuery,
          orderLink: clickOrder,
          range: clickRange,
          sort: clickSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateClicks>>["rows"],
          kpis: {
            totalClicks: 0,
            validClicks: 0,
            clicksWithOrder: 0,
            conversionRate: 0,
          },
        }),
    activeTab === "don-phat-sinh"
      ? getAffiliateOrders({
          query: ordQuery,
          refCode: refCodeFromUrl || undefined,
          orderStatus: ordStatus,
          range: ordRange,
          sort: ordSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateOrders>>["rows"],
          kpis: {
            totalOrders: 0,
            paidOrCompletedOrders: 0,
            revenueFromCtv: 0,
            expectedCommissionTotal: 0,
            averageOrderValue: 0,
          },
        }),
    activeTab === "hoa-hong"
      ? getAffiliateCommissions({
          query: hhQuery,
          commissionStatus: hhStatus,
          range: hhRange,
          sort: hhSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateCommissions>>["rows"],
          kpis: {
            totalCommissionAmount: 0,
            pendingAmount: 0,
            waitingReleaseAmount: 0,
            availableAmount: 0,
            approvedAmount: 0,
            paidAmount: 0,
            cancelledAmount: 0,
            orderCountWithCommission: 0,
          },
        }),
    activeTab === "diem-thuong"
      ? getAffiliateRewardPoints({
          query: rpQuery,
          status: rpStatus,
          type: rpType,
          range: rpRange,
          sort: rpSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateRewardPoints>>["rows"],
          kpis: {
            totalPointsIssued: 0,
            availablePoints: 0,
            pendingPoints: 0,
            usedPoints: 0,
            cancelledPoints: 0,
          },
        }),
    activeTab === "doi-soat" && paymentSection === "reconciliation"
      ? getAffiliateReconciliation({
          query: recQuery,
          eligibility: recEligible,
          sort: recSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateReconciliation>>["rows"],
          kpis: {
            totalApprovedOutstanding: 0,
            totalPaid: 0,
            remainingToPay: 0,
            eligibleProfileCount: 0,
            payoutThreshold: 0,
          },
        }),
    activeTab === "yeu-cau-ctv" && requestSection === "applications"
      ? getAffiliateApplicationsForAdmin({ status: appStatusFilter, scoreTier: appScoreTierFilter })
      : Promise.resolve([] as Awaited<ReturnType<typeof getAffiliateApplicationsForAdmin>>),
    getAffiliateAdminPendingBadgeCounts(),
    (() => {
      const hist = (resolvedSearch.hist ?? "ALL").trim();
      const onHistory = activeTab === "lich-su";
      const needRevenue = onHistory && hist === "REVENUE_REWARD";
      return needRevenue
        ? getCtvRevenueRewardAuditList({
            query: rrQuery,
            tierId: rrTier || undefined,
            from: rrFrom || undefined,
            to: rrTo || undefined,
          })
        : Promise.resolve({ rows: [], total: 0 });
    })(),
    (() => {
      const hist = (resolvedSearch.hist ?? "ALL").trim();
      const onHistory = activeTab === "lich-su";
      const needRevenue = onHistory && hist === "REVENUE_REWARD";
      const needTier = onHistory && hist === "TIER";
      const needHistNt = onHistory && hist === "NOTIFICATION";
      return needRevenue || needTier || needHistNt
        ? fetchCtvMembershipTiersFromDb(false)
        : Promise.resolve([]);
    })(),
    (() => {
      const hist = (resolvedSearch.hist ?? "ALL").trim();
      const onHistory = activeTab === "lich-su";
      const needTier = onHistory && hist === "TIER";
      return needTier
        ? getCtvTierHistoryList({
            query: thQuery,
            tierId: thTier || undefined,
            from: thFrom || undefined,
            to: thTo || undefined,
          })
        : Promise.resolve({ rows: [], total: 0 });
    })(),
    activeTab === "doi-soat" && paymentSection === "reward-transactions"
      ? getCtvRewardTransactionList({
          query: txQuery,
          from: txFrom || undefined,
          to: txTo || undefined,
        })
      : Promise.resolve({ rows: [], total: 0 }),
    (() => {
      const hist = (resolvedSearch.hist ?? "ALL").trim();
      const onHistory = activeTab === "lich-su";
      const needNt = onHistory && hist === "NOTIFICATION";
      return needNt
        ? getCtvNotificationList({
            query: ntQuery,
            type: ntType || undefined,
            from: ntFrom || undefined,
            to: ntTo || undefined,
          })
        : Promise.resolve({ rows: [], total: 0 });
    })(),
    activeTab === "rut-tien"
      ? getAffiliateWithdrawals({
          query: wdQuery,
          status: wdStatus,
          sort: wdSort,
        })
      : Promise.resolve({
          rows: [] as Awaited<ReturnType<typeof getAffiliateWithdrawals>>["rows"],
          kpis: {
            totalRequests: 0,
            pendingCount: 0,
            approvedCount: 0,
            paidCount: 0,
            rejectedCount: 0,
            pendingAmountTotal: 0,
          },
        }),
  ]);

  const clickRows = clickBundle.rows;
  const clickKpis = clickBundle.kpis;
  const ctvOrderRows = orderBundle.rows;
  const ctvOrderKpis = orderBundle.kpis;
  const commissionRows = commissionBundle.rows;
  const commissionKpis = commissionBundle.kpis;
  const rewardRows = rewardBundle.rows;
  const rewardKpis = rewardBundle.kpis;
  const reconciliationRows = reconciliationBundle.rows;
  const reconciliationKpis = reconciliationBundle.kpis;
  const withdrawalRows = withdrawalBundle.rows;
  const withdrawalKpis = withdrawalBundle.kpis;
  const affiliateApplicationPendingCount = pendingBadgeCounts.applications;
  const withdrawalPendingCount = pendingBadgeCounts.withdrawals;
  const payoutAccountPendingCount = pendingBadgeCounts.payoutAccounts;
  const requestPendingCount = affiliateApplicationPendingCount + payoutAccountPendingCount;

  const affiliateEnabled = settings.affiliateEnabled;
  const rewardPointsEnabled = settings.rewardPointEnabled;
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  const referralBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const statusLabel = (status: "ACTIVE" | "PAUSED" | "LOCKED") => {
    if (status === "ACTIVE") return "Đang hoạt động";
    if (status === "PAUSED") return "Tạm dừng";
    return "Đã khóa";
  };
  const statusBadgeClass = (status: "ACTIVE" | "PAUSED" | "LOCKED") => {
    if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
    if (status === "PAUSED") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  const applicationStatusLabel = (status: (typeof affiliateApplicationRows)[number]["status"]) => {
    if (status === "PENDING") return "Chờ duyệt";
    if (status === "APPROVED") return "Đã duyệt";
    return "Từ chối";
  };
  const applicationStatusBadgeClass = (status: (typeof affiliateApplicationRows)[number]["status"]) => {
    if (status === "PENDING") return "bg-amber-100 text-amber-800";
    if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
    return "bg-rose-100 text-rose-800";
  };
  const appErrorMessage =
    appErrorCode === "not_found"
      ? "Không tìm thấy đơn đăng ký hoặc đơn đã bị xóa."
      : appErrorCode === "invalid_status"
        ? "Đơn không còn ở trạng thái chờ duyệt (có thể đã được xử lý)."
        : appErrorCode === "server_error"
          ? "Không thể xử lý yêu cầu. Vui lòng thử lại sau."
          : "";

  const vnDateTime = (d: Date) =>
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);

  const truncateText = (value: string | null | undefined, max = 44) => {
    const s = (value ?? "").trim();
    if (!s) return "—";
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  };

  const applicationScoreBand = (score: number | null): { label: string; className: string } => {
    if (score == null) return { label: "Chưa chấm", className: "bg-slate-100 text-slate-700" };
    if (score >= 80) return { label: "Tiềm năng cao", className: "bg-emerald-100 text-emerald-800" };
    if (score >= 50) return { label: "Cần xem thêm", className: "bg-amber-100 text-amber-800" };
    return { label: "Ưu tiên thấp", className: "bg-rose-100 text-rose-800" };
  };

  const clickConversionText = `${clickKpis.conversionRate.toFixed(2)}%`;
  const ctvAvgOrderText = formatCurrency(Math.round(ctvOrderKpis.averageOrderValue));
  const payoutStatusTabs: Array<{ id: PayoutStatus; label: string }> = [
    { id: "PENDING", label: payoutMode === "accounts" ? "Chờ xác minh" : "Chờ duyệt đổi TK" },
    { id: "APPROVED", label: payoutMode === "accounts" ? "Đã duyệt TK" : "Đã duyệt yêu cầu" },
    { id: "REJECTED", label: "Từ chối" },
  ];
  const payoutHref = (mode: PayoutMode, status: PayoutStatus = payoutStatus): string => {
    const qs = new URLSearchParams();
    qs.set("tab", "yeu-cau-ctv");
    qs.set("request", "payout-account");
    qs.set("payout_mode", mode);
    qs.set("payout_status", status);
    if (payoutQuery) qs.set("payout_q", payoutQuery);
    return `/admin/collaborators?${qs.toString()}`;
  };
  const paymentHref = (section: PaymentSection): string => {
    const qs = new URLSearchParams();
    qs.set("tab", "doi-soat");
    if (section === "reward-transactions") qs.set("payment_section", "reward-transactions");
    return `/admin/collaborators?${qs.toString()}`;
  };

  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Cộng tác viên</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Quản lý toàn bộ chương trình CTV trong một module duy nhất: danh sách, yêu cầu, hoa hồng, thanh toán và lịch sử vận hành.
          </p>
        </div>
      </header>

      <nav className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white p-2">
        <div className="flex min-w-max gap-2">
          {CTV_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/admin/collaborators?tab=${tab.id}`}
                className={`${adminTabBase} inline-flex max-w-full min-w-0 items-center gap-1.5 whitespace-nowrap font-semibold ${
                  isActive ? adminTabActive : adminTabInactive
                }`}
              >
                <span className="min-w-0 truncate">{tab.label}</span>
                {tab.id === "yeu-cau-ctv" ? (
                  requestPendingCount > 0 ? (
                    <span
                      className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 ring-1 ring-rose-300/90"
                      title={`${affiliateApplicationPendingCount} đơn đăng ký và ${payoutAccountPendingCount} TK nhận tiền chờ xử lý`}
                    >
                      {requestPendingCount > 99 ? "99+" : requestPendingCount}
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-slate-100/90 px-1.5 text-[10px] font-medium tabular-nums text-slate-500"
                      title="Không có yêu cầu CTV chờ xử lý"
                    >
                      0
                    </span>
                  )
                ) : null}
                {tab.id === "rut-tien" ? (
                  withdrawalPendingCount > 0 ? (
                    <span
                      className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 ring-1 ring-amber-300/90"
                      title={`${withdrawalPendingCount} yêu cầu rút tiền chờ xử lý`}
                    >
                      {withdrawalPendingCount > 99 ? "99+" : withdrawalPendingCount}
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-slate-100/90 px-1.5 text-[10px] font-medium tabular-nums text-slate-500"
                      title="Không có yêu cầu rút tiền chờ xử lý"
                    >
                      0
                    </span>
                  )
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {activeTab === "cai-dat" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">Cài đặt chương trình CTV</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Cấu hình được lưu vào <span className="font-medium">website_settings</span> (cùng pipeline với cài đặt
                website).
              </p>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                affiliateEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {affiliateEnabled ? "Chương trình đang bật" : "Chương trình đang tắt"}
            </span>
          </div>

          {ctvSettingsSaved === "1" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Đã lưu cài đặt CTV.
            </div>
          ) : null}
          {ctvSettingsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {ctvSettingsError.length > 400 ? `${ctvSettingsError.slice(0, 400)}…` : ctvSettingsError}
            </div>
          ) : null}

          <AffiliateCtvSettingsForm settings={settings} redirectTo={ctvSettingsRedirectTo} />
          <CtvMembershipTiersAdmin />
        </section>
      ) : null}

      {activeTab === "danh-sach" ? (
      <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-4" action="/admin/collaborators" method="GET">
          <input id="admin-collaborators-list-tab" type="hidden" name="tab" value="danh-sach" />
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
            <input
              id="admin-collaborators-q"
              name="q"
              defaultValue={query}
              placeholder="Tên, email, SĐT hoặc mã giới thiệu"
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Trạng thái</span>
            <select
              id="admin-collaborators-status"
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
            <select
              id="admin-collaborators-sort"
              name="sort"
              defaultValue={sortFilter}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            >
              <option value="newest">Mới nhất</option>
              <option value="most_clicks">Click nhiều nhất</option>
              <option value="highest_revenue">Doanh thu cao nhất</option>
              <option value="highest_commission">Hoa hồng cao nhất</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Áp dụng
            </button>
            <Link
              href="/admin/collaborators?tab=danh-sach"
              className="inline-flex h-10 items-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
            >
              Đặt lại
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Họ tên</th>
              <th className="px-4 py-3 font-semibold">Email / SĐT</th>
              <th className="px-4 py-3 font-semibold">Mã giới thiệu</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Click</th>
              <th className="px-4 py-3 font-semibold">Đơn phát sinh</th>
              <th className="px-4 py-3 font-semibold">Hoa hồng</th>
              <th className="px-4 py-3 font-semibold">Điểm thưởng</th>
              <th className="px-4 py-3 font-semibold">Ngày tham gia</th>
              <th className="px-4 py-3 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((item) => (
              <tr key={item.id} className="border-b border-[#E2E8F0] last:border-none">
                <td className="px-4 py-3 font-medium text-[#0F172A]">
                  {item.customer?.fullName ?? item.admin?.fullName ?? "CTV chưa cập nhật tên"}
                </td>
                <td className="px-4 py-3 text-[#0F172A]">
                  <p>{item.customer?.email ?? item.admin?.email ?? "-"}</p>
                  <p className="text-xs text-[#64748B]">{item.customer?.phone ?? item.admin?.username ?? "-"}</p>
                </td>
                <td className="px-4 py-3 font-medium text-[#0F172A]">{item.refCode}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#0F172A]">{item.clicks}</td>
                <td className="px-4 py-3 text-[#0F172A]">{item.orderCount}</td>
                <td className="px-4 py-3 font-medium text-[#0F172A]">{formatCurrency(item.commissionAmount)}</td>
                <td className="px-4 py-3 text-[#0F172A]">{item.rewardPoints}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.createdAt.toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      href={`/admin/collaborators?tab=danh-sach&profileId=${item.id}`}
                      className="inline-flex rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                    >
                      Xem chi tiết
                    </Link>
                    {item.status === "ACTIVE" ? (
                      <form action={`/api/admin/affiliates/${item.id}/status`} method="POST">
                        <input id={`admin-collaborators-${item.id}-pause-status`} type="hidden" name="status" value="PAUSED" />
                        <input id={`admin-collaborators-${item.id}-pause-redirect-to`} type="hidden" name="redirectTo" value={`/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(query)}&status=${statusFilter}&sort=${sortFilter}`} />
                        <button className="inline-flex rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-50" type="submit">
                          Tạm dừng
                        </button>
                      </form>
                    ) : (
                      <form action={`/api/admin/affiliates/${item.id}/status`} method="POST">
                        <input id={`admin-collaborators-${item.id}-active-status`} type="hidden" name="status" value="ACTIVE" />
                        <input id={`admin-collaborators-${item.id}-active-redirect-to`} type="hidden" name="redirectTo" value={`/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(query)}&status=${statusFilter}&sort=${sortFilter}`} />
                        <button className="inline-flex rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-50" type="submit">
                          Kích hoạt
                        </button>
                      </form>
                    )}
                    {item.status !== "LOCKED" ? (
                      <form action={`/api/admin/affiliates/${item.id}/status`} method="POST">
                        <input id={`admin-collaborators-${item.id}-lock-status`} type="hidden" name="status" value="LOCKED" />
                        <input id={`admin-collaborators-${item.id}-lock-redirect-to`} type="hidden" name="redirectTo" value={`/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(query)}&status=${statusFilter}&sort=${sortFilter}`} />
                        <button className="inline-flex rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50" type="submit">
                          Khóa CTV
                        </button>
                      </form>
                    ) : null}
                    <AffiliateCopyLinkButton url={`${referralBaseUrl ? `${referralBaseUrl}/` : "/"}?ref=${item.refCode}`} />
                    <Link
                      href={`/admin/collaborators?tab=don-phat-sinh&refCode=${item.refCode}`}
                      className="inline-flex rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
                    >
                      Xem đơn phát sinh
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!profiles.length ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">
                  <p>Chưa có cộng tác viên nào.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </section>
      ) : null}

      {activeTab === "yeu-cau-ctv" ? (
        <section className="max-w-full min-w-0 space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Yêu cầu CTV</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Duyệt hoặc từ chối đơn đăng ký làm cộng tác viên. Chỉ đơn ở trạng thái &quot;Chờ duyệt&quot; mới có thao tác
              xử lý.
            </p>
          </div>

          {appErrorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {appErrorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
            <Link
              href="/admin/collaborators?tab=yeu-cau-ctv"
              className={`${adminTabBase} font-semibold ${
                requestSection === "applications" ? adminTabActive : adminTabInactive
              }`}
            >
              Đăng ký CTV
              {affiliateApplicationPendingCount > 0 ? (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                  {affiliateApplicationPendingCount > 99 ? "99+" : affiliateApplicationPendingCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={payoutHref("accounts", "PENDING")}
              className={`${adminTabBase} font-semibold ${
                requestSection === "payout-account" && payoutMode === "accounts" ? adminTabActive : adminTabInactive
              }`}
            >
              TK nhận tiền
              {payoutAccountPendingCount > 0 ? (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                  {payoutAccountPendingCount > 99 ? "99+" : payoutAccountPendingCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={payoutHref("change-requests", "PENDING")}
              className={`${adminTabBase} font-semibold ${
                requestSection === "payout-account" && payoutMode === "change-requests"
                  ? adminTabActive
                  : adminTabInactive
              }`}
            >
              Đổi TK nhận tiền
            </Link>
          </div>

          {requestSection === "payout-account" ? (
            <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Tài khoản nhận tiền CTV</h3>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Dùng lại luồng duyệt KYC, approve/reject và API hiện có; ảnh CCCD vẫn đi qua media proxy bảo mật.
                  </p>
                </div>
                <Link
                  href={CTV_PAYOUT_ACCOUNTS_ADMIN_HREF}
                  className="inline-flex h-10 shrink-0 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
                >
                  Mở trang đầy đủ
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {payoutStatusTabs.map((tab) => {
                  const active = tab.id === payoutStatus;
                  return (
                    <Link
                      key={tab.id}
                      href={payoutHref(payoutMode, tab.id)}
                      className={`${adminTabBase} font-semibold ${active ? adminTabActive : adminTabInactive}`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              <form className="flex flex-col gap-2 sm:flex-row" action="/admin/collaborators" method="GET">
                <input id="admin-collaborators-payout-tab" type="hidden" name="tab" value="yeu-cau-ctv" />
                <input id="admin-collaborators-payout-request" type="hidden" name="request" value="payout-account" />
                <input id="admin-collaborators-payout-mode" type="hidden" name="payout_mode" value={payoutMode} />
                <input id="admin-collaborators-payout-status" type="hidden" name="payout_status" value={payoutStatus} />
                <input
                  id="admin-collaborators-payout-q"
                  name="payout_q"
                  defaultValue={payoutQuery}
                  placeholder={payoutMode === "accounts" ? "Tìm theo tên, email, ngân hàng…" : "Tìm CTV hoặc ngân hàng đề xuất…"}
                  className="min-h-11 flex-1 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Tìm
                </button>
              </form>

              {payoutMode === "accounts" ? (
                <AdminPayoutAccountsTable status={payoutStatus} query={payoutQuery} />
              ) : (
                <AdminPayoutChangeRequestsTable status={payoutStatus} query={payoutQuery} />
              )}
            </div>
          ) : null}

          {requestSection === "applications" ? (
            <>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-applications-tab" type="hidden" name="tab" value="yeu-cau-ctv" />
            <label className="space-y-1 sm:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Trạng thái đơn</span>
              <select
                id="admin-collaborators-app-status"
                name="app_status"
                defaultValue={appStatusFilter}
                className="w-full min-h-11 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </label>
            <label className="space-y-1 sm:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Nhóm điểm hồ sơ</span>
              <select
                id="admin-collaborators-app-score-tier"
                name="app_score_tier"
                defaultValue={appScoreTierFilter}
                className="w-full min-h-11 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="HIGH">Tiềm năng cao (80–100)</option>
                <option value="MEDIUM">Cần xem thêm (50–79)</option>
                <option value="LOW">Ưu tiên thấp (0–49)</option>
                <option value="UNSCORED">Chưa chấm</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-4">
              <button
                type="submit"
                className="inline-flex h-10 min-h-11 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Lọc
              </button>
              <Link
                href="/admin/collaborators?tab=yeu-cau-ctv"
                className="inline-flex h-10 min-h-11 items-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Đặt lại
              </Link>
            </div>
          </form>

          <ul className="grid list-none gap-3 md:hidden">
            {affiliateApplicationRows.map((row) => {
              const social = (row.socialLink ?? "").trim();
              const socialIsUrl = /^https?:\/\//i.test(social);
              const scoreBand = applicationScoreBand(row.score);
              return (
                <li
                  key={`m-app-${row.id}`}
                  className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#0F172A]"
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 max-w-full flex-1 font-semibold break-words">{row.fullName}</p>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${applicationStatusBadgeClass(row.status)}`}
                      >
                        {applicationStatusLabel(row.status)}
                      </span>
                      <span
                        className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${scoreBand.className}`}
                      >
                        {row.score != null ? `${row.score}/100 · ` : ""}
                        {scoreBand.label}
                      </span>
                    </div>
                  </div>
                  <dl className="mt-3 min-w-0 space-y-2 text-xs text-[#64748B]">
                    <div>
                      <dt className="font-medium text-[#64748B]">Nguồn traffic</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.trafficSource, 80)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Số follower</dt>
                      <dd className="mt-0.5 text-[#0F172A]">{row.followerCount != null ? row.followerCount.toLocaleString("vi-VN") : "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Ngành hàng muốn bán</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.sellingCategories, 100)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Lý do điểm</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.scoreReason, 140)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Ghi chú duyệt nhanh</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.quickReviewNote, 140)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">SĐT</dt>
                      <dd className="mt-0.5 text-[#0F172A]">{row.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Email</dt>
                      <dd className="mt-0.5 break-all text-[#0F172A]">{row.email?.trim() ? row.email : "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Link mạng xã hội</dt>
                      <dd className="mt-0.5 min-w-0 break-all text-[#0F172A]">
                        {social ? (
                          socialIsUrl ? (
                            <a
                              href={social}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2563EB] underline"
                            >
                              {truncateText(social, 56)}
                            </a>
                          ) : (
                            truncateText(social, 56)
                          )
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Ghi chú ứng viên</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.note, 120)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Ngày gửi</dt>
                      <dd className="mt-0.5 text-[#0F172A]">{vnDateTime(row.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[#64748B]">Ghi chú admin (hiển thị cho khách khi từ chối)</dt>
                      <dd className="mt-0.5 break-words text-[#0F172A]">{truncateText(row.adminNote, 160)}</dd>
                    </div>
                  </dl>
                  {row.status === "PENDING" ? (
                    <div className="mt-4 flex min-w-0 flex-col gap-2 border-t border-[#E2E8F0] pt-4">
                      <form
                        action={`/api/admin/collaborators/applications/${row.id}/approve`}
                        method="POST"
                        className="space-y-2 rounded-lg border border-emerald-100 bg-white p-3"
                      >
                        <textarea
                          id={`admin-collaborators-application-${row.id}-approve-note`}
                          name="adminNote"
                          rows={2}
                          placeholder="Ghi chú gửi kèm đơn (tùy chọn)"
                          className="w-full min-h-11 min-w-0 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                        />
                        <textarea
                          id={`admin-collaborators-application-${row.id}-approve-internal-note`}
                          name="internalQuickNote"
                          rows={2}
                          placeholder="Ghi chú nội bộ — khách không thấy (tùy chọn)"
                          className="w-full min-h-11 min-w-0 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                        />
                        <input id={`admin-collaborators-application-${row.id}-approve-redirect-to`} type="hidden" name="redirectTo" value={affiliateAppRedirectTo} />
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-md bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Duyệt
                        </button>
                      </form>
                      <form
                        action={`/api/admin/collaborators/applications/${row.id}/reject`}
                        method="POST"
                        className="space-y-2 rounded-lg border border-rose-100 bg-white p-3"
                      >
                        <textarea
                          id={`admin-collaborators-application-${row.id}-reject-note`}
                          name="adminNote"
                          rows={2}
                          placeholder="Lý do từ chối (tùy chọn, khách có thể xem)"
                          className="w-full min-h-11 min-w-0 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                        />
                        <textarea
                          id={`admin-collaborators-application-${row.id}-reject-internal-note`}
                          name="internalQuickNote"
                          rows={2}
                          placeholder="Ghi chú nội bộ — khách không thấy (tùy chọn)"
                          className="w-full min-h-11 min-w-0 rounded-md border border-[#E2E8F0] px-2 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                        />
                        <input id={`admin-collaborators-application-${row.id}-reject-redirect-to`} type="hidden" name="redirectTo" value={affiliateAppRedirectTo} />
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-md border border-rose-300 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                        >
                          Từ chối
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!affiliateApplicationRows.length ? (
            <p className="md:hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
              Không có đơn đăng ký trong bộ lọc hiện tại.
            </p>
          ) : null}

          <div className="hidden max-w-full min-w-0 overflow-x-auto rounded-xl border border-[#E2E8F0] md:block">
            <table className="w-full min-w-[1380px] text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Họ tên</th>
                  <th className="px-4 py-3 font-semibold">SĐT</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Link MXH</th>
                  <th className="px-4 py-3 font-semibold">Nguồn traffic</th>
                  <th className="px-4 py-3 font-semibold">Follower</th>
                  <th className="px-4 py-3 font-semibold">Ngành hàng</th>
                  <th className="px-4 py-3 font-semibold">Điểm &amp; nhóm</th>
                  <th className="px-4 py-3 font-semibold">Lý do điểm</th>
                  <th className="px-4 py-3 font-semibold">Duyệt nhanh</th>
                  <th className="px-4 py-3 font-semibold">Ghi chú ứng viên</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày gửi</th>
                  <th className="px-4 py-3 font-semibold">Ghi chú admin</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {affiliateApplicationRows.map((row) => {
                  const social = (row.socialLink ?? "").trim();
                  const socialIsUrl = /^https?:\/\//i.test(social);
                  const scoreBand = applicationScoreBand(row.score);
                  return (
                    <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{row.fullName}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{row.phone || "—"}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{row.email?.trim() ? row.email : "—"}</td>
                      <td className="max-w-[160px] px-4 py-3 text-[#0F172A]">
                        {social ? (
                          socialIsUrl ? (
                            <a
                              href={social}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-[#2563EB] underline hover:text-[#1D4ED8]"
                            >
                              {truncateText(social, 36)}
                            </a>
                          ) : (
                            <span className="break-all">{truncateText(social, 40)}</span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[120px] px-4 py-3 break-words text-[#0F172A]">
                        {truncateText(row.trafficSource, 48)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#0F172A]">
                        {row.followerCount != null ? row.followerCount.toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="max-w-[140px] px-4 py-3 break-words text-[#0F172A]">
                        {truncateText(row.sellingCategories, 56)}
                      </td>
                      <td className="min-w-[108px] px-4 py-3 align-top">
                        <p className="font-semibold tabular-nums text-[#0F172A]">
                          {row.score != null ? `${row.score}/100` : "—"}
                        </p>
                        <span
                          className={`mt-1 inline-flex max-w-full rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${scoreBand.className}`}
                        >
                          {scoreBand.label}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-4 py-3 break-words text-[#64748B]">{truncateText(row.scoreReason, 96)}</td>
                      <td className="max-w-[200px] px-4 py-3 break-words text-[#64748B]">{truncateText(row.quickReviewNote, 96)}</td>
                      <td className="max-w-[200px] px-4 py-3 text-[#64748B]">{truncateText(row.note, 72)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${applicationStatusBadgeClass(row.status)}`}
                        >
                          {applicationStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{vnDateTime(row.createdAt)}</td>
                      <td className="max-w-[160px] px-4 py-3 break-words text-[#64748B]">{truncateText(row.adminNote, 64)}</td>
                      <td className="min-w-[220px] px-4 py-3 align-top">
                        {row.status === "PENDING" ? (
                          <div className="flex flex-col gap-2">
                            <form
                              action={`/api/admin/collaborators/applications/${row.id}/approve`}
                              method="POST"
                              className="space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2"
                            >
                              <textarea
                                id={`admin-collaborators-application-mobile-${row.id}-approve-note`}
                                name="adminNote"
                                rows={2}
                                placeholder="Ghi chú gửi kèm đơn (tùy chọn)"
                                className="w-full min-h-11 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                              />
                              <textarea
                                id={`admin-collaborators-application-mobile-${row.id}-approve-internal-note`}
                                name="internalQuickNote"
                                rows={2}
                                placeholder="Ghi chú nội bộ (khách không thấy)"
                                className="w-full min-h-11 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                              />
                              <input id={`admin-collaborators-application-mobile-${row.id}-approve-redirect-to`} type="hidden" name="redirectTo" value={affiliateAppRedirectTo} />
                              <button
                                type="submit"
                                className="min-h-11 w-full rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Duyệt
                              </button>
                            </form>
                            <form
                              action={`/api/admin/collaborators/applications/${row.id}/reject`}
                              method="POST"
                              className="space-y-1 rounded-lg border border-rose-100 bg-rose-50/40 p-2"
                            >
                              <textarea
                                id={`admin-collaborators-application-mobile-${row.id}-reject-note`}
                                name="adminNote"
                                rows={2}
                                placeholder="Lý do từ chối (khách có thể xem)"
                                className="w-full min-h-11 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                              />
                              <textarea
                                id={`admin-collaborators-application-mobile-${row.id}-reject-internal-note`}
                                name="internalQuickNote"
                                rows={2}
                                placeholder="Ghi chú nội bộ (khách không thấy)"
                                className="w-full min-h-11 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs text-[#0F172A] outline-none focus:border-[#2563EB]"
                              />
                              <input id={`admin-collaborators-application-mobile-${row.id}-reject-redirect-to`} type="hidden" name="redirectTo" value={affiliateAppRedirectTo} />
                              <button
                                type="submit"
                                className="min-h-11 w-full rounded-md border border-rose-300 bg-white px-2 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                              >
                                Từ chối
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!affiliateApplicationRows.length ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-[#64748B]">
                      Không có đơn đăng ký trong bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === "click-theo-doi" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Click / Theo dõi giới thiệu</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Theo dõi lượt click theo CTV, nguồn và trạng thái gắn đơn (múi giờ Việt Nam).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng click</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{clickKpis.totalClicks}</p>
        </article>
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Click hợp lệ</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{clickKpis.validClicks}</p>
              <p className="mt-1 text-xs text-[#64748B]">Đã loại trừ bot và truy cập khu vực quản trị.</p>
        </article>
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Click đã gắn đơn</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{clickKpis.clicksWithOrder}</p>
        </article>
        <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tỷ lệ chuyển đổi click → đơn</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{clickConversionText}</p>
              <p className="mt-1 text-xs text-[#64748B]">Đơn gắn / tổng click trong bộ lọc hiện tại.</p>
        </article>
          </div>

          <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-click-tab" type="hidden" name="tab" value="click-theo-doi" />
            <label className="space-y-1 lg:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
              <input
                id="admin-collaborators-click-q"
                name="click_q"
                defaultValue={clickQuery}
                placeholder="CTV, ref code, landing, nguồn…"
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              />
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Trạng thái gắn đơn</span>
              <select
                id="admin-collaborators-click-order"
                name="click_order"
                defaultValue={clickOrder}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="NO_ORDER">Chưa có đơn</option>
                <option value="HAS_ORDER">Đã gắn đơn</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-3">
              <span className="text-xs font-medium text-[#64748B]">Thời gian</span>
              <select
                id="admin-collaborators-click-range"
                name="click_range"
                defaultValue={clickRange}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
              <select
                id="admin-collaborators-click-sort"
                name="click_sort"
                defaultValue={clickSort}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </label>
            <div className="flex items-end gap-2 lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] lg:w-auto"
              >
                Lọc
              </button>
            </div>
            <div className="flex items-end lg:col-span-12">
          <Link
                href="/admin/collaborators?tab=click-theo-doi"
                className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
          >
                Đặt lại bộ lọc
          </Link>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">CTV</th>
                  <th className="px-4 py-3 font-semibold">Ref code</th>
                  <th className="px-4 py-3 font-semibold">Landing page</th>
                  <th className="px-4 py-3 font-semibold">Nguồn</th>
                  <th className="px-4 py-3 font-semibold">UTM source</th>
                  <th className="px-4 py-3 font-semibold">UTM campaign</th>
                  <th className="px-4 py-3 font-semibold">Thiết bị</th>
                  <th className="px-4 py-3 font-semibold">Trình duyệt</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái gắn đơn</th>
                </tr>
              </thead>
              <tbody>
                {clickRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none">
                    <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{vnDateTime(row.createdAt)}</td>
                    <td className="max-w-[200px] px-4 py-3 font-medium text-[#0F172A]">
                      <span className="block truncate" title={row.affiliateDisplayName}>
                        {truncateText(row.affiliateDisplayName, 36)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">{row.refCode}</td>
                    <td className="max-w-[220px] px-4 py-3 text-[#0F172A]">
                      <span className="block truncate" title={row.landingPage ?? undefined}>
                        {truncateText(row.landingPage, 48)}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-4 py-3 text-[#0F172A]">
                      <span className="block truncate" title={row.sourceLabel}>
                        {truncateText(row.sourceLabel, 40)}
                      </span>
                    </td>
                    <td className="max-w-[140px] px-4 py-3 text-[#64748B]">
                      <span className="block truncate" title={row.utmSource ?? undefined}>
                        {truncateText(row.utmSource, 32)}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-4 py-3 text-[#64748B]">
                      <span className="block truncate" title={row.utmCampaign ?? undefined}>
                        {truncateText(row.utmCampaign, 40)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{truncateText(row.device, 24)}</td>
                    <td className="max-w-[180px] px-4 py-3 text-[#64748B]">
                      <span className="block truncate" title={row.browser ?? undefined}>
                        {truncateText(row.browser, 36)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.orderAttached ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Đã gắn đơn
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Chưa có đơn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!clickRows.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#64748B]">
                      Chưa có click giới thiệu.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
      </section>
      ) : null}

      {activeTab === "don-phat-sinh" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Đơn phát sinh từ CTV</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Đơn có gắn hồ sơ CTV hoặc mã ref; doanh thu tổng hợp theo đơn đã thanh toán hoặc hoàn tất (múi giờ Việt Nam).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng đơn phát sinh từ CTV</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{ctvOrderKpis.totalOrders}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Đơn đã thanh toán / hoàn tất</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{ctvOrderKpis.paidOrCompletedOrders}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Doanh thu từ CTV</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatCurrency(ctvOrderKpis.revenueFromCtv)}</p>
              <p className="mt-1 text-xs text-[#64748B]">Theo đơn PAID hoặc COMPLETED, không tính hủy / hoàn / thất bại.</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Hoa hồng dự kiến</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatCurrency(ctvOrderKpis.expectedCommissionTotal)}</p>
              <p className="mt-1 text-xs text-[#64748B]">Theo bản ghi hoa hồng hoặc tạm tính theo tỷ lệ CTV / cài đặt.</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Giá trị đơn trung bình</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{ctvAvgOrderText}</p>
            </article>
          </div>

          <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-order-tab" type="hidden" name="tab" value="don-phat-sinh" />
            {refCodeFromUrl ? <input id="admin-collaborators-order-ref-code" type="hidden" name="refCode" value={refCodeFromUrl} /> : null}
            <label className="space-y-1 lg:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
              <input
                id="admin-collaborators-order-q"
                name="ord_q"
                defaultValue={ordQuery}
                placeholder="Mã đơn, khách, CTV, ref…"
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              />
            </label>
            <label className="space-y-1 lg:col-span-3">
              <span className="text-xs font-medium text-[#64748B]">Trạng thái đơn</span>
              <select
                id="admin-collaborators-order-status"
                name="ord_status"
                defaultValue={ordStatus}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="CANCELED">Đã hủy</option>
                <option value="FAILED">Thất bại</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Thời gian</span>
              <select
                id="admin-collaborators-order-range"
                name="ord_range"
                defaultValue={ordRange}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
              <select
                id="admin-collaborators-order-sort"
                name="ord_sort"
                defaultValue={ordSort}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="highest_value">Giá trị cao nhất</option>
              </select>
            </label>
            <div className="flex items-end gap-2 lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] lg:w-auto"
              >
                Lọc
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-12">
              <Link
                href="/admin/collaborators?tab=don-phat-sinh"
                className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Đặt lại bộ lọc
              </Link>
              {refCodeFromUrl ? (
                <span className="text-xs text-[#64748B]">
                  Đang lọc theo ref: <span className="font-mono font-semibold text-[#0F172A]">{refCodeFromUrl}</span>
                </span>
      ) : null}
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã đơn</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">CTV</th>
                  <th className="px-4 py-3 font-semibold">Ref code</th>
                  <th className="px-4 py-3 font-semibold">Giá trị đơn</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái đơn</th>
                  <th className="px-4 py-3 font-semibold">Thanh toán</th>
                  <th className="px-4 py-3 font-semibold">Hoa hồng dự kiến</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ctvOrderRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F172A]">{row.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{vnDateTime(row.createdAt)}</td>
                    <td className="max-w-[180px] px-4 py-3 text-[#0F172A]">
                      <span className="block truncate" title={row.customerFullName}>
                        {truncateText(row.customerFullName, 40)}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-4 py-3 font-medium text-[#0F172A]">
                      <span className="block truncate" title={row.affiliateDisplayName}>
                        {truncateText(row.affiliateDisplayName, 32)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">{row.refCode}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{row.orderStatusLabel}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.paymentStatusLabel}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{formatCurrency(row.expectedCommission)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="inline-flex rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-slate-50"
                      >
                        Xem đơn
                      </Link>
                    </td>
                  </tr>
                ))}
                {!ctvOrderRows.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#64748B]">
                      Chưa có đơn phát sinh từ cộng tác viên.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "hoa-hong" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Hoa hồng cộng tác viên</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Chỉ hiển thị bản ghi <span className="font-medium">AffiliateCommission</span> đã có; không tự tạo hoa hồng từ tab này.
            </p>
          </div>

          {commissionError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {commissionError === "invalid_action"
                ? "Thao tác không hợp lệ."
                : commissionError}
          </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng hoa hồng (theo bộ lọc thời gian / tìm)</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(commissionKpis.totalCommissionAmount)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Chờ duyệt</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(commissionKpis.pendingAmount)}</p>
            </article>
            <article className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
              <p className="text-xs font-medium text-cyan-800">Đang chờ mở khóa</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">
                {formatCurrency(commissionKpis.waitingReleaseAmount)}
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-xs font-medium text-emerald-800">Khả dụng</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(commissionKpis.availableAmount)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Đã thanh toán</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(commissionKpis.paidAmount)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Bị hủy</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(commissionKpis.cancelledAmount)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Số đơn có hoa hồng</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{commissionKpis.orderCountWithCommission}</p>
            </article>
          </div>

          <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-commission-tab" type="hidden" name="tab" value="hoa-hong" />
            <label className="space-y-1 lg:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
              <input
                id="admin-collaborators-commission-q"
                name="hh_q"
                defaultValue={hhQuery}
                placeholder="CTV, ref code, mã đơn…"
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              />
            </label>
            <label className="space-y-1 lg:col-span-3">
              <span className="text-xs font-medium text-[#64748B]">Trạng thái hoa hồng</span>
              <select
                id="admin-collaborators-commission-status"
                name="hh_status"
                defaultValue={hhStatus}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="WAITING_RELEASE">Đang chờ mở khóa</option>
                <option value="AVAILABLE">Khả dụng</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="CANCELLED">Bị hủy</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Thời gian</span>
              <select
                id="admin-collaborators-commission-range"
                name="hh_range"
                defaultValue={hhRange}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
              <select
                id="admin-collaborators-commission-sort"
                name="hh_sort"
                defaultValue={hhSort}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="highest_amount">Số tiền cao nhất</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] lg:w-auto"
              >
                Lọc
              </button>
          </div>
            <div className="flex items-end lg:col-span-12">
              <Link
                href="/admin/collaborators?tab=hoa-hong"
                className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Đặt lại bộ lọc
              </Link>
          </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="w-full min-w-[1240px] text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">CTV</th>
                  <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                  <th className="px-4 py-3 font-semibold">Doanh thu đơn</th>
                  <th className="px-4 py-3 font-semibold">Tỷ lệ HH</th>
                  <th className="px-4 py-3 font-semibold">Số tiền HH</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày phát sinh</th>
                  <th className="px-4 py-3 font-semibold">Ngày duyệt</th>
                  <th className="px-4 py-3 font-semibold">Ngày thanh toán</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {commissionRows.map((row) => {
                  const statusBadge =
                    row.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : row.status === "APPROVED"
                        ? "bg-sky-100 text-sky-800"
                        : row.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700";
                  return (
                    <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none">
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate font-medium text-[#0F172A]" title={row.affiliateDisplayName}>
                          {truncateText(row.affiliateDisplayName, 36)}
                        </p>
                        <p className="font-mono text-xs text-[#64748B]">{row.refCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${row.orderId}`}
                          className="font-mono text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          {row.orderCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{formatCurrency(row.orderRevenue)}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{row.commissionRatePercent}%</td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{vnDateTime(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">
                        {row.approvedAt ? vnDateTime(row.approvedAt) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">
                        {row.paidAt ? vnDateTime(row.paidAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <AffiliateCommissionActions
                            commissionId={row.id}
                            redirectTo={commissionRedirectTo}
                            status={row.status}
                            orderBlocksApproveAndPay={row.orderBlocksApproveAndPay}
                          />
                          <Link
                            href={`/admin/orders/${row.orderId}`}
                            className="inline-flex w-fit rounded-xl border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                          >
                            Xem đơn
                          </Link>
          </div>
                      </td>
                    </tr>
                  );
                })}
                {!commissionRows.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#64748B]">
                      Chưa có hoa hồng cộng tác viên.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
        </div>
      </section>
      ) : null}

      {activeTab === "diem-thuong" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Điểm thưởng CTV</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Lịch sử giao dịch điểm từ <span className="font-medium">RewardPointLedger</span> (theo CTV và đơn nếu có).
            </p>
          </div>

          {!rewardPointsEnabled ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tính năng điểm thưởng CTV đang tắt.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng điểm phát sinh</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatRewardPointsVi(rewardKpis.totalPointsIssued)}</p>
              <p className="mt-1 text-xs text-[#64748B]">Tổng cộng/trừ theo bộ lọc thời gian / tìm kiếm (giữ dấu thực tế).</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Điểm khả dụng</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatRewardPointsVi(rewardKpis.availablePoints)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Điểm đang chờ</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatRewardPointsVi(rewardKpis.pendingPoints)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Điểm đã dùng</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatRewardPointsVi(rewardKpis.usedPoints)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Điểm đã hủy</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatRewardPointsVi(rewardKpis.cancelledPoints)}</p>
            </article>
          </div>

          <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-reward-points-tab" type="hidden" name="tab" value="diem-thuong" />
            <label className="space-y-1 lg:col-span-3">
              <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
              <input
                id="admin-collaborators-reward-points-q"
                name="rp_q"
                defaultValue={rpQuery}
                placeholder="CTV, ref, lý do, mã đơn…"
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              />
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Trạng thái</span>
              <select
                id="admin-collaborators-reward-points-status"
                name="rp_status"
                defaultValue={rpStatus}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Đang chờ</option>
                <option value="AVAILABLE">Khả dụng</option>
                <option value="USED">Đã dùng</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Loại</span>
              <select
                id="admin-collaborators-reward-points-type"
                name="rp_type"
                defaultValue={rpType}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="EARN">Cộng điểm</option>
                <option value="SPEND">Trừ điểm</option>
                <option value="ADJUST">Điều chỉnh</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Thời gian</span>
              <select
                id="admin-collaborators-reward-points-range"
                name="rp_range"
                defaultValue={rpRange}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
              <select
                id="admin-collaborators-reward-points-sort"
                name="rp_sort"
                defaultValue={rpSort}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="highest_points">Điểm cao nhất</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] lg:w-auto"
              >
                Lọc
              </button>
            </div>
            <div className="flex items-end lg:col-span-12">
              <Link
                href="/admin/collaborators?tab=diem-thuong"
                className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Đặt lại bộ lọc
              </Link>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="w-full min-w-[1020px] text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
                  <th className="px-4 py-3 font-semibold">CTV</th>
                  <th className="px-4 py-3 font-semibold">Ref code</th>
                  <th className="px-4 py-3 font-semibold">Loại giao dịch</th>
                  <th className="px-4 py-3 font-semibold">Điểm cộng/trừ</th>
                  <th className="px-4 py-3 font-semibold">Lý do</th>
                  <th className="px-4 py-3 font-semibold">Đơn liên quan</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
                {rewardRows.map((row) => {
                  const stBadge =
                    row.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : row.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-800"
                        : row.status === "USED"
                          ? "bg-slate-200 text-slate-800"
                          : "bg-rose-100 text-rose-800";
                  return (
                    <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none">
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate font-medium text-[#0F172A]" title={row.affiliateDisplayName}>
                          {truncateText(row.affiliateDisplayName, 36)}
                        </span>
                </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">{row.refCode}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{row.typeLabel}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{row.pointsDisplay}</td>
                      <td className="max-w-[220px] px-4 py-3 text-[#64748B]">
                        <span className="block truncate" title={row.reason ?? undefined}>
                          {truncateText(row.reason, 48)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">
                        {row.orderCode ? (
                          <Link href={`/admin/orders/${row.orderId}`} className="font-semibold text-[#2563EB] hover:underline">
                            {row.orderCode}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stBadge}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{vnDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        {row.orderId ? (
                          <Link
                            href={`/admin/orders/${row.orderId}`}
                            className="inline-flex rounded-xl border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-slate-50"
                          >
                            Xem đơn
                          </Link>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
              </tr>
                  );
                })}
                {!rewardRows.length ? (
              <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">
                      Chưa có điểm thưởng cộng tác viên.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
          </div>
      </section>
      ) : null}

      {activeTab === "doi-soat" ? (
        <section className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Đối soát / Thanh toán hoa hồng CTV</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Tổng hợp theo <span className="font-medium">AffiliateCommission</span>; chỉ thanh toán các khoản APPROVED trên đơn hợp lệ.
            </p>
          </div>

          {payError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {payError === "below_threshold"
                ? "Chưa xác nhận thanh toán dưới ngưỡng — thử lại và chấp nhận hộp thoại xác nhận."
                : payError === "missing_profile"
                  ? "Thiếu thông tin CTV."
                  : payError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
            <Link
              href={paymentHref("reconciliation")}
              className={`${adminTabBase} font-semibold ${
                paymentSection === "reconciliation" ? adminTabActive : adminTabInactive
              }`}
            >
              Đối soát
            </Link>
            <Link
              href={paymentHref("reward-transactions")}
              className={`${adminTabBase} font-semibold ${
                paymentSection === "reward-transactions" ? adminTabActive : adminTabInactive
              }`}
            >
              GD thưởng ví
            </Link>
          </div>

          {paymentSection === "reconciliation" ? (
            <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng hoa hồng đã duyệt (chờ trả)</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">
                {formatCurrency(reconciliationKpis.totalApprovedOutstanding)}
              </p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Tổng đã thanh toán</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(reconciliationKpis.totalPaid)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Còn phải trả</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(reconciliationKpis.remainingToPay)}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Số CTV đủ điều kiện thanh toán</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{reconciliationKpis.eligibleProfileCount}</p>
            </article>
            <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">Ngưỡng thanh toán hiện tại</p>
              <p className="mt-1 text-xl font-bold text-[#0F172A]">{formatCurrency(reconciliationKpis.payoutThreshold)}</p>
            </article>
          </div>

          <form className="grid grid-cols-1 gap-3 lg:grid-cols-12" action="/admin/collaborators" method="GET">
            <input id="admin-collaborators-reconciliation-tab" type="hidden" name="tab" value="doi-soat" />
            <label className="space-y-1 lg:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Tìm kiếm</span>
              <input
                id="admin-collaborators-reconciliation-q"
                name="rec_q"
                defaultValue={recQuery}
                placeholder="CTV, ref code…"
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              />
            </label>
            <label className="space-y-1 lg:col-span-4">
              <span className="text-xs font-medium text-[#64748B]">Đủ điều kiện thanh toán</span>
              <select
                id="admin-collaborators-reconciliation-eligible"
                name="rec_eligible"
                defaultValue={recEligible}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">Tất cả</option>
                <option value="ELIGIBLE">Đủ điều kiện</option>
                <option value="NOT_ELIGIBLE">Chưa đủ điều kiện</option>
              </select>
            </label>
            <label className="space-y-1 lg:col-span-3">
              <span className="text-xs font-medium text-[#64748B]">Sắp xếp</span>
              <select
                id="admin-collaborators-reconciliation-sort"
                name="rec_sort"
                defaultValue={recSort}
                className="w-full rounded-2xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
              >
                <option value="outstanding_desc">Còn phải trả cao nhất</option>
                <option value="newest">Mới nhất</option>
                <option value="volume_desc">Hoa hồng cao nhất</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] lg:w-auto"
              >
                Lọc
              </button>
            </div>
            <div className="flex items-end lg:col-span-12">
              <Link
                href="/admin/collaborators?tab=doi-soat"
                className="inline-flex h-10 items-center rounded-2xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50"
              >
                Đặt lại bộ lọc
              </Link>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">CTV</th>
                  <th className="px-4 py-3 font-semibold">Ref code</th>
                  <th className="px-4 py-3 font-semibold">Hoa hồng đã duyệt</th>
                  <th className="px-4 py-3 font-semibold">Đã thanh toán</th>
                  <th className="px-4 py-3 font-semibold">Còn phải trả</th>
                  <th className="px-4 py-3 font-semibold">Số đơn hợp lệ</th>
                  <th className="px-4 py-3 font-semibold">Đủ điều kiện</th>
                  <th className="px-4 py-3 font-semibold">Chu kỳ / ghi chú</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationRows.map((row) => {
                  const eligBadge = row.eligibleForPayout
                    ? "bg-emerald-100 text-emerald-800"
                    : row.approvedOutstanding > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600";
                  const eligLabel = row.eligibleForPayout
                    ? "Đủ điều kiện"
                    : row.approvedOutstanding > 0
                      ? "Chưa đủ điều kiện"
                      : "Không có khoản chờ trả";
                  return (
                    <tr key={row.profileId} className="border-b border-[#E2E8F0] last:border-none">
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate font-medium text-[#0F172A]" title={row.affiliateDisplayName}>
                          {truncateText(row.affiliateDisplayName, 36)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">{row.refCode}</td>
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{formatCurrency(row.approvedOutstanding)}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{formatCurrency(row.paidTotal)}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatCurrency(row.remainingToPay)}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{row.validCommissionCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eligBadge}`}>
                          {eligLabel}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-[#64748B]">
                        <span className="block truncate" title={row.cycleNote}>
                          {truncateText(row.cycleNote, 56)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <AffiliateReconciliationPayForm
                            affiliateProfileId={row.profileId}
                            approvedOutstandingVnd={row.approvedOutstanding}
                            payoutThresholdVnd={reconciliationKpis.payoutThreshold}
                            redirectTo={reconciliationRedirectTo}
                          />
                          <Link
                            href={`/admin/collaborators?tab=danh-sach&q=${encodeURIComponent(row.refCode)}`}
                            className="inline-flex w-fit rounded-xl border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-slate-50"
                          >
                            Xem CTV
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!reconciliationRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">
                      Chưa có dữ liệu đối soát.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
            </>
          ) : null}

          {paymentSection === "reward-transactions" ? (
            <CtvRewardTransactionsAdminPanel
              rows={rewardTxBundle.rows}
              total={rewardTxBundle.total}
              query={txQuery}
              from={txFrom}
              to={txTo}
              tab="doi-soat"
              paymentSection="reward-transactions"
            />
          ) : null}
        </section>
      ) : null}

      {activeTab === "rut-tien" ? (
        <AffiliateWithdrawalsAdminPanel
          rows={withdrawalRows}
          kpis={withdrawalKpis}
          query={wdQuery}
          statusFilter={wdStatus}
          sort={wdSort}
          redirectTo={withdrawalRedirectTo}
          withdrawalError={withdrawalError}
          formatCurrency={formatCurrency}
          truncateText={truncateText}
        />
      ) : null}

      {activeTab === "lich-su" ? (
        <Suspense
          fallback={
            <p className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-10 text-center text-sm text-slate-500">
              Đang tải lịch sử…
            </p>
          }
        >
          <AdminUnifiedHistoryPanel
            revenueRows={revenueRewardAuditBundle.rows}
            revenueTotal={revenueRewardAuditBundle.total}
            tierRows={tierHistoryBundle.rows}
            tierTotal={tierHistoryBundle.total}
            notificationRows={ctvNotificationsBundle.rows}
            notificationTotal={ctvNotificationsBundle.total}
            tiersForFilter={membershipTiersForAdmin.map((t) => ({
              id: t.id,
              name: t.name,
              code: t.code,
            }))}
            revenueQuery={rrQuery}
            revenueTierId={rrTier}
            revenueFrom={rrFrom}
            revenueTo={rrTo}
            tierQuery={thQuery}
            tierFilterId={thTier}
            tierFrom={thFrom}
            tierTo={thTo}
            notificationQuery={ntQuery}
            notificationType={ntType}
            notificationFrom={ntFrom}
            notificationTo={ntTo}
          />
        </Suspense>
      ) : null}

      {activeTab === "huong-dan" ? (
        <AffiliateAdminGuide
          affiliateEnabled={settings.affiliateEnabled}
          commissionRate={settings.commissionRate}
          payoutThreshold={settings.payoutThreshold}
          cookieDuration={settings.cookieDuration}
          attributionRule={settings.attributionRule}
          rewardPointEnabled={settings.rewardPointEnabled}
          withdrawalEnabled={settings.withdrawalEnabled}
          ctvGuideContent={settings.ctvGuideContent}
        />
      ) : null}

    </main>
  );
}
