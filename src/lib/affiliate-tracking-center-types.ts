import type { AffiliatePixelConnectionStatus, AffiliatePixelProvider } from "@prisma/client";

export type TrackingOverviewDto = {
  generatedAt: string;
  metrics: {
    activePixels: number;
    eventsToday: number;
    conversionsToday: number;
    trackingAccuracyPct: number;
    missingAttribution: number;
    realtimeSessions: number;
    clickToOrderMatchPct: number;
    pixelHealthScore: number | null;
  };
  pixels: Array<{
    provider: AffiliatePixelProvider;
    status: AffiliatePixelConnectionStatus;
    externalPixelId: string | null;
    lastEventAt: string | null;
    lastHealthAt: string | null;
    healthScore: number | null;
    healthMessage: string | null;
  }>;
  health: {
    status: "ok" | "degraded" | "unknown";
    ingestErrors1h: number;
    lastIngestAt: string | null;
  };
  /** Server-side CAPI dispatch (TikTok / Meta) — last 24h aggregates. */
  conversionDispatch: {
    jobs24h: {
      queued: number;
      sent: number;
      failed: number;
      dlq: number;
      skipped: number;
      processing: number;
    };
    byProvider: {
      TIKTOK: { sent: number; failed: number };
      META: { sent: number; failed: number };
    };
    avgLatencySentMs: number | null;
  };
};

export type TrackingRealtimeEventDto = {
  id: string;
  eventType: string;
  sessionId: string | null;
  pathname: string | null;
  device: string | null;
  createdAt: string;
  orderId: string | null;
};

export type TrackingHealthDto = {
  pixelRows: TrackingOverviewDto["pixels"];
  ingestErrors1h: number;
  sessionsStaleRatio: number;
  generatedAt: string;
};

export type TrackingIngestLogDto = {
  id: string;
  route: string;
  eventType: string | null;
  success: boolean;
  statusCode: number;
  createdAt: string;
  message: string | null;
  latencyMs: number | null;
  payloadBytes: number | null;
  eventCount: number;
};
