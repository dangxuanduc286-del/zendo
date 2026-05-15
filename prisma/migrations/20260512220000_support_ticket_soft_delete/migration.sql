-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByAdminId" TEXT;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_deletedByAdminId_fkey" FOREIGN KEY ("deletedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SupportTicket_deletedAt_idx" ON "SupportTicket"("deletedAt");
