-- Cập nhật SSOT cấp bậc CTV: % hoa hồng, mốc doanh thu 30 ngày, tiền thưởng (không đổi schema).
UPDATE "CtvMembershipTier"
SET
  "revenueFrom" = 0,
  "revenueTo" = 10000000,
  "rewardThreshold" = 10000000,
  "rewardAmount" = 200000,
  "commissionPercent" = 7,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'bronze';

UPDATE "CtvMembershipTier"
SET
  "revenueFrom" = 10000001,
  "revenueTo" = 20000000,
  "rewardThreshold" = 20000000,
  "rewardAmount" = 500000,
  "commissionPercent" = 8,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'silver';

UPDATE "CtvMembershipTier"
SET
  "revenueFrom" = 20000001,
  "revenueTo" = 40000000,
  "rewardThreshold" = 40000000,
  "rewardAmount" = 1000000,
  "commissionPercent" = 9,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'gold';

UPDATE "CtvMembershipTier"
SET
  "revenueFrom" = 40000001,
  "revenueTo" = 100000000,
  "rewardThreshold" = 100000000,
  "rewardAmount" = 2500000,
  "commissionPercent" = 11,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'diamond';
