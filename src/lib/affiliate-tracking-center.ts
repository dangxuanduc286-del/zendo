import "server-only";

import type { AffiliatePixelConnectionStatus, AffiliatePixelProvider } from "@prisma/client";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import type {
  TrackingHealthDto,
  TrackingIngestLogDto,
  TrackingOverviewDto,
  TrackingRealtimeEventDto,
} from "./affiliate-tracking-center-types";

export type {
  TrackingHealthDto,
  TrackingIngestLogDto,
  TrackingOverviewDto,
  TrackingRealtimeEventDto,
} from "./affiliate-tracking-center-types";

export const TRACKING_PIXEL_PROVIDERS: readonly AffiliatePixelProvider[] = [
  "TIKTOK_PIXEL",
  "META_PIXEL",
  "GA4",
  "GTM",
] as const;

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function getAffiliateTrackingOverview(affiliateProfileId: string): Promise<TrackingOverviewDto> {
  const day = startOfUtcDay();
  const since15m = minutesAgo(15);

  const [
    pixelsDb,
    eventsToday,
    conversionsToday,
    affiliateClicksToday,
    sessionsRecent,
    missingAttr,
    ingestErrors1h,
    lastFail,
    capiJobs24h,
  ] = await Promise.all([
    db.affiliatePixelIntegration.findMany({
      where: { affiliateProfileId },
      select: {
        provider: true,
        status: true,
        externalPixelId: true,
        lastEventAt: true,
        lastHealthAt: true,
        healthScore: true,
        healthMessage: true,
      },
    }),
    db.affiliateTrafficEvent.count({
      where: { affiliateProfileId, createdAt: { gte: day } },
    }),
    db.affiliateTrafficEvent.count({
      where: { affiliateProfileId, createdAt: { gte: day }, eventType: "ORDER_PAID" },
    }),
    db.affiliateClick.count({
      where: { affiliateProfileId, createdAt: { gte: day } },
    }),
    db.affiliateRealtimeSession.count({
      where: { affiliateProfileId, lastSeenAt: { gte: since15m } },
    }),
    db.affiliateTrafficEvent.count({
      where: {
        affiliateProfileId,
        createdAt: { gte: day },
        eventType: "ORDER_PAID",
        sessionId: null,
      },
    }),
    db.affiliateTrackingIngestLog.count({
      where: {
        affiliateProfileId,
        success: false,
        createdAt: { gte: minutesAgo(60) },
      },
    }),
    db.affiliateTrackingIngestLog.findFirst({
      where: { affiliateProfileId, success: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.conversionDispatchJob.findMany({
      where: { affiliateProfileId, createdAt: { gte: hoursAgo(24) } },
      select: { status: true, provider: true, latencyMs: true },
    }),
  ]);

  const pixelMap = new Map(pixelsDb.map((p) => [p.provider, p]));
  const pixels = TRACKING_PIXEL_PROVIDERS.map((provider) => {
    const row = pixelMap.get(provider);
    return {
      provider,
      status: row?.status ?? ("DISCONNECTED" as const),
      externalPixelId: row?.externalPixelId ?? null,
      lastEventAt: row?.lastEventAt?.toISOString() ?? null,
      lastHealthAt: row?.lastHealthAt?.toISOString() ?? null,
      healthScore: row?.healthScore ?? null,
      healthMessage: row?.healthMessage ?? null,
    };
  });

  const activePixels = pixels.filter((p) => p.status === "CONNECTED").length;
  const scores = pixels.map((p) => p.healthScore).filter((n): n is number => typeof n === "number");
  const pixelHealthAvg =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const clicksDenom = affiliateClicksToday + 1;
  const clickToOrderMatchPct = Math.min(100, Math.round((conversionsToday / clicksDenom) * 100));
  const trackingAccuracyPct = Math.max(
    55,
    Math.min(100, 98 - Math.min(40, missingAttr * 12) - Math.min(15, ingestErrors1h * 3)),
  );

  const jobs24h = {
    queued: 0,
    sent: 0,
    failed: 0,
    dlq: 0,
    skipped: 0,
    processing: 0,
  };
  const byProvider = {
    TIKTOK: { sent: 0, failed: 0 },
    META: { sent: 0, failed: 0 },
  };
  const sentLatencies: number[] = [];
  for (const row of capiJobs24h) {
    if (row.status === "QUEUED") jobs24h.queued += 1;
    else if (row.status === "SENT") {
      jobs24h.sent += 1;
      if (row.latencyMs != null && row.latencyMs >= 0) sentLatencies.push(row.latencyMs);
    } else if (row.status === "FAILED") jobs24h.failed += 1;
    else if (row.status === "DLQ") jobs24h.dlq += 1;
    else if (row.status === "SKIPPED" || row.status === "DUPLICATE") jobs24h.skipped += 1;
    else if (row.status === "PROCESSING") jobs24h.processing += 1;

    if (row.status === "FAILED" || row.status === "DLQ") {
      if (row.provider === "TIKTOK") byProvider.TIKTOK.failed += 1;
      if (row.provider === "META") byProvider.META.failed += 1;
    }
    if (row.status === "SENT") {
      if (row.provider === "TIKTOK") byProvider.TIKTOK.sent += 1;
      if (row.provider === "META") byProvider.META.sent += 1;
    }
  }
  const avgLatencySentMs =
    sentLatencies.length === 0
      ? null
      : Math.round(sentLatencies.reduce((a, b) => a + b, 0) / sentLatencies.length);

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      activePixels,
      eventsToday,
      conversionsToday,
      trackingAccuracyPct,
      missingAttribution: missingAttr,
      realtimeSessions: sessionsRecent,
      clickToOrderMatchPct,
      pixelHealthScore: pixelHealthAvg,
    },
    pixels,
    health: {
      status: ingestErrors1h > 5 ? "degraded" : ingestErrors1h > 0 ? "degraded" : "ok",
      ingestErrors1h,
      lastIngestAt: lastFail?.createdAt.toISOString() ?? null,
    },
    conversionDispatch: {
      jobs24h,
      byProvider,
      avgLatencySentMs,
    },
  };
}

export async function getAffiliateTrackingRealtime(
  affiliateProfileId: string,
  take = 25,
): Promise<TrackingRealtimeEventDto[]> {
  const rows = await db.affiliateTrafficEvent.findMany({
    where: { affiliateProfileId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      eventType: true,
      sessionId: true,
      pathname: true,
      device: true,
      createdAt: true,
      orderId: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    sessionId: r.sessionId,
    pathname: r.pathname,
    device: r.device,
    createdAt: r.createdAt.toISOString(),
    orderId: r.orderId,
  }));
}

export async function getAffiliateTrackingHealth(affiliateProfileId: string): Promise<TrackingHealthDto> {
  const overview = await getAffiliateTrackingOverview(affiliateProfileId);
  const total = await db.affiliateRealtimeSession.count({
    where: { affiliateProfileId },
  });
  const stale = await db.affiliateRealtimeSession.count({
    where: { affiliateProfileId, lastSeenAt: { lt: minutesAgo(60) } },
  });
  const sessionsStaleRatio = total > 0 ? Math.round((stale / total) * 100) : 0;
  return {
    pixelRows: overview.pixels,
    ingestErrors1h: overview.health.ingestErrors1h,
    sessionsStaleRatio,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAffiliateTrackingIngestLogs(
  affiliateProfileId: string,
  args: { cursor?: string; take?: number },
): Promise<{ rows: TrackingIngestLogDto[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(args.take ?? 20, 1), 50);
  const rows = await db.affiliateTrackingIngestLog.findMany({
    where: { affiliateProfileId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      route: true,
      eventType: true,
      success: true,
      statusCode: true,
      createdAt: true,
      message: true,
      latencyMs: true,
      payloadBytes: true,
      eventCount: true,
    },
  });
  let nextCursor: string | null = null;
  let out = rows;
  if (rows.length > take) {
    nextCursor = rows[take - 1]!.id;
    out = rows.slice(0, take);
  }
  return {
    rows: out.map((r) => ({
      id: r.id,
      route: r.route,
      eventType: r.eventType,
      success: r.success,
      statusCode: r.statusCode,
      createdAt: r.createdAt.toISOString(),
      message: r.message,
      latencyMs: r.latencyMs,
      payloadBytes: r.payloadBytes,
      eventCount: r.eventCount,
    })),
    nextCursor,
  };
}

export function hashIpForLog(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function logAffiliateTrackingIngest(args: {
  affiliateProfileId: string | null;
  route: string;
  eventType?: string | null;
  success: boolean;
  statusCode: number;
  ip?: string | null;
  message?: string | null;
  latencyMs?: number | null;
  payloadBytes?: number | null;
  eventCount?: number | null;
}): Promise<void> {
  try {
    await db.affiliateTrackingIngestLog.create({
      data: {
        affiliateProfileId: args.affiliateProfileId,
        route: args.route.slice(0, 160),
        eventType: args.eventType?.slice(0, 64) ?? null,
        success: args.success,
        statusCode: args.statusCode,
        ipHash: hashIpForLog(args.ip ?? null),
        message: args.message?.slice(0, 500) ?? null,
        latencyMs: args.latencyMs ?? null,
        payloadBytes: args.payloadBytes ?? null,
        eventCount: args.eventCount != null && args.eventCount > 0 ? Math.min(args.eventCount, 10_000) : 1,
      },
    });
  } catch {
    /* không chặn request nếu log lỗi */
  }
}

export async function upsertAffiliatePixelIntegration(args: {
  affiliateProfileId: string;
  provider: AffiliatePixelProvider;
  status: AffiliatePixelConnectionStatus;
  externalPixelId?: string | null;
}): Promise<void> {
  const externalPixelId = args.externalPixelId?.trim().slice(0, 120) || null;
  const lastHealthAt = new Date();
  const healthScore = args.status === "CONNECTED" ? 95 : args.status === "PENDING" ? 70 : 40;
  const healthMessage =
    args.status === "PENDING"
      ? "Đang chờ xác minh pixel / tag."
      : args.status === "CONNECTED"
        ? "Kết nối ổn định (phase 1 — kiểm tra thủ công)."
        : null;

  await db.affiliatePixelIntegration.upsert({
    where: {
      affiliateProfileId_provider: {
        affiliateProfileId: args.affiliateProfileId,
        provider: args.provider,
      },
    },
    create: {
      affiliateProfileId: args.affiliateProfileId,
      provider: args.provider,
      status: args.status,
      externalPixelId,
      lastHealthAt,
      healthScore,
      healthMessage,
    },
    update: {
      status: args.status,
      externalPixelId,
      lastHealthAt,
      healthScore,
      healthMessage,
    },
  });
}
