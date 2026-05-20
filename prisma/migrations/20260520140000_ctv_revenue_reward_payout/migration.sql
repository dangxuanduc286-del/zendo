-- Rename amount -> rewardAmount; add payout fields and transaction ledger
ALTER TABLE "CtvRevenueRewardGrant" RENAME COLUMN "amount" TO "rewardAmount";

ALTER TABLE "CtvRevenueRewardGrant" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "CtvRevenueRewardGrant" ADD COLUMN "transactionId" TEXT;

CREATE TABLE "CtvRevenueRewardTransaction" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtvRevenueRewardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CtvRevenueRewardTransaction_grantId_key" ON "CtvRevenueRewardTransaction"("grantId");
CREATE INDEX "CtvRevenueRewardTransaction_affiliateProfileId_idx" ON "CtvRevenueRewardTransaction"("affiliateProfileId");
CREATE INDEX "CtvRevenueRewardTransaction_createdAt_idx" ON "CtvRevenueRewardTransaction"("createdAt");

CREATE UNIQUE INDEX "CtvRevenueRewardGrant_transactionId_key" ON "CtvRevenueRewardGrant"("transactionId");
CREATE INDEX "CtvRevenueRewardGrant_affiliateProfileId_paidAt_idx" ON "CtvRevenueRewardGrant"("affiliateProfileId", "paidAt");

ALTER TABLE "CtvRevenueRewardTransaction" ADD CONSTRAINT "CtvRevenueRewardTransaction_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CtvRevenueRewardGrant" ADD CONSTRAINT "CtvRevenueRewardGrant_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CtvRevenueRewardTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CtvRevenueRewardTransaction" ADD CONSTRAINT "CtvRevenueRewardTransaction_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CtvRevenueRewardGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: grants created before payout flow → mark paid + synthetic transaction
INSERT INTO "CtvRevenueRewardTransaction" ("id", "affiliateProfileId", "grantId", "amount", "createdAt")
SELECT
  'ctv_rrt_backfill_' || g."id",
  g."affiliateProfileId",
  g."id",
  g."rewardAmount",
  g."grantedAt"
FROM "CtvRevenueRewardGrant" g
WHERE g."transactionId" IS NULL;

UPDATE "CtvRevenueRewardGrant" g
SET
  "transactionId" = 'ctv_rrt_backfill_' || g."id",
  "paidAt" = COALESCE(g."paidAt", g."grantedAt")
WHERE g."transactionId" IS NULL;
