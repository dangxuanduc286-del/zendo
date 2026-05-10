-- Enforce at most ONE PENDING change request per payout account (PostgreSQL partial unique index).
-- Fails loudly if duplicates already exist — no silent deletes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "payoutAccountId"
      FROM "AffiliatePayoutAccountChangeRequest"
      WHERE "status" = 'PENDING'
      GROUP BY "payoutAccountId"
      HAVING COUNT(*) > 1
    ) AS "dup_pending"
  ) THEN
    RAISE EXCEPTION '[AffiliatePayoutAccountChangeRequest] Duplicate PENDING rows detected for one or more payoutAccountId values. Resolve data manually before applying migration (see STEP 3.2).';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePayoutAccountChangeRequest_payout_pending_partial_uidx"
ON "AffiliatePayoutAccountChangeRequest" ("payoutAccountId")
WHERE "status" = 'PENDING';
