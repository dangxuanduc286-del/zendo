-- Phase 1.7 — ingest observability (latency, payload size, batch event count)
ALTER TABLE "AffiliateTrackingIngestLog" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER;
ALTER TABLE "AffiliateTrackingIngestLog" ADD COLUMN IF NOT EXISTS "payloadBytes" INTEGER;
ALTER TABLE "AffiliateTrackingIngestLog" ADD COLUMN IF NOT EXISTS "eventCount" INTEGER NOT NULL DEFAULT 1;
