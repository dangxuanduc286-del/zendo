-- Phase 11: campaign lifecycle + default subid for CTV growth tools
ALTER TABLE "AffiliateCampaign" ADD COLUMN "defaultSubid" VARCHAR(120);
ALTER TABLE "AffiliateCampaign" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AffiliateCampaign" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "AffiliateCampaign_affiliateProfileId_isActive_idx" ON "AffiliateCampaign"("affiliateProfileId", "isActive");
