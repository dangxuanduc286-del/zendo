-- Phase 1 — Affiliate Analytics Foundation
-- Manual migration (DB may not be available in local dev).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AffiliateTrafficEventType" AS ENUM (
    'AFFILIATE_CLICK',
    'PRODUCT_VIEW',
    'ADD_TO_CART',
    'CHECKOUT_STARTED',
    'CHECKOUT_COMPLETED',
    'ORDER_PAID',
    'ORDER_CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliateCampaign" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "utmSource" VARCHAR(120),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliateTrackingLink" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "campaignId" TEXT,
  "label" VARCHAR(180),
  "targetPathname" VARCHAR(512) NOT NULL,
  "utmSource" VARCHAR(120),
  "subid" VARCHAR(120),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateTrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliateRealtimeSession" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "sessionId" VARCHAR(80) NOT NULL,
  "visitorKey" VARCHAR(120),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstCountry" VARCHAR(8),
  "firstDevice" VARCHAR(60),
  "firstBrowser" VARCHAR(60),
  "firstOs" VARCHAR(60),
  "lastPathname" VARCHAR(512),
  "metadata" JSONB,
  CONSTRAINT "AffiliateRealtimeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliateTrafficEvent" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "customerId" TEXT,
  "sessionId" VARCHAR(80),
  "eventType" "AffiliateTrafficEventType" NOT NULL,
  "productId" TEXT,
  "orderId" TEXT,
  "revenue" DECIMAL(12,2),
  "commission" DECIMAL(12,2),
  "country" VARCHAR(8),
  "device" VARCHAR(60),
  "browser" VARCHAR(60),
  "os" VARCHAR(60),
  "referrer" VARCHAR(1024),
  "pathname" VARCHAR(512),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateTrafficEvent_pkey" PRIMARY KEY ("id")
);

-- Indices
CREATE INDEX IF NOT EXISTS "AffiliateCampaign_affiliateProfileId_createdAt_idx"
ON "AffiliateCampaign"("affiliateProfileId", "createdAt");

CREATE INDEX IF NOT EXISTS "AffiliateTrackingLink_affiliateProfileId_createdAt_idx"
ON "AffiliateTrackingLink"("affiliateProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateTrackingLink_campaignId_idx"
ON "AffiliateTrackingLink"("campaignId");
CREATE INDEX IF NOT EXISTS "AffiliateTrackingLink_isActive_idx"
ON "AffiliateTrackingLink"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateRealtimeSession_sessionId_key"
ON "AffiliateRealtimeSession"("sessionId");
CREATE INDEX IF NOT EXISTS "AffiliateRealtimeSession_affiliateProfileId_lastSeenAt_idx"
ON "AffiliateRealtimeSession"("affiliateProfileId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "AffiliateRealtimeSession_visitorKey_idx"
ON "AffiliateRealtimeSession"("visitorKey");

CREATE INDEX IF NOT EXISTS "AffiliateTrafficEvent_affiliateProfileId_createdAt_idx"
ON "AffiliateTrafficEvent"("affiliateProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateTrafficEvent_eventType_createdAt_idx"
ON "AffiliateTrafficEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AffiliateTrafficEvent_sessionId_idx"
ON "AffiliateTrafficEvent"("sessionId");
CREATE INDEX IF NOT EXISTS "AffiliateTrafficEvent_orderId_idx"
ON "AffiliateTrafficEvent"("orderId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "AffiliateCampaign"
    ADD CONSTRAINT "AffiliateCampaign_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrackingLink"
    ADD CONSTRAINT "AffiliateTrackingLink_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrackingLink"
    ADD CONSTRAINT "AffiliateTrackingLink_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "AffiliateCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateRealtimeSession"
    ADD CONSTRAINT "AffiliateRealtimeSession_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrafficEvent"
    ADD CONSTRAINT "AffiliateTrafficEvent_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrafficEvent"
    ADD CONSTRAINT "AffiliateTrafficEvent_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrafficEvent"
    ADD CONSTRAINT "AffiliateTrafficEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AffiliateTrafficEvent"
    ADD CONSTRAINT "AffiliateTrafficEvent_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

