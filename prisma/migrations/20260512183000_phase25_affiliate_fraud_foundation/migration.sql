-- Phase 2.5 — Affiliate fraud foundation (cases, signals, scores, actions, profile gates)

CREATE TYPE "AffiliateFraudTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "AffiliateFraudCaseStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE TYPE "AffiliateFraudCaseEntity" AS ENUM ('PROFILE', 'ORDER', 'SESSION', 'CAMPAIGN', 'SOURCE');

CREATE TYPE "AffiliateFraudActionType" AS ENUM (
  'SOFT_FLAG',
  'DISPATCH_SUPPRESS',
  'COMMISSION_SOFT_HOLD',
  'ATTRIBUTION_NOTE',
  'QUARANTINE_MARK',
  'REVIEW_START',
  'DISMISS',
  'ADMIN_NOTE'
);

ALTER TABLE "AffiliateProfile"
  ADD COLUMN "fraudScoreTier" "AffiliateFraudTier" NOT NULL DEFAULT 'LOW',
  ADD COLUMN "fraudDispatchHoldUntil" TIMESTAMP(3),
  ADD COLUMN "fraudCommissionSoftHold" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AffiliateFraudCase" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "entityType" "AffiliateFraudCaseEntity" NOT NULL DEFAULT 'PROFILE',
  "entityKey" VARCHAR(180),
  "title" VARCHAR(200) NOT NULL,
  "status" "AffiliateFraudCaseStatus" NOT NULL DEFAULT 'OPEN',
  "tier" "AffiliateFraudTier" NOT NULL DEFAULT 'LOW',
  "metadata" JSONB,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByAdminId" TEXT,
  CONSTRAINT "AffiliateFraudCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateFraudSignal" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "tier" "AffiliateFraudTier" NOT NULL DEFAULT 'MEDIUM',
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateFraudSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateFraudScore" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "caseId" TEXT,
  "scope" VARCHAR(32) NOT NULL,
  "scopeKey" VARCHAR(180),
  "numericScore" INTEGER NOT NULL,
  "tier" "AffiliateFraudTier" NOT NULL,
  "confidence" DECIMAL(4,3) NOT NULL,
  "breakdown" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateFraudScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateFraudAction" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "caseId" TEXT,
  "actionType" "AffiliateFraudActionType" NOT NULL,
  "payload" JSONB,
  "adminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateFraudAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AffiliateFraudCase_affiliateProfileId_status_openedAt_idx" ON "AffiliateFraudCase" ("affiliateProfileId", "status", "openedAt");
CREATE INDEX "AffiliateFraudCase_tier_openedAt_idx" ON "AffiliateFraudCase" ("tier", "openedAt");

CREATE INDEX "AffiliateFraudSignal_caseId_createdAt_idx" ON "AffiliateFraudSignal" ("caseId", "createdAt");

CREATE INDEX "AffiliateFraudScore_affiliateProfileId_createdAt_idx" ON "AffiliateFraudScore" ("affiliateProfileId", "createdAt");

CREATE INDEX "AffiliateFraudAction_affiliateProfileId_createdAt_idx" ON "AffiliateFraudAction" ("affiliateProfileId", "createdAt");

ALTER TABLE "AffiliateFraudCase"
  ADD CONSTRAINT "AffiliateFraudCase_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudCase"
  ADD CONSTRAINT "AffiliateFraudCase_resolvedByAdminId_fkey"
  FOREIGN KEY ("resolvedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudSignal"
  ADD CONSTRAINT "AffiliateFraudSignal_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "AffiliateFraudCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudScore"
  ADD CONSTRAINT "AffiliateFraudScore_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudScore"
  ADD CONSTRAINT "AffiliateFraudScore_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "AffiliateFraudCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudAction"
  ADD CONSTRAINT "AffiliateFraudAction_affiliateProfileId_fkey"
  FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudAction"
  ADD CONSTRAINT "AffiliateFraudAction_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "AffiliateFraudCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateFraudAction"
  ADD CONSTRAINT "AffiliateFraudAction_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
