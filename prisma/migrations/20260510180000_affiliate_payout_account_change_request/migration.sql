-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AffiliatePayoutChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliatePayoutAccountChangeRequest" (
    "id" TEXT NOT NULL,
    "payoutAccountId" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "currentBankName" TEXT NOT NULL,
    "currentBankAccountNumber" TEXT NOT NULL,
    "currentBankAccountHolder" TEXT NOT NULL,
    "requestedBankName" TEXT NOT NULL,
    "requestedBankAccountNumber" TEXT NOT NULL,
    "requestedBankAccountHolder" TEXT NOT NULL,
    "citizenIdFrontObjectKey" TEXT NOT NULL,
    "citizenIdBackObjectKey" TEXT NOT NULL,
    "status" "AffiliatePayoutChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayoutAccountChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccountChangeRequest_affiliateProfileId_idx" ON "AffiliatePayoutAccountChangeRequest"("affiliateProfileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccountChangeRequest_payoutAccountId_idx" ON "AffiliatePayoutAccountChangeRequest"("payoutAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccountChangeRequest_status_idx" ON "AffiliatePayoutAccountChangeRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccountChangeRequest_requestedAt_idx" ON "AffiliatePayoutAccountChangeRequest"("requestedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AffiliatePayoutAccountChangeRequest" ADD CONSTRAINT "AffiliatePayoutAccountChangeRequest_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "AffiliatePayoutAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AffiliatePayoutAccountChangeRequest" ADD CONSTRAINT "AffiliatePayoutAccountChangeRequest_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AffiliatePayoutAccountChangeRequest" ADD CONSTRAINT "AffiliatePayoutAccountChangeRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;