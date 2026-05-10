-- SitePolicy: chính sách & tra cứu động (/chinh-sach/[slug])

CREATE TYPE "SitePolicyType" AS ENUM (
  'WARRANTY_LOOKUP_POLICY',
  'RETURN_POLICY',
  'AFFILIATE_POLICY',
  'PRIVACY_POLICY',
  'SHIPPING_POLICY',
  'CUSTOM'
);

CREATE TABLE "SitePolicy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SitePolicyType" NOT NULL DEFAULT 'CUSTOM',
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SitePolicy_slug_key" ON "SitePolicy"("slug");

CREATE INDEX "SitePolicy_type_deletedAt_idx" ON "SitePolicy"("type", "deletedAt");

CREATE INDEX "SitePolicy_isPublished_deletedAt_idx" ON "SitePolicy"("isPublished", "deletedAt");

CREATE INDEX "SitePolicy_sortOrder_idx" ON "SitePolicy"("sortOrder");
