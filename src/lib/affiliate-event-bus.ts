import "server-only";

import { getRedis } from "@/lib/redis";

/** Internal Redis pub/sub channels (consumers: future SSE / workers / AI). */
export const AFFILIATE_TRACKING_BUS_CHANNELS = {
  received: "tracking.received",
  persisted: "tracking.persisted",
  attributed: "tracking.attributed",
  converted: "tracking.converted",
  /** Deterministic conversion match persisted — SSE pattern `tracking.attribution_resolved`. */
  attributionResolved: "tracking.attribution_resolved",
  /** Server-side TikTok / Meta CAPI dispatch outcome (no PII). */
  conversionDispatch: "tracking.conversion_dispatch",
  /** Fan-out for live dashboards / future SSE (decoupled from persistence write path). */
  realtime: "tracking.realtime",
  /** Fraud engine / policy alerts (no PII). */
  fraudAlert: "fraud.alert",
} as const;

export type AffiliateTrackingBusChannel = (typeof AFFILIATE_TRACKING_BUS_CHANNELS)[keyof typeof AFFILIATE_TRACKING_BUS_CHANNELS];

/**
 * Fire-and-forget pub/sub envelope. No subscribers required for correctness.
 * Prefix keeps keys distinct from BullMQ internal keys.
 */
export async function publishAffiliateTrackingBusEvent(
  channel: AffiliateTrackingBusChannel,
  payload: Record<string, unknown>,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const topic = `zendo:bus:${channel}`;
  const body = JSON.stringify({ ...payload, _ts: Date.now(), _channel: channel });
  try {
    await r.connect().catch(() => {});
    await r.publish(topic, body);
  } catch {
    /* never block ingest */
  }
}
