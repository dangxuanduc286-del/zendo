-- Hold period: admin approve -> WAITING_RELEASE -> (7 days) -> AVAILABLE
ALTER TYPE "AffiliateCommissionStatus" ADD VALUE IF NOT EXISTS 'WAITING_RELEASE';
ALTER TYPE "AffiliateCommissionStatus" ADD VALUE IF NOT EXISTS 'AVAILABLE';

ALTER TABLE "AffiliateCommission" ADD COLUMN IF NOT EXISTS "unlockAt" TIMESTAMP(3);
ALTER TABLE "AffiliateCommission" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3);
ALTER TABLE "AffiliateCommission" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AffiliateCommission_status_unlockAt_idx"
  ON "AffiliateCommission"("status", "unlockAt");

-- Legacy APPROVED rows become immediately withdrawable (no retroactive hold)
UPDATE "AffiliateCommission"
SET
  "status" = 'AVAILABLE',
  "availableAt" = COALESCE("approvedAt", "createdAt"),
  "releasedAt" = COALESCE("approvedAt", "createdAt")
WHERE "status" = 'APPROVED';
