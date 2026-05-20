import "server-only";

import { formatVnd } from "@/lib/currency";
import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";
import { db } from "@/lib/db";

const CTV_REVENUE_REWARDS_HREF = "/tai-khoan?tab=affiliate&sub=dashboard";

/**
 * Chỉ gửi khi grant đã tồn tại và đã cộng ví (paidAt).
 * dedupeKey đảm bảo không gửi trùng nếu handler gọi lại.
 */
export async function notifyCtvRevenueRewardGranted(args: {
  affiliateProfileId: string;
  tierId: string;
  tierName: string;
  rewardAmount: number;
}): Promise<void> {
  const grant = await db.ctvRevenueRewardGrant.findUnique({
    where: {
      affiliateProfileId_tierId: {
        affiliateProfileId: args.affiliateProfileId,
        tierId: args.tierId,
      },
    },
    select: { paidAt: true, transactionId: true },
  });

  if (!grant?.paidAt || !grant.transactionId) return;

  const profile = await db.affiliateProfile.findUnique({
    where: { id: args.affiliateProfileId },
    select: { customerId: true, status: true },
  });
  if (!profile?.customerId || profile.status !== "ACTIVE") return;

  const title = sanitizeCustomerNotificationText("🎉 Bạn đã nhận thưởng doanh thu", 240);
  const body = sanitizeCustomerNotificationText(
    `Cấp bậc: ${args.tierName}. Tiền thưởng: ${formatVnd(args.rewardAmount)}. Tiền đã được cộng vào ví CTV.`,
    8000,
  );
  if (!title || !body) return;

  await publishCustomerAccountNotification({
    customerId: profile.customerId,
    category: "COMMISSION",
    dedupeKey: `ctv-revenue-reward:${args.affiliateProfileId}:${args.tierId}`,
    title,
    body,
    actionHref: CTV_REVENUE_REWARDS_HREF,
    metadata: {
      type: "CTV_REVENUE_REWARD",
      tierId: args.tierId,
      tierName: args.tierName,
      rewardAmount: args.rewardAmount,
      transactionId: grant.transactionId,
    },
  });
}
