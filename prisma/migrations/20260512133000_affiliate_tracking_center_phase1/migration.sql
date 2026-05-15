-- Phase 1: Tracking center — pixel integrations, attribution, ingest logs, PAGE_VIEW event.
-- Chạy một lần trên PostgreSQL. Idempotent nhẹ cho enum / type.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AffiliateTrafficEventType' AND e.enumlabel = 'PAGE_VIEW'
  ) THEN
    ALTER TYPE "AffiliateTrafficEventType" ADD VALUE 'PAGE_VIEW';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "AffiliatePixelProvider" AS ENUM ('TIKTOK_PIXEL', 'META_PIXEL', 'GA4', 'GTM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AffiliatePixelConnectionStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliatePixelIntegration" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "provider" "AffiliatePixelProvider" NOT NULL,
    "externalPixelId" VARCHAR(120),
    "status" "AffiliatePixelConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastEventAt" TIMESTAMP(3),
    "lastHealthAt" TIMESTAMP(3),
    "healthScore" INTEGER,
    "healthMessage" VARCHAR(500),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliatePixelIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePixelIntegration_affiliateProfileId_provider_key"
  ON "AffiliatePixelIntegration"("affiliateProfileId", "provider");
CREATE INDEX IF NOT EXISTS "AffiliatePixelIntegration_affiliateProfileId_status_idx"
  ON "AffiliatePixelIntegration"("affiliateProfileId", "status");
CREATE INDEX IF NOT EXISTS "AffiliatePixelIntegration_affiliateProfileId_updatedAt_idx"
  ON "AffiliatePixelIntegration"("affiliateProfileId", "updatedAt");

DO $$ BEGIN
  ALTER TABLE "AffiliatePixelIntegration"
    ADD CONSTRAINT "AffiliatePixelIntegration_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateAttribution" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "sessionId" VARCHAR(80),
    "model" VARCHAR(32) NOT NULL DEFAULT 'last_click',
    "source" VARCHAR(120),
    "weight" DECIMAL(8,5) NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateAttribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AffiliateAttribution_affiliateProfileId_createdAt_idx"
  ON "AffiliateAttribution"("affiliateProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateAttribution_orderId_idx" ON "AffiliateAttribution"("orderId");
CREATE INDEX IF NOT EXISTS "AffiliateAttribution_sessionId_idx" ON "AffiliateAttribution"("sessionId");

DO $$ BEGIN
  ALTER TABLE "AffiliateAttribution"
    ADD CONSTRAINT "AffiliateAttribution_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateTrackingIngestLog" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT,
    "route" VARCHAR(160) NOT NULL,
    "eventType" VARCHAR(64),
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipHash" VARCHAR(64),
    "message" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateTrackingIngestLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AffiliateTrackingIngestLog_affiliateProfileId_createdAt_idx"
  ON "AffiliateTrackingIngestLog"("affiliateProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateTrackingIngestLog_createdAt_idx" ON "AffiliateTrackingIngestLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateTrackingIngestLog_success_createdAt_idx"
  ON "AffiliateTrackingIngestLog"("success", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AffiliateTrackingIngestLog"
    ADD CONSTRAINT "AffiliateTrackingIngestLog_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
