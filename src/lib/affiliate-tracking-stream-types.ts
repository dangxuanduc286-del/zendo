/**
 * Shared stream contract (client + server). No secrets: no orderId, sessionId, or raw traffic row ids.
 */
export const AFFILIATE_TRACKING_STREAM_CHANNELS = [
  "tracking.received",
  "tracking.persisted",
  "tracking.converted",
  "tracking.attributed",
  "tracking.attribution_resolved",
  "tracking.conversion_dispatch",
  "tracking.realtime",
  "fraud.alert",
] as const;

export type AffiliateTrackingStreamChannel = (typeof AFFILIATE_TRACKING_STREAM_CHANNELS)[number];

/** Normalized tick pushed over SSE as `event: tick`. */
export type AffiliateTrackingStreamTickV1 = {
  v: 1;
  /** Same as Redis bus channel name. */
  channel: AffiliateTrackingStreamChannel;
  ts: number;
  /** Traffic row type when relevant. */
  trafficEventType?: string | null;
  pathname?: string | null;
  /** Coarse hint for UI merge (no PII). */
  sink: "pipeline" | "traffic" | "conversion" | "attribution" | "pulse";
};

export type AffiliateTrackingStreamReadyV1 = {
  v: 1;
  redis: boolean;
  connectionId: string;
};
