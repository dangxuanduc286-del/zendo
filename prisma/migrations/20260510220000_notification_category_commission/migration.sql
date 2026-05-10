-- Tab "Hoa hồng": thêm giá trị enum COMMISSION.
-- Chỉ ADD VALUE trong transaction này — không UPDATE/INSERT dùng COMMISSION ở đây
-- (PostgreSQL: giá trị enum mới chưa dùng được trong cùng transaction → P3018).

DO $$ BEGIN
  ALTER TYPE "CustomerAccountNotificationCategory" ADD VALUE 'COMMISSION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
