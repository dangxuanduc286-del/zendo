-- Prerequisite for 20260511092000_affiliate_analytics_foundation:
-- AffiliateTrafficEvent gets FK to "Order" and "Product", but no earlier migration
-- in this repo creates those tables (commerce schema predates / lives outside history).
--
-- Shadow DB and greenfield migrate replay need the referenced tables to exist.
-- Production: CREATE TABLE IF NOT EXISTS is a no-op when full Order/Product already exist.
-- FK only requires a PRIMARY KEY on "id" (TEXT).

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
