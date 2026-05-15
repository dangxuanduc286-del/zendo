-- Phase 10: short links (/go/{slug}) + per-link analytics
ALTER TABLE "AffiliateTrackingLink" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateTrackingLink_slug_key" ON "AffiliateTrackingLink"("slug");

ALTER TABLE "AffiliateTrafficEvent" ADD COLUMN IF NOT EXISTS "trackingLinkId" TEXT;

CREATE INDEX IF NOT EXISTS "AffiliateTrafficEvent_affiliateProfileId_trackingLinkId_createdAt_idx"
  ON "AffiliateTrafficEvent"("affiliateProfileId", "trackingLinkId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "AffiliateTrafficEvent"
    ADD CONSTRAINT "AffiliateTrafficEvent_trackingLinkId_fkey"
    FOREIGN KEY ("trackingLinkId") REFERENCES "AffiliateTrackingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
