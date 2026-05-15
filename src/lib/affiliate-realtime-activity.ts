import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getAffiliateRealtimeMetrics } from "@/lib/affiliate-realtime-metrics";
import { classifyTrafficSourcePublic } from "@/lib/affiliate-traffic-analytics";

/** Payload JSON realtime (đồng bộ route `/analytics/realtime` + bundle overview). */
export type AffiliateRealtimeActivityPayload = {
  ok: true;
  activeVisitors: number;
  realtime: {
    onlineVisitors: number;
    activeSessions: number;
    clicksLast5m: number;
    conversionsLast5m: number;
    revenueLast5m: number;
  };
  recentClicks: Array<{
    id: string;
    createdAt: string;
    pathname: string | null;
    referrer: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    trafficSource: string;
  }>;
  recentConversions: Array<{
    id: string;
    createdAt: string;
    orderId: string | null;
    revenue: number;
    commission: number;
    pathname: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    code: string;
    createdAt: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
  }>;
};

export async function getAffiliateRealtimeActivityPayload(args: {
  db: PrismaClient;
  affiliateProfileId: string;
}): Promise<AffiliateRealtimeActivityPayload> {
  const since = new Date(Date.now() - 30 * 60_000);
  const [realtime, recentClicks, recentConversions, recentOrders] = await Promise.all([
    getAffiliateRealtimeMetrics({ db: args.db, affiliateProfileId: args.affiliateProfileId }),
    args.db.affiliateTrafficEvent.findMany({
      where: { affiliateProfileId: args.affiliateProfileId, eventType: "AFFILIATE_CLICK", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        createdAt: true,
        pathname: true,
        referrer: true,
        country: true,
        device: true,
        browser: true,
        os: true,
        metadata: true,
      },
    }),
    args.db.affiliateTrafficEvent.findMany({
      where: { affiliateProfileId: args.affiliateProfileId, eventType: "ORDER_PAID", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, createdAt: true, orderId: true, revenue: true, commission: true, pathname: true },
    }),
    args.db.order.findMany({
      where: { affiliateProfileId: args.affiliateProfileId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, code: true, createdAt: true, totalAmount: true, paymentStatus: true, orderStatus: true },
    }),
  ]);

  return {
    ok: true,
    activeVisitors: realtime.onlineVisitors,
    realtime: {
      onlineVisitors: realtime.onlineVisitors,
      activeSessions: realtime.activeSessions,
      clicksLast5m: realtime.clicksLast5m,
      conversionsLast5m: realtime.conversionsLast5m,
      revenueLast5m: realtime.revenueLast5m,
    },
    recentClicks: recentClicks.map((r) => {
      const meta = r.metadata as Record<string, unknown> | null;
      const utm = typeof meta?.utm_source === "string" ? meta.utm_source : null;
      const trafficSource = classifyTrafficSourcePublic(r.referrer, utm);
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        pathname: r.pathname,
        referrer: r.referrer,
        country: r.country,
        device: r.device,
        browser: r.browser,
        os: r.os,
        trafficSource,
      };
    }),
    recentConversions: recentConversions.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      orderId: r.orderId,
      revenue: Number(r.revenue ?? 0),
      commission: Number(r.commission ?? 0),
      pathname: r.pathname,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      code: o.code,
      createdAt: o.createdAt.toISOString(),
      totalAmount: Number(o.totalAmount),
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
    })),
  };
}
