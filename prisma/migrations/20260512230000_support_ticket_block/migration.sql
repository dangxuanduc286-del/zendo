-- Support ticket: block is separate from archive/delete (UI-only hide for admin).

ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "blockedByAdminId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "blockReason" TEXT;

DO $$
BEGIN
  ALTER TABLE "SupportTicket"
    ADD CONSTRAINT "SupportTicket_blockedByAdminId_fkey"
    FOREIGN KEY ("blockedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SupportTicket_blockedAt_idx" ON "SupportTicket"("blockedAt");
