-- Update only CTV commission percentages for new commission calculations.
-- Historical AffiliateCommission rows keep their stored commissionRate/amount snapshots.
UPDATE "CtvMembershipTier"
SET
  "commissionPercent" = 8,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'bronze';

UPDATE "CtvMembershipTier"
SET
  "commissionPercent" = 9,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'silver';

UPDATE "CtvMembershipTier"
SET
  "commissionPercent" = 10,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'gold';

UPDATE "CtvMembershipTier"
SET
  "commissionPercent" = 12,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'diamond';
