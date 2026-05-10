-- AffiliateProfile phải tồn tại trước FK payout. Bootstrap idempotent (shadow DB / chuỗi migrate tối thiểu).
DO $$ BEGIN
  CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'PAUSED', 'LOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AffiliateProfile" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "adminId" TEXT,
  "refCode" TEXT NOT NULL,
  "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
  "commissionRate" DECIMAL(5, 2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AffiliateProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateProfile_refCode_key" ON "AffiliateProfile" ("refCode");
CREATE INDEX IF NOT EXISTS "AffiliateProfile_customerId_idx" ON "AffiliateProfile" ("customerId");
CREATE INDEX IF NOT EXISTS "AffiliateProfile_adminId_idx" ON "AffiliateProfile" ("adminId");
CREATE INDEX IF NOT EXISTS "AffiliateProfile_status_idx" ON "AffiliateProfile" ("status");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AffiliatePayoutVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AffiliatePayoutAccount" (
  "id" TEXT NOT NULL,
  "affiliateProfileId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankAccountNumber" TEXT NOT NULL,
  "bankAccountHolder" TEXT NOT NULL,
  "citizenIdFrontObjectKey" TEXT NOT NULL,
  "citizenIdBackObjectKey" TEXT NOT NULL,
  "verificationStatus" "AffiliatePayoutVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AffiliatePayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePayoutAccount_affiliateProfileId_key" ON "AffiliatePayoutAccount"("affiliateProfileId");
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccount_verificationStatus_idx" ON "AffiliatePayoutAccount"("verificationStatus");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AffiliatePayoutAccount"
    ADD CONSTRAINT "AffiliatePayoutAccount_affiliateProfileId_fkey"
    FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

