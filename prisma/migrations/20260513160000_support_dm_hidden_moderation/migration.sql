-- Admin soft-hide: conversation stays in DB; reappears when customer sends again.
ALTER TABLE "SupportDmConversation" ADD COLUMN "hiddenByAdminAt" TIMESTAMP(3);
ALTER TABLE "SupportDmConversation" ADD COLUMN "hiddenByAdminId" TEXT;

ALTER TABLE "SupportDmConversation"
  ADD CONSTRAINT "SupportDmConversation_hiddenByAdminId_fkey"
  FOREIGN KEY ("hiddenByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SupportDmConversation_hiddenByAdminAt_idx" ON "SupportDmConversation"("hiddenByAdminAt");
