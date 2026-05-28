"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomerAccountSettings } from "./settings";
import { useAffiliateDashboardApi } from "../components/storefront/use-affiliate-dashboard-api";
import { useCtvAffiliateMetrics } from "./ctv/use-ctv-affiliate-metrics";
import { conversionPercentFromAnalyticsOverview } from "./ctv/ctv-conversion-month-kpi";

export type AffiliateSubTab =
  | "overview"
  | "orders"
  | "earnings"
  | "withdrawal"
  | "links"
  | "revenueRewards"
  | "history"
  | "guide";

export const AFFILIATE_DASH_SUB_TAB_KEYS = new Set<string>([
  "overview",
  "orders",
  "earnings",
  "withdrawal",
  "links",
  "revenueRewards",
  "history",
  "guide",
]);

export type AffiliateAccountDashboardSource = {
  affiliate: {
    refCode: string;
    referralUrl: string;
    isActive: boolean;
    hasProfile: boolean;
    totalClicks: number;
    referredOrders: number;
  };
  stats: {
    rewardPoints: number;
    affiliateCommission: number;
  };
};

function isPublicOrigin(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return !text.includes("localhost") && !text.includes("127.0.0.1");
}

export function buildAffiliateReferralUrl(
  data: AffiliateAccountDashboardSource,
  runtimeOrigin = "",
): string {
  const referralBaseOrigin = (() => {
    if (isPublicOrigin(data.affiliate.referralUrl)) {
      try {
        return new URL(data.affiliate.referralUrl).origin;
      } catch {
        return "";
      }
    }
    if (runtimeOrigin) return runtimeOrigin;
    return "https://www.zendo.vn";
  })();
  return data.affiliate.refCode
    ? `${referralBaseOrigin}/?ref=${encodeURIComponent(data.affiliate.refCode)}`
    : "";
}

export function useAffiliateAccountDashboardModel(
  accountSettings: CustomerAccountSettings,
  data: AffiliateAccountDashboardSource,
  options?: {
    dashboardEnabled?: boolean;
    metricsEnabled?: boolean;
    runDashboardLifecycle?: boolean;
  },
) {
  const [runtimeOrigin, setRuntimeOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && isPublicOrigin(window.location.origin)) {
      setRuntimeOrigin(window.location.origin);
    }
  }, []);
  const referralUrl = useMemo(() => buildAffiliateReferralUrl(data, runtimeOrigin), [data, runtimeOrigin]);

  const affDash = useAffiliateDashboardApi(Boolean(data.affiliate.hasProfile && (options?.dashboardEnabled ?? true)), {
    runLifecycle: options?.runDashboardLifecycle ?? true,
  });
  const ctvMetrics = useCtvAffiliateMetrics(
    Boolean(data.affiliate.hasProfile && data.affiliate.isActive && (options?.metricsEnabled ?? true)),
  );
  const s = affDash.data?.summary;
  const approvedCommission = s
    ? (s.commissionApprovedPool ?? (s.commissionAvailable ?? 0) + (s.revenueRewardWalletBalance ?? 0))
    : data.stats.affiliateCommission;
  const pendingCommission = s?.commissionPending ?? 0;
  const waitingReleaseCommission = s?.commissionWaitingRelease ?? 0;
  const paidCommission = s?.commissionPaid ?? 0;
  const cancelledCommission = s?.commissionCancelled ?? 0;
  const referralRevenueUi = s?.referralRevenue ?? 0;
  const totalClicksUi = s?.totalClicks ?? data.affiliate.totalClicks;
  const referredOrdersUi = s?.referredOrdersCount ?? data.affiliate.referredOrders;
  const withdrawableBalanceUi = s?.withdrawableBalance ?? 0;
  const conversionRatePending = ctvMetrics.loading && !ctvMetrics.monthOverview;
  const conversionRate = conversionPercentFromAnalyticsOverview(ctvMetrics.monthOverview, {
    pending: conversionRatePending,
  });

  const isAffiliateDataEmpty = s
    ? s.referredOrdersCount === 0 &&
      s.totalClicks === 0 &&
      s.commissionPending === 0 &&
      s.commissionWaitingRelease === 0 &&
      s.commissionAvailable === 0 &&
      s.referralRevenue === 0 &&
      data.stats.rewardPoints === 0
    : data.affiliate.totalClicks === 0 &&
      data.affiliate.referredOrders === 0 &&
      data.stats.affiliateCommission === 0 &&
      data.stats.rewardPoints === 0;

  const affiliateSubTabs: Array<{ key: AffiliateSubTab; label: string }> = [
    { key: "overview", label: "Trung tâm CTV" },
    { key: "links", label: "Tạo link" },
    { key: "orders", label: "Đơn phát sinh" },
    { key: "earnings", label: "Hoa hồng" },
    { key: "withdrawal", label: "Rút tiền" },
    { key: "revenueRewards", label: "Thưởng doanh thu" },
    { key: "history", label: "Lịch sử" },
    { key: "guide", label: "Hướng dẫn" },
  ].filter((row): row is { key: AffiliateSubTab; label: string } => {
    if (!data.affiliate.isActive) return true;
    if (row.key === "withdrawal" && !accountSettings.affiliateShowWithdrawals) return false;
    if (row.key === "guide" && !accountSettings.affiliateShowGuide) return false;
    return true;
  });

  const rewardRows: Array<{
    id: string;
    createdAt: string;
    points: number;
    status: string;
    reason: string;
  }> = data.stats.rewardPoints
    ? [
        {
          id: "reward-summary",
          createdAt: new Date().toISOString(),
          points: data.stats.rewardPoints,
          status: "AVAILABLE",
          reason: "Tổng điểm khả dụng",
        },
      ]
    : [];

  const guideTitle = accountSettings.affiliateGuideTitle || "Hướng dẫn chi tiết CTV / Affiliate";
  const guideIntro =
    accountSettings.affiliateGuideIntro ||
    "Làm theo từng bước để triển khai link giới thiệu hiệu quả và tuân thủ chính sách.";
  const guideStepsRaw = [
    accountSettings.affiliateGuideStep1,
    accountSettings.affiliateGuideStep2,
    accountSettings.affiliateGuideStep3,
    accountSettings.affiliateGuideStep4,
    accountSettings.affiliateGuideStep5,
    accountSettings.affiliateGuideStep6,
    accountSettings.affiliateGuideStep7,
    accountSettings.affiliateGuideStep8,
  ];
  const fallbackGuideSteps = [
    "Lấy link giới thiệu: vào Bộ tạo link giới thiệu, chọn loại link phù hợp và tạo link có mã ref cá nhân.",
    "Chia sẻ link đúng cách: chia sẻ qua Zalo, Facebook, TikTok, website hoặc nhóm khách hàng phù hợp.",
    "Khách bấm link và phát sinh đơn: hệ thống ghi nhận click/đơn hợp lệ theo mã ref, chỉ tính đơn đúng điều kiện.",
    "Theo dõi đơn giới thiệu: vào mục Đơn giới thiệu để theo dõi trạng thái đơn và hoa hồng dự kiến.",
    "Theo dõi hoa hồng & điểm thưởng: xem trạng thái chờ duyệt, đã duyệt, đã thanh toán.",
    "Yêu cầu rút tiền: vào mục Yêu cầu rút tiền, kiểm tra mức rút tối thiểu và gửi yêu cầu khi được kích hoạt.",
    "Quy định/lưu ý: không spam, không tự mua gian lận, chỉ tính đơn hợp lệ; vi phạm có thể bị khóa CTV.",
    "Cần hỗ trợ: dùng tab Hỗ trợ, Zalo (nếu cửa hàng cấu hình) hoặc link hướng dẫn từ cài đặt quản trị.",
  ];
  const guideSteps = guideStepsRaw.every((item) => typeof item === "string" && item.trim())
    ? (guideStepsRaw as string[]).map((item) => item.trim())
    : fallbackGuideSteps;

  const showWithdrawable =
    Boolean(accountSettings.affiliateShowWithdrawals && affDash.data?.program.withdrawalEnabled);

  return {
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
  };
}
