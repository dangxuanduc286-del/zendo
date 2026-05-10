-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "autoReplySentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupportTicketMessage" ADD COLUMN "isAutoReply" BOOLEAN NOT NULL DEFAULT false;
