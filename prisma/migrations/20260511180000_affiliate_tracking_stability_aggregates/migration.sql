-- Phase 6: affiliate analytics aggregates + session touch cookie support (touch set by app, not DB)

CREATE TABLE "AffiliateHourlyAggregate" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "hourStart" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueSessions" INTEGER NOT NULL DEFAULT 0,
    "orderPaidCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateHourlyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateHourlyAggregate_affiliateProfileId_hourStart_key"
  ON "AffiliateHourlyAggregate"("affiliateProfileId", "hourStart");

CREATE INDEX "AffiliateHourlyAggregate_hourStart_idx" ON "AffiliateHourlyAggregate"("hourStart");

ALTER TABLE "AffiliateHourlyAggregate"
  ADD CONSTRAINT "AffiliateHourlyAggregate_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AffiliateDailyAggregate" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "orderPaidCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateDailyAggregate_affiliateProfileId_dayStart_key"
  ON "AffiliateDailyAggregate"("affiliateProfileId", "dayStart");

CREATE INDEX "AffiliateDailyAggregate_dayStart_idx" ON "AffiliateDailyAggregate"("dayStart");

ALTER TABLE "AffiliateDailyAggregate"
  ADD CONSTRAINT "AffiliateDailyAggregate_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
