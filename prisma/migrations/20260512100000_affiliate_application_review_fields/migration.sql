-- Affiliate application: experience + reviewer metadata
-- Idempotent for shadow DB / minimal migration chains where "AffiliateApplication" may not exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = 'AffiliateApplication'
  ) THEN
    ALTER TABLE "AffiliateApplication" ADD COLUMN IF NOT EXISTS "experience" TEXT;
    ALTER TABLE "AffiliateApplication" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
    ALTER TABLE "AffiliateApplication" ADD COLUMN IF NOT EXISTS "reviewedByAdminId" TEXT;

    CREATE INDEX IF NOT EXISTS "AffiliateApplication_reviewedByAdminId_idx" ON "AffiliateApplication"("reviewedByAdminId");

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint co
      INNER JOIN pg_class rel ON rel.oid = co.conrelid
      INNER JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      WHERE co.conname = 'AffiliateApplication_reviewedByAdminId_fkey'
        AND ns.nspname = 'public'
        AND rel.relname = 'AffiliateApplication'
    ) THEN
      ALTER TABLE "AffiliateApplication"
        ADD CONSTRAINT "AffiliateApplication_reviewedByAdminId_fkey"
          FOREIGN KEY ("reviewedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
