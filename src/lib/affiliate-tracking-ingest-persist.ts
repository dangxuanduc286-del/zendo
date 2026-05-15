import "server-only";

import type { AffiliateTrafficEventType, PrismaClient } from "@prisma/client";
import { enqueueAffiliateBullJob } from "@/lib/affiliate-bullmq-queue";
import { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } from "@/lib/affiliate-event-bus";
import { affiliateTrafficDedupeWindowMs } from "@/lib/affiliate-event-dedupe";
import {
  enqueueTrackingAttributionJob,
  enqueueTrackingRealtimeJob,
} from "@/lib/affiliate-tracking-bullmq";
import type { AffiliateTrackPersistJobV1 } from "@/lib/affiliate-tracking-ingest-types";
import { redisAffiliateOpsRollIncr } from "@/lib/affiliate-ops-redis-rolling";
import { redisFraudIncrFraudClicks1m, redisFraudIncrSessionFlood5m } from "@/lib/affiliate-fraud-redis";
import { insertAffiliateTrafficEvent, upsertAffiliateRealtimeSession } from "@/lib/affiliate-tracking";


export type PersistAffiliateTrackResult =
  | { ok: true; mode: "inserted"; trafficEventId: string }
  | { ok: true; mode: "dedupe_skip" };

/**
 * Worker-side persist: DB dedupe → session → traffic row → bus → downstream queues.
 * Idempotent for Bull retries (dedupe window).
 */
export async function processAffiliateTrackPersistJob(args: {
  db: PrismaClient;
  payload: AffiliateTrackPersistJobV1;
}): Promise<PersistAffiliateTrackResult> {
  const p = args.payload;
  const nowMs = Date.now();
  const sessionId = p.sessionId;
  const pathname = p.snap.pathname;
  const dedupeMs = affiliateTrafficDedupeWindowMs(p.eventType);
  const dupSince = new Date(nowMs - dedupeMs);
  const recentDup = await args.db.affiliateTrafficEvent.findFirst({
    where: {
      affiliateProfileId: p.affiliateProfileId,
      sessionId,
      eventType: p.eventType,
      productId: p.productId?.trim().slice(0, 64) || null,
      orderId: p.orderId,
      pathname,
      createdAt: { gte: dupSince },
    },
    select: { id: true },
  });
  if (recentDup) {    return { ok: true, mode: "dedupe_skip" };
  }

  await upsertAffiliateRealtimeSession({
    db: args.db,
    affiliateProfileId: p.affiliateProfileId,
    sessionId: sessionId ?? p.snap.sessionId,
    visitorKey: p.visitorKey,
    country: p.snap.country,
    device: p.snap.device,
    browser: p.snap.browser,
    os: p.snap.os,
    pathname: p.snap.pathname,
    metadata: {
      utm_source: p.snap.utmSource,
      utm_medium: p.safeMeta.utm_medium,
      utm_campaign: p.safeMeta.utm_campaign,
      subid: p.snap.subid,
      ...(p.snap.ip ? { ip: p.snap.ip } : {}),
    },
  });

  const { id: trafficEventId } = await insertAffiliateTrafficEvent({
    db: args.db,
    affiliateProfileId: p.affiliateProfileId,
    customerId: null,
    sessionId,
    eventType: p.eventType,
    productId: p.productId?.trim().slice(0, 64) || null,
    orderId: p.orderId,
    revenue: p.revenue,
    commission: p.commission,
    country: p.snap.country,
    device: p.snap.device,
    browser: p.snap.browser,
    os: p.snap.os,
    referrer: p.snap.referrer,
    pathname: p.snap.pathname,
    trackingLinkId: p.resolvedTrackingLinkId,
    metadata: {
      utm_source: p.snap.utmSource,
      utm_medium: p.safeMeta.utm_medium,
      utm_campaign: p.safeMeta.utm_campaign,
      utm_term: p.safeMeta.utm_term,
      utm_content: p.safeMeta.utm_content,
      subid: p.snap.subid,
      affiliateRef: p.ref.slice(0, 64),
      ...(p.snap.ip ? { ip: p.snap.ip } : {}),
      ...p.safeMeta,
    },
  });

  void redisAffiliateOpsRollIncr({
    affiliateProfileId: p.affiliateProfileId,
    eventType: p.eventType,
    sessionId,
    revenue: p.revenue,
    ip: p.snap.ip ?? null,
    nowMs,
  });

  if (p.eventType === "AFFILIATE_CLICK") {
    void redisFraudIncrFraudClicks1m({ affiliateProfileId: p.affiliateProfileId, nowMs });
  }
  void redisFraudIncrSessionFlood5m({ affiliateProfileId: p.affiliateProfileId, sessionId, nowMs });

  void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.persisted, {
    affiliateProfileId: p.affiliateProfileId,
    eventType: p.eventType,
    sessionId,
    trafficEventId,
    orderId: p.orderId,
  });

  if (p.eventType === "ORDER_PAID" && p.orderId) {
    void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.converted, {
      affiliateProfileId: p.affiliateProfileId,
      orderId: p.orderId,
      trafficEventId,
    });
    void enqueueTrackingAttributionJob({
      payload: {
        v: 1,
        affiliateProfileId: p.affiliateProfileId,
        orderId: p.orderId,
        sessionId,
        lastSource: p.snap.utmSource,
      },
    });
  }

  void enqueueTrackingRealtimeJob({
    payload: {
      v: 1,
      affiliateProfileId: p.affiliateProfileId,
      eventType: p.eventType,
      sessionId,
      pathname: p.snap.pathname,
      trafficEventId,
    },
  });

  const hourBucket = Math.floor(nowMs / 3_600_000);
  void enqueueAffiliateBullJob({
    kind: "AGGREGATE_HOURLY_WINDOW",
    payload: { hours: 72 },
    dedupeKey: `track-ingest-hourly-${p.affiliateProfileId}-${hourBucket}`,
    fallbackId: `agg-h-${p.affiliateProfileId}-${hourBucket}`,
  }).catch(() => {});

  void enqueueAffiliateBullJob({
    kind: "FRAUD_EVAL_PROFILE_LITE",
    payload: { affiliateProfileId: p.affiliateProfileId },
    dedupeKey: `fraud-eval-${p.affiliateProfileId}-${hourBucket}`,
    fallbackId: `fraud-eval-${p.affiliateProfileId}-${hourBucket}`,
  }).catch(() => {});  return { ok: true, mode: "inserted", trafficEventId };
}

export type AffiliateTrackValidatedPersistInput = {
  affiliateProfileId: string;
  ref: string;
  eventType: AffiliateTrafficEventType;
  sessionId: string | null;
  visitorKey: string | null;
  productId: string | null;
  orderId: string | null;
  revenue: number | null;
  commission: number | null;
  snap: AffiliateTrackPersistJobV1["snap"];
  safeMeta: Record<string, unknown>;
  resolvedTrackingLinkId: string | null;
};

export function buildPersistJobV1(
  input: AffiliateTrackValidatedPersistInput,
  idempotencyKey: string,
): AffiliateTrackPersistJobV1 {
  return {
    v: 1,
    idempotencyKey,
    affiliateProfileId: input.affiliateProfileId,
    ref: input.ref,
    eventType: input.eventType,
    sessionId: input.sessionId,
    visitorKey: input.visitorKey,
    productId: input.productId,
    orderId: input.orderId,
    revenue: input.revenue,
    commission: input.commission,
    snap: input.snap,
    safeMeta: input.safeMeta,
    resolvedTrackingLinkId: input.resolvedTrackingLinkId,
  };
}
