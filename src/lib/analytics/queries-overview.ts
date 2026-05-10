import type { KhoangThoiGianAnalytics } from "./date-range";
import { soSanhChiSoAnalytics, taoKhoangKyTruocAnalytics } from "./compare";
import { truyVanTrafficAnalytics } from "./queries-traffic";
import { truyVanBusinessAnalytics } from "./queries-business";
import { truyVanFunnelAnalytics } from "./queries-funnel";

export interface TongQuanAnalytics {
  current: {
    traffic: Awaited<ReturnType<typeof truyVanTrafficAnalytics>>;
    business: Awaited<ReturnType<typeof truyVanBusinessAnalytics>>;
    funnel: Awaited<ReturnType<typeof truyVanFunnelAnalytics>>;
  };
  previous: {
    traffic: Awaited<ReturnType<typeof truyVanTrafficAnalytics>>;
    business: Awaited<ReturnType<typeof truyVanBusinessAnalytics>>;
    funnel: Awaited<ReturnType<typeof truyVanFunnelAnalytics>>;
  };
  compare: {
    totalVisits: ReturnType<typeof soSanhChiSoAnalytics>;
    orders: ReturnType<typeof soSanhChiSoAnalytics>;
    paidOrders: ReturnType<typeof soSanhChiSoAnalytics>;
    revenue: ReturnType<typeof soSanhChiSoAnalytics>;
  };
}

export async function truyVanTongQuanAnalytics(
  range: KhoangThoiGianAnalytics,
): Promise<TongQuanAnalytics> {
  const previousRange = taoKhoangKyTruocAnalytics(range);

  const currentTraffic = await truyVanTrafficAnalytics(range);
  const previousTraffic = await truyVanTrafficAnalytics(previousRange);

  const [currentBusiness, previousBusiness, currentFunnel, previousFunnel] = await Promise.all([
    truyVanBusinessAnalytics(range, currentTraffic.totalVisits),
    truyVanBusinessAnalytics(previousRange, previousTraffic.totalVisits),
    truyVanFunnelAnalytics(range),
    truyVanFunnelAnalytics(previousRange),
  ]);

  return {
    current: {
      traffic: currentTraffic,
      business: currentBusiness,
      funnel: currentFunnel,
    },
    previous: {
      traffic: previousTraffic,
      business: previousBusiness,
      funnel: previousFunnel,
    },
    compare: {
      totalVisits: soSanhChiSoAnalytics(
        currentTraffic.totalVisits,
        previousTraffic.totalVisits,
      ),
      orders: soSanhChiSoAnalytics(currentBusiness.orders, previousBusiness.orders),
      paidOrders: soSanhChiSoAnalytics(
        currentBusiness.paidOrders,
        previousBusiness.paidOrders,
      ),
      revenue: soSanhChiSoAnalytics(currentBusiness.revenue, previousBusiness.revenue),
    },
  };
}

