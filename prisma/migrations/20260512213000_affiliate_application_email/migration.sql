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
    ALTER TABLE "AffiliateApplication"
    ADD COLUMN IF NOT EXISTS "email" TEXT;
  END IF;
END $$;
