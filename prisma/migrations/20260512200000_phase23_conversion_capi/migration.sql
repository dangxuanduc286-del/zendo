-- Phase 2.3: TikTok + Meta Conversion API dispatch jobs, provider audit, replay log.

DO $$ BEGIN
  CREATE TYPE "ConversionDispatchProvider" AS ENUM ('TIKTOK', 'META');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConversionDispatchJobStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'SENT',
    'FAILED',
    'DLQ',
    'SKIPPED',
    'DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConversionDispatchJob" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "orderId" VARCHAR(64) NOT NULL,
  "conversionMatchId" TEXT,
  "provider" "ConversionDispatchProvider" NOT NULL,
  "internalEvent" VARCHAR(40) NOT NULL,
  "payloadFingerprint" VARCHAR(64) NOT NULL,
  "dedupeKey" VARCHAR(180) NOT NULL,
  "status" "ConversionDispatchJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" VARCHAR(500),
  "httpStatus" INTEGER,
  "latencyMs" INTEGER,
  "payloadSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "ConversionDispatchJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConversionDispatchJob_dedupeKey_key" ON "ConversionDispatchJob"("dedupeKey");
CREATE INDEX IF NOT EXISTS "ConversionDispatchJob_affiliateProfileId_status_createdAt_idx"
  ON "ConversionDispatchJob"("affiliateProfileId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ConversionDispatchJob_provider_status_createdAt_idx"
  ON "ConversionDispatchJob"("provider", "status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ConversionDispatchJob"
    ADD CONSTRAINT "ConversionDispatchJob_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConversionDispatchJob"
    ADD CONSTRAINT "ConversionDispatchJob_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ConversionDispatchJob"
    ADD CONSTRAINT "ConversionDispatchJob_conversionMatchId_fkey"
    FOREIGN KEY ("conversionMatchId") REFERENCES "AffiliateConversionMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConversionProviderEvent" (
  "id" TEXT NOT NULL,
  "dispatchJobId" TEXT NOT NULL,
  "provider" "ConversionDispatchProvider" NOT NULL,
  "providerEventName" VARCHAR(64) NOT NULL,
  "httpStatus" INTEGER,
  "ok" BOOLEAN NOT NULL,
  "latencyMs" INTEGER,
  "responseSnippet" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversionProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConversionProviderEvent_dispatchJobId_idx" ON "ConversionProviderEvent"("dispatchJobId");

DO $$ BEGIN
  ALTER TABLE "ConversionProviderEvent"
    ADD CONSTRAINT "ConversionProviderEvent_dispatchJobId_fkey"
    FOREIGN KEY ("dispatchJobId") REFERENCES "ConversionDispatchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConversionReplayLog" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "orderId" VARCHAR(64) NOT NULL,
  "provider" "ConversionDispatchProvider",
  "reason" VARCHAR(160) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversionReplayLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConversionReplayLog_affiliateProfileId_createdAt_idx"
  ON "ConversionReplayLog"("affiliateProfileId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ConversionReplayLog"
    ADD CONSTRAINT "ConversionReplayLog_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
