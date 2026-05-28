-- Admin operational activity + notifications (central history & bell)

CREATE TYPE "AdminActivityCategory" AS ENUM (
  'CTV',
  'CUSTOMER',
  'ORDER',
  'PAYMENT',
  'WITHDRAWAL',
  'PAYOUT_ACCOUNT',
  'CTV_APPLICATION',
  'COMMISSION',
  'REWARD_POINTS',
  'SUPPORT',
  'SYSTEM'
);

CREATE TABLE "AdminActivityEvent" (
  "id" TEXT NOT NULL,
  "category" "AdminActivityCategory" NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "summary" TEXT NOT NULL,
  "actorLabel" VARCHAR(200),
  "actorCustomerId" TEXT,
  "entity" VARCHAR(80),
  "entityId" VARCHAR(64),
  "actionHref" VARCHAR(512) NOT NULL,
  "dedupeKey" VARCHAR(180) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminActivityEvent_dedupeKey_key" ON "AdminActivityEvent"("dedupeKey");
CREATE INDEX "AdminActivityEvent_category_createdAt_idx" ON "AdminActivityEvent"("category", "createdAt" DESC);
CREATE INDEX "AdminActivityEvent_createdAt_idx" ON "AdminActivityEvent"("createdAt" DESC);
CREATE INDEX "AdminActivityEvent_eventType_idx" ON "AdminActivityEvent"("eventType");

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "activityEventId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "readByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminNotification_activityEventId_key" ON "AdminNotification"("activityEventId");
CREATE INDEX "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt" DESC);

ALTER TABLE "AdminNotification"
  ADD CONSTRAINT "AdminNotification_activityEventId_fkey"
  FOREIGN KEY ("activityEventId") REFERENCES "AdminActivityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminNotification"
  ADD CONSTRAINT "AdminNotification_readByAdminId_fkey"
  FOREIGN KEY ("readByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
