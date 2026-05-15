export type AffiliateJobKind =
  | "AGGREGATE_HOURLY_WINDOW"
  | "AGGREGATE_DAILY_WINDOW"
  | "CLEANUP_REALTIME"
  | "CLEANUP_ORPHAN_EVENTS"
  | "CACHE_REFRESH_ALL"
  | "PURGE_OLD_RAW_EVENTS"
  | "EXPORT_FANOUT"
  | "NOTIFICATION_FANOUT"
  | "FRAUD_EVAL_PROFILE_LITE";

export type AffiliateJobStatus = "pending" | "delayed" | "running" | "completed" | "failed";

export type AffiliateJobRecord = {
  id: string;
  kind: AffiliateJobKind;
  status: AffiliateJobStatus;
  dedupeKey: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAt: number;
  createdAt: number;
  updatedAt: number;
  lastError: string | null;
  lastResult: unknown;
};
