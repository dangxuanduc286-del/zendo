-- Ensure baseline SupportTicket tables/enums exist (shadow DB safety).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus') THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'PENDING', 'ANSWERED', 'CLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketType') THEN
    CREATE TYPE "SupportTicketType" AS ENUM (
      'GENERAL',
      'ORDER',
      'WARRANTY',
      'RETURN',
      'AFFILIATE',
      'WITHDRAWAL',
      'AFFILIATE_APPLICATION'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketSenderRole') THEN
    CREATE TYPE "SupportTicketSenderRole" AS ENUM ('CUSTOMER', 'AFFILIATE', 'ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SupportTicket" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
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

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Rename legacy enum label ANSWERED -> RESOLVED (PostgreSQL 10+)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'SupportTicketStatus' AND e.enumlabel = 'ANSWERED'
  ) THEN
    ALTER TYPE "SupportTicketStatus" RENAME VALUE 'ANSWERED' TO 'RESOLVED';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "SupportTicket" ADD COLUMN "assignedAdminId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Admin'
  ) THEN
    ALTER TABLE "SupportTicket"
    ADD CONSTRAINT "SupportTicket_assignedAdminId_fkey"
    FOREIGN KEY ("assignedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX "SupportTicket_assignedAdminId_idx" ON "SupportTicket"("assignedAdminId");
