-- Audit log + doanh thu tại thời điểm trao thưởng
ALTER TABLE "CtvRevenueRewardGrant" ADD COLUMN "qualifiedRevenue30d" DECIMAL(14,0);

CREATE TABLE "CtvRevenueRewardAuditLog" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "rewardAmount" DECIMAL(14,0) NOT NULL,
    "qualifiedRevenue30d" DECIMAL(14,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtvRevenueRewardAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CtvRevenueRewardAuditLog_grantId_key" ON "CtvRevenueRewardAuditLog"("grantId");
CREATE UNIQUE INDEX "CtvRevenueRewardAuditLog_transactionId_key" ON "CtvRevenueRewardAuditLog"("transactionId");
CREATE INDEX "CtvRevenueRewardAuditLog_affiliateProfileId_idx" ON "CtvRevenueRewardAuditLog"("affiliateProfileId");
CREATE INDEX "CtvRevenueRewardAuditLog_tierId_idx" ON "CtvRevenueRewardAuditLog"("tierId");
CREATE INDEX "CtvRevenueRewardAuditLog_createdAt_idx" ON "CtvRevenueRewardAuditLog"("createdAt");
CREATE INDEX "CtvRevenueRewardAuditLog_affiliateProfileId_tierId_idx" ON "CtvRevenueRewardAuditLog"("affiliateProfileId", "tierId");

ALTER TABLE "CtvRevenueRewardAuditLog" ADD CONSTRAINT "CtvRevenueRewardAuditLog_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CtvRevenueRewardGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill audit từ grant đã thanh toán
INSERT INTO "CtvRevenueRewardAuditLog" ("id", "affiliateProfileId", "tierId", "grantId", "transactionId", "rewardAmount", "qualifiedRevenue30d", "createdAt")
SELECT
  'ctv_rra_' || g."id",
  g."affiliateProfileId",
  g."tierId",
  g."id",
  t."id",
  g."rewardAmount",
  COALESCE(g."qualifiedRevenue30d", 0),
  COALESCE(g."paidAt", g."grantedAt")
FROM "CtvRevenueRewardGrant" g
INNER JOIN "CtvRevenueRewardTransaction" t ON t."grantId" = g."id"
WHERE g."paidAt" IS NOT NULL
  AND g."transactionId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "CtvRevenueRewardAuditLog" a WHERE a."grantId" = g."id");
