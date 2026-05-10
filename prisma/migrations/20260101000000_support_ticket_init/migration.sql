-- Baseline for SupportTicket tables/enums so later migrations apply cleanly in shadow DB.

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'PENDING', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM (
  'GENERAL',
  'ORDER',
  'WARRANTY',
  'RETURN',
  'AFFILIATE',
  'WITHDRAWAL',
  'AFFILIATE_APPLICATION'
);

-- CreateEnum
CREATE TYPE "SupportTicketSenderRole" AS ENUM ('CUSTOMER', 'AFFILIATE', 'ADMIN');

-- CreateTable
CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "type" "SupportTicketType" NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "orderId" TEXT,
  "affiliateApplicationId" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "adminUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderCustomerId" TEXT,
  "senderAdminId" TEXT,
  "senderRole" "SupportTicketSenderRole" NOT NULL,
  "body" TEXT NOT NULL,
  "seenBy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- NOTE: Foreign keys are intentionally omitted here to keep migrations applyable
-- even when the shadow database doesn't have a full baseline schema yet.

-- CreateIndex
CREATE INDEX "SupportTicket_customerId_idx" ON "SupportTicket"("customerId");
CREATE INDEX "SupportTicket_customerId_status_idx" ON "SupportTicket"("customerId", "status");
CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");
CREATE INDEX "SupportTicket_affiliateApplicationId_idx" ON "SupportTicket"("affiliateApplicationId");
CREATE INDEX "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_ticketId_idx" ON "SupportTicketMessage"("ticketId");
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");

