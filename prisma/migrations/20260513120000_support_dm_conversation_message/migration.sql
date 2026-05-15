-- Direct support chat (replaces ticket-first GENERAL flow for storefront inbox).

CREATE TYPE "SupportDmSenderType" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "SupportDmConversation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerUnreadCount" INTEGER NOT NULL DEFAULT 0,
    "adminUnreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedAt" TIMESTAMP(3),
    "blockedByAdminId" TEXT,
    "blockReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportDmConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportDmConversation_customerId_key" ON "SupportDmConversation"("customerId");

CREATE INDEX "SupportDmConversation_customerId_idx" ON "SupportDmConversation"("customerId");
CREATE INDEX "SupportDmConversation_lastMessageAt_idx" ON "SupportDmConversation"("lastMessageAt");
CREATE INDEX "SupportDmConversation_adminUnreadCount_idx" ON "SupportDmConversation"("adminUnreadCount");
CREATE INDEX "SupportDmConversation_blockedAt_idx" ON "SupportDmConversation"("blockedAt");

ALTER TABLE "SupportDmConversation" ADD CONSTRAINT "SupportDmConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportDmConversation" ADD CONSTRAINT "SupportDmConversation_blockedByAdminId_fkey" FOREIGN KEY ("blockedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SupportDmMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "SupportDmSenderType" NOT NULL,
    "senderCustomerId" TEXT,
    "senderAdminId" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "seenBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedAt" TIMESTAMP(3),
    "deletedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportDmMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportDmMessage_conversationId_idx" ON "SupportDmMessage"("conversationId");
CREATE INDEX "SupportDmMessage_conversationId_createdAt_idx" ON "SupportDmMessage"("conversationId", "createdAt");
CREATE INDEX "SupportDmMessage_deletedAt_idx" ON "SupportDmMessage"("deletedAt");

ALTER TABLE "SupportDmMessage" ADD CONSTRAINT "SupportDmMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportDmConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportDmMessage" ADD CONSTRAINT "SupportDmMessage_senderCustomerId_fkey" FOREIGN KEY ("senderCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportDmMessage" ADD CONSTRAINT "SupportDmMessage_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportDmMessage" ADD CONSTRAINT "SupportDmMessage_deletedByAdminId_fkey" FOREIGN KEY ("deletedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
