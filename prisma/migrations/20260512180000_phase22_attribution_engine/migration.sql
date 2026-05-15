-- Phase 2.2: Production attribution engine — conversion match, touches, campaign/source chains.

DO $$ BEGIN
  CREATE TYPE "AffiliateConversionMatchState" AS ENUM (
    'MATCHED',
    'PARTIAL_MATCH',
    'UNATTRIBUTED',
    'SUSPICIOUS',
    'DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateConversionMatch" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "orderId" VARCHAR(64) NOT NULL,
  "sessionId" VARCHAR(80),
  "visitorKey" VARCHAR(120),
  "state" "AffiliateConversionMatchState" NOT NULL,
  "winningModel" VARCHAR(32) NOT NULL DEFAULT 'last_click',
  "fingerprint" VARCHAR(64) NOT NULL,
  "touchCount" INTEGER NOT NULL DEFAULT 0,
  "window1hTouches" INTEGER NOT NULL DEFAULT 0,
  "window24hTouches" INTEGER NOT NULL DEFAULT 0,
  "window7dTouches" INTEGER NOT NULL DEFAULT 0,
  "window30dTouches" INTEGER NOT NULL DEFAULT 0,
  "duplicatePaidHits" INTEGER NOT NULL DEFAULT 0,
  "selfReferralRisk" BOOLEAN NOT NULL DEFAULT false,
  "commissionMinor" INTEGER,
  "revenueMinor" INTEGER,
  "anchorAt" TIMESTAMP(3),
  "signals" JSONB,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replayVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "AffiliateConversionMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateConversionMatch_affiliateProfileId_orderId_key"
  ON "AffiliateConversionMatch"("affiliateProfileId", "orderId");
CREATE INDEX IF NOT EXISTS "AffiliateConversionMatch_affiliateProfileId_state_resolvedAt_idx"
  ON "AffiliateConversionMatch"("affiliateProfileId", "state", "resolvedAt");
CREATE INDEX IF NOT EXISTS "AffiliateConversionMatch_affiliateProfileId_resolvedAt_idx"
  ON "AffiliateConversionMatch"("affiliateProfileId", "resolvedAt");
CREATE INDEX IF NOT EXISTS "AffiliateConversionMatch_state_resolvedAt_idx"
  ON "AffiliateConversionMatch"("state", "resolvedAt");

DO $$ BEGIN
  ALTER TABLE "AffiliateConversionMatch"
    ADD CONSTRAINT "AffiliateConversionMatch_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateConversionMatch"
    ADD CONSTRAINT "AffiliateConversionMatch_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateAttributionTouch" (
  "id" TEXT NOT NULL,
  "conversionMatchId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "trafficEventId" TEXT,
  "touchedAt" TIMESTAMP(3) NOT NULL,
  "eventType" VARCHAR(40) NOT NULL,
  "pathname" VARCHAR(512),
  "referrer" VARCHAR(1024),
  "utmSource" VARCHAR(120),
  "utmMedium" VARCHAR(120),
  "utmCampaign" VARCHAR(160),
  "subid" VARCHAR(120),
  "device" VARCHAR(60),
  "browser" VARCHAR(60),
  "productId" TEXT,
  "trackingLinkId" TEXT,
  CONSTRAINT "AffiliateAttributionTouch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateAttributionTouch_conversionMatchId_sequence_key"
  ON "AffiliateAttributionTouch"("conversionMatchId", "sequence");
CREATE INDEX IF NOT EXISTS "AffiliateAttributionTouch_conversionMatchId_idx"
  ON "AffiliateAttributionTouch"("conversionMatchId");

DO $$ BEGIN
  ALTER TABLE "AffiliateAttributionTouch"
    ADD CONSTRAINT "AffiliateAttributionTouch_conversionMatchId_fkey"
    FOREIGN KEY ("conversionMatchId") REFERENCES "AffiliateConversionMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateAttributionTouch"
    ADD CONSTRAINT "AffiliateAttributionTouch_trafficEventId_fkey"
    FOREIGN KEY ("trafficEventId") REFERENCES "AffiliateTrafficEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateCampaignChain" (
  "id" TEXT NOT NULL,
  "conversionMatchId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "campaignKey" VARCHAR(120),
  "label" VARCHAR(200),
  "metadata" JSONB,
  CONSTRAINT "AffiliateCampaignChain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateCampaignChain_conversionMatchId_position_key"
  ON "AffiliateCampaignChain"("conversionMatchId", "position");
CREATE INDEX IF NOT EXISTS "AffiliateCampaignChain_conversionMatchId_idx"
  ON "AffiliateCampaignChain"("conversionMatchId");

DO $$ BEGIN
  ALTER TABLE "AffiliateCampaignChain"
    ADD CONSTRAINT "AffiliateCampaignChain_conversionMatchId_fkey"
    FOREIGN KEY ("conversionMatchId") REFERENCES "AffiliateConversionMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateSourceChain" (
  "id" TEXT NOT NULL,
  "conversionMatchId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "utmSource" VARCHAR(120),
  "utmMedium" VARCHAR(120),
  "referrer" VARCHAR(512),
  "landingPath" VARCHAR(512),
  "metadata" JSONB,
  CONSTRAINT "AffiliateSourceChain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateSourceChain_conversionMatchId_position_key"
  ON "AffiliateSourceChain"("conversionMatchId", "position");
CREATE INDEX IF NOT EXISTS "AffiliateSourceChain_conversionMatchId_idx"
  ON "AffiliateSourceChain"("conversionMatchId");

DO $$ BEGIN
  ALTER TABLE "AffiliateSourceChain"
    ADD CONSTRAINT "AffiliateSourceChain_conversionMatchId_fkey"
    FOREIGN KEY ("conversionMatchId") REFERENCES "AffiliateConversionMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
