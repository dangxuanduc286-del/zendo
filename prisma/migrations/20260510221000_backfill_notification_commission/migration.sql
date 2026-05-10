-- Backfill sau khi migration trước đã commit (enum COMMISSION đã dùng được).
-- Idempotent: chỉ đổi hàng vẫn là ORDER / SYSTEM như điều kiện; chạy lại không nhân đôi.

UPDATE "CustomerAccountNotification"
SET category = 'COMMISSION'::"CustomerAccountNotificationCategory"
WHERE category = 'ORDER'
  AND metadata IS NOT NULL
  AND (metadata::jsonb->>'type') IN (
    'AFFILIATE_REFERRAL',
    'AFFILIATE_REFERRAL_ORDER',
    'AFFILIATE_PAYOUT_FLOW'
  );

UPDATE "CustomerAccountNotification"
SET
  category = 'COMMISSION'::"CustomerAccountNotificationCategory",
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('type', 'AFFILIATE_PAYOUT_FLOW')
WHERE category = 'SYSTEM'
  AND ("dedupeKey" LIKE 'aff_payout%' OR "dedupeKey" LIKE 'aff_chg%');
