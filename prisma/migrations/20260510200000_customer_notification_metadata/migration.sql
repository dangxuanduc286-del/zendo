-- JSON payload cho thông báo (VD: affiliate / đơn hàng CTV)
ALTER TABLE "CustomerAccountNotification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
