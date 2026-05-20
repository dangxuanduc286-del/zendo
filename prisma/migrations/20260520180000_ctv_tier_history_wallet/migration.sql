-- CTV tier tracking + ví thưởng doanh thu denormalized
ALTER TABLE "AffiliateProfile" ADD COLUMN "currentCtvTierId" TEXT;
ALTER TABLE "AffiliateProfile" ADD COLUMN "revenueRewardWalletBalance" DECIMAL(14,0) NOT NULL DEFAULT 0;

CREATE INDEX "AffiliateProfile_currentCtvTierId_idx" ON "AffiliateProfile"("currentCtvTierId");

ALTER TABLE "AffiliateProfile" ADD CONSTRAINT "AffiliateProfile_currentCtvTierId_fkey" FOREIGN KEY ("currentCtvTierId") REFERENCES "CtvMembershipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CtvTierHistory" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "fromTierId" TEXT,
    "toTierId" TEXT NOT NULL,
    "revenue" DECIMAL(14,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtvTierHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CtvTierHistory_affiliateProfileId_idx" ON "CtvTierHistory"("affiliateProfileId");
CREATE INDEX "CtvTierHistory_toTierId_idx" ON "CtvTierHistory"("toTierId");
CREATE INDEX "CtvTierHistory_createdAt_idx" ON "CtvTierHistory"("createdAt");
CREATE INDEX "CtvTierHistory_affiliateProfileId_createdAt_idx" ON "CtvTierHistory"("affiliateProfileId", "createdAt");

ALTER TABLE "CtvTierHistory" ADD CONSTRAINT "CtvTierHistory_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtvTierHistory" ADD CONSTRAINT "CtvTierHistory_fromTierId_fkey" FOREIGN KEY ("fromTierId") REFERENCES "CtvMembershipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CtvTierHistory" ADD CONSTRAINT "CtvTierHistory_toTierId_fkey" FOREIGN KEY ("toTierId") REFERENCES "CtvMembershipTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill ví thưởng từ grant đã paid
UPDATE "AffiliateProfile" ap
SET "revenueRewardWalletBalance" = COALESCE((
  SELECT SUM(g."rewardAmount")
  FROM "CtvRevenueRewardGrant" g
  WHERE g."affiliateProfileId" = ap."id" AND g."paidAt" IS NOT NULL
), 0);
