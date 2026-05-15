-- Chuẩn hoá: thông báo affiliate referral thuộc tab Hoa hồng (COMMISSION), không còn ORDER + AFFILIATE_REFERRAL.
UPDATE "CustomerAccountNotification"
SET category = 'COMMISSION'::"CustomerAccountNotificationCategory"
WHERE category = 'ORDER'::"CustomerAccountNotificationCategory"
  AND metadata->>'type' = 'AFFILIATE_REFERRAL';

CREATE INDEX IF NOT EXISTS "CustomerAccountNotification_customerId_category_idx"
  ON "CustomerAccountNotification" ("customerId", "category");
