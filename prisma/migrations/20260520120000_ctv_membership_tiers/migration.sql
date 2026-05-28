-- CreateTable
CREATE TABLE "CtvMembershipTier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revenueFrom" DECIMAL(14,0) NOT NULL,
    "revenueTo" DECIMAL(14,0) NOT NULL,
    "rewardThreshold" DECIMAL(14,0) NOT NULL,
    "rewardAmount" DECIMAL(14,0) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "badgeColor" TEXT NOT NULL,
    "icon" VARCHAR(32) NOT NULL DEFAULT 'medal',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CtvMembershipTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtvRevenueRewardGrant" (
    "id" TEXT NOT NULL,
    "affiliateProfileId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtvRevenueRewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CtvMembershipTier_code_key" ON "CtvMembershipTier"("code");

-- CreateIndex
CREATE INDEX "CtvMembershipTier_isActive_sortOrder_idx" ON "CtvMembershipTier"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CtvRevenueRewardGrant_affiliateProfileId_tierId_key" ON "CtvRevenueRewardGrant"("affiliateProfileId", "tierId");

-- CreateIndex
CREATE INDEX "CtvRevenueRewardGrant_affiliateProfileId_idx" ON "CtvRevenueRewardGrant"("affiliateProfileId");

-- CreateIndex
CREATE INDEX "CtvRevenueRewardGrant_tierId_idx" ON "CtvRevenueRewardGrant"("tierId");

-- AddForeignKey
ALTER TABLE "CtvRevenueRewardGrant" ADD CONSTRAINT "CtvRevenueRewardGrant_affiliateProfileId_fkey" FOREIGN KEY ("affiliateProfileId") REFERENCES "AffiliateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtvRevenueRewardGrant" ADD CONSTRAINT "CtvRevenueRewardGrant_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "CtvMembershipTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default tiers (SSOT initial data)
INSERT INTO "CtvMembershipTier" ("id", "code", "name", "revenueFrom", "revenueTo", "rewardThreshold", "rewardAmount", "commissionPercent", "sortOrder", "badgeColor", "icon", "isActive", "updatedAt")
VALUES
  ('ctv_tier_bronze', 'bronze', 'CTV Đồng', 0, 10000000, 10000000, 200000, 7, 1,
   '{"gradient":"from-orange-50 via-amber-50/90 to-white","glow":"shadow-orange-200/40","progress":"from-amber-500 via-orange-500 to-orange-600","badge":"bg-gradient-to-br from-amber-100 to-orange-100 text-amber-950 ring-amber-200/80","iconBg":"from-amber-100 via-orange-100 to-amber-50","iconText":"text-amber-800","amountText":"text-orange-600"}',
   'medal', true, CURRENT_TIMESTAMP),
  ('ctv_tier_silver', 'silver', 'CTV Bạc', 10000001, 20000000, 20000000, 500000, 8, 2,
   '{"gradient":"from-slate-100 via-zinc-50 to-white","glow":"shadow-slate-300/50","progress":"from-slate-400 via-zinc-400 to-slate-500","badge":"bg-gradient-to-br from-slate-100 to-zinc-200 text-slate-800 ring-slate-300/80","iconBg":"from-slate-200 via-zinc-100 to-white","iconText":"text-slate-700","amountText":"text-blue-700"}',
   'medal', true, CURRENT_TIMESTAMP),
  ('ctv_tier_gold', 'gold', 'CTV Vàng', 20000001, 40000000, 40000000, 1000000, 9, 3,
   '{"gradient":"from-yellow-50 via-amber-50/80 to-white","glow":"shadow-amber-200/45","progress":"from-yellow-400 via-amber-400 to-amber-500","badge":"bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-950 ring-amber-300/70","iconBg":"from-yellow-100 via-amber-100 to-yellow-50","iconText":"text-amber-900","amountText":"text-amber-600"}',
   'crown', true, CURRENT_TIMESTAMP),
  ('ctv_tier_diamond', 'diamond', 'CTV Kim Cương', 40000001, 100000000, 100000000, 2500000, 11, 4,
   '{"gradient":"from-blue-50 via-sky-50/90 to-white","glow":"shadow-blue-300/45","progress":"from-blue-500 via-sky-500 to-indigo-500","badge":"bg-gradient-to-br from-blue-600 to-sky-500 text-white ring-blue-400/40 shadow-[0_4px_14px_rgba(37,99,235,0.35)]","iconBg":"from-blue-100 via-sky-100 to-indigo-50","iconText":"text-blue-700","amountText":"text-violet-700"}',
   'gem', true, CURRENT_TIMESTAMP);
