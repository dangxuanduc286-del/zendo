/** Phase 2.1 — shared contract for anomaly engine + UI + future AI scoring. */

export type AlertSeverity = "info" | "warning" | "critical";

export type OpsAlertGroup = "traffic" | "conversion" | "infra" | "pixel" | "fraud" | "queue";

/**
 * Normalized alert for API + UI.
 * `id` stable per rule+window so client can dedupe / ack / cooldown.
 */
export type OpsAlertV1 = {
  id: string;
  severity: AlertSeverity;
  group: OpsAlertGroup;
  title: string;
  detail: string;
  ts: number;
  /** Heuristic 0–100; future: replace/augment with `ai.score`. */
  score?: number;
  /** Future AI / forecasting hooks — keep small JSON-safe maps. */
  ai?: {
    version?: 1;
    /** Feature vector for offline training / model handoff. */
    features?: Record<string, number>;
  };
};

export type OpsRollingWindowKey = "1m" | "5m" | "15m" | "1h";

/** Count buckets computed server-side (no raw events on wire). */
export type OpsRollingCounts = {
  now: number;
  /** `redis` = minute-bucket counters (worker); `db` = Prisma fallback. */
  source?: "redis" | "db";
  clicks1m: number;
  clicks1mBaseline: number;
  clicks5m: number;
  clicks5mBaseline: number;
  clicks15m: number;
  clicks15mBaseline: number;
  conv1m: number;
  conv1mBaseline: number;
  conv5m: number;
  conv5mBaseline: number;
  conv15m: number;
  conv15mBaseline: number;
  clicks1h: number;
  clicks1hBaseline: number;
  conv1h: number;
  conv1hBaseline: number;
  /** Revenue in minor units (e.g. cents) for paid rows in the window. */
  revenue5mMinor: number;
  revenue5mBaselineMinor: number;
  revenue1hMinor: number;
  /** High-signal traffic types for fraud heuristics. */
  clicks5mAffiliateClick: number;
  sessions5mEstimate: number;
  /** HyperLogLog union (Redis) — 0 when DB fallback. */
  distinctIp5mEstimate: number;
  rollMeta?: {
    lastIncrAtMs: number | null;
    readAtMs: number;
    writerLagMs: number | null;
    lastGlobalTickMs: number | null;
  } | null;
};

export type OpsPixelHealthRow = {
  provider: string;
  status: string;
  lastEventAt: string | null;
  lastHealthAt: string | null;
};
