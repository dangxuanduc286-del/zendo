-- Role + Admin (shadow DB: migration 20260101000001 có thể chưa được áp dụng trên một số môi trường — bootstrap idempotent)
DO $$ BEGIN
  CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "permissions" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Role_slug_key" ON "Role" ("slug");
CREATE INDEX IF NOT EXISTS "Role_slug_idx" ON "Role" ("slug");

INSERT INTO "Role" ("id", "name", "slug", "description", "permissions", "isSystem", "createdAt", "updatedAt")
VALUES (
  'cmigrate_affiliate_prereq_role',
  'Migration prerequisite',
  'migration-affiliate-prereq-role',
  'Auto-created for migrate shadow / empty DB',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "Admin" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
  "roleId" TEXT NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Admin"
    ADD CONSTRAINT "Admin_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin" ("username");
CREATE INDEX IF NOT EXISTS "Admin_roleId_idx" ON "Admin" ("roleId");
CREATE INDEX IF NOT EXISTS "Admin_status_idx" ON "Admin" ("status");

-- AlterTable
ALTER TABLE "AffiliatePayoutAccount" ADD COLUMN IF NOT EXISTS "verifiedByAdminId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AffiliatePayoutAccount"
    ADD CONSTRAINT "AffiliatePayoutAccount_verifiedByAdminId_fkey"
    FOREIGN KEY ("verifiedByAdminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AffiliatePayoutAccount_verifiedByAdminId_idx" ON "AffiliatePayoutAccount" ("verifiedByAdminId");

