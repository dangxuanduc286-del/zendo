-- AlterTable
ALTER TABLE "SupportTicketMessage"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "SupportTicketMessage"
ADD COLUMN IF NOT EXISTS "deletedByAdminId" TEXT;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_deletedByAdminId_fkey" FOREIGN KEY ("deletedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_deletedAt_idx" ON "SupportTicketMessage"("deletedAt");
