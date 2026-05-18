"use client";

import { useMemo } from "react";
import type { StorefrontAffiliateDashboardData } from "@/lib/storefront-affiliate-dashboard";
import { computeCtvRankRevenueFromOrders } from "@/lib/ctv/ctv-rank";

type AffDashSlice = {
  data: StorefrontAffiliateDashboardData | null;
  loading: boolean;
};

/** Doanh thu rank CTV — ưu tiên aggregate API, fallback tính từ danh sách đơn gần đây. */
export function useCtvRankRevenue(affDash: AffDashSlice): { totalRevenue: number; loading: boolean } {
  return useMemo(() => {
    const loading = affDash.loading && !affDash.data;
    const summary = affDash.data?.summary;
    if (summary?.qualifiedReferralRevenue != null) {
      return { totalRevenue: summary.qualifiedReferralRevenue, loading };
    }
    const orders = affDash.data?.referredOrders ?? [];
    const totalRevenue = computeCtvRankRevenueFromOrders(
      orders.map((o) => ({
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
      })),
    );
    return { totalRevenue, loading };
  }, [affDash.data, affDash.loading]);
}
