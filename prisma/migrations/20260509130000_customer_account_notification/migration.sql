-- Customer (shadow DB — bảng cha cho FK thông báo)
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "fullName" TEXT,
  "passwordHash" TEXT,
  "isGuest" BOOLEAN NOT NULL DEFAULT false,
  "guestSessionId" TEXT,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_guestSessionId_key" ON "Customer" ("guestSessionId");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer" ("phone");
CREATE INDEX IF NOT EXISTS "Customer_isGuest_idx" ON "Customer" ("isGuest");
CREATE INDEX IF NOT EXISTS "Customer_guestSessionId_idx" ON "Customer" ("guestSessionId");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CustomerAccountNotificationCategory" AS ENUM ('ORDER', 'PROMOTION', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "CustomerAccountNotification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" "CustomerAccountNotificationCategory" NOT NULL,
    "dedupeKey" VARCHAR(180) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "body" TEXT NOT NULL,
    "actionHref" VARCHAR(512),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAccountNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccountNotification_customerId_dedupeKey_key" ON "CustomerAccountNotification"("customerId", "dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerAccountNotification_customerId_createdAt_idx" ON "CustomerAccountNotification"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerAccountNotification_customerId_readAt_idx" ON "CustomerAccountNotification"("customerId", "readAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CustomerAccountNotification" ADD CONSTRAINT "CustomerAccountNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
