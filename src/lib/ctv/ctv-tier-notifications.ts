import "server-only";

import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";
import { db } from "@/lib/db";

const CTV_HUB_HREF = "/tai-khoan?tab=affiliate&sub=dashboard";

async function resolveCustomerId(affiliateProfileId: string): Promise<string | null> {
  const profile = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { customerId: true, status: true },
  });
  if (!profile?.customerId || profile.status !== "ACTIVE") return null;
  return profile.customerId;
}

export async function notifyCtvTierPromoted(args: {
  affiliateProfileId: string;
  toTierId: string;
  toTierName: string;
  commissionPercent: number;
}): Promise<void> {
  const customerId = await resolveCustomerId(args.affiliateProfileId);
  if (!customerId) return;

  const title = sanitizeCustomerNotificationText("🎉 Chúc mừng!", 240);
  const body = sanitizeCustomerNotificationText(
    `Bạn đã đạt cấp ${args.toTierName}. Hoa hồng hiện tại: ${args.commissionPercent}%.`,
    8000,
  );
  if (!title || !body) return;

  await publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `ctv-tier-up:${args.affiliateProfileId}:${args.toTierId}`,
    title,
    body,
    actionHref: CTV_HUB_HREF,
    metadata: {
      type: "CTV_TIER_UP",
      toTierId: args.toTierId,
      toTierName: args.toTierName,
      commissionPercent: args.commissionPercent,
    },
  });
}

export async function notifyCtvTierDemoted(args: {
  affiliateProfileId: string;
  toTierId: string;
  toTierName: string;
  commissionPercent: number;
  historyId: string;
}): Promise<void> {
  const customerId = await resolveCustomerId(args.affiliateProfileId);
  if (!customerId) return;

  const title = sanitizeCustomerNotificationText("⚠️ Cấp bậc CTV của bạn đã thay đổi", 240);
  const body = sanitizeCustomerNotificationText(
    `Cấp hiện tại: ${args.toTierName}. Hoa hồng hiện tại: ${args.commissionPercent}%.`,
    8000,
  );
  if (!title || !body) return;

  await publishCustomerAccountNotification({
    customerId,
    category: "COMMISSION",
    dedupeKey: `ctv-tier-down:${args.affiliateProfileId}:${args.historyId}`,
    title,
    body,
    actionHref: CTV_HUB_HREF,
    metadata: {
      type: "CTV_TIER_DOWN",
      toTierId: args.toTierId,
      toTierName: args.toTierName,
      commissionPercent: args.commissionPercent,
    },
  });
}
