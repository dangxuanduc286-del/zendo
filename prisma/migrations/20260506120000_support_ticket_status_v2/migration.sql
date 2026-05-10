-- Level 2: WAITING_ADMIN / WAITING_USER + idempotency index (Postgres)

ALTER TYPE "SupportTicketStatus" ADD VALUE 'WAITING_ADMIN';
ALTER TYPE "SupportTicketStatus" ADD VALUE 'WAITING_USER';

-- Legacy PENDING → queue chờ admin
UPDATE "SupportTicket" SET status = 'WAITING_ADMIN' WHERE status = 'PENDING';

-- Một ticket GENERAL “chat mặc định” đang mở / chờ xử lý cho mỗi khách (tránh race tạo trùng)
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_one_active_general_per_customer"
ON "SupportTicket" ("customerId")
WHERE
  type = 'GENERAL'
  AND "orderId" IS NULL
  AND "affiliateApplicationId" IS NULL
  AND status IN ('OPEN', 'PENDING', 'WAITING_ADMIN', 'WAITING_USER');
