import { z } from "zod";

const themeSchema = z.object({
  gradient: z.string().min(1),
  glow: z.string().min(1),
  progress: z.string().min(1),
  badge: z.string().min(1),
  iconBg: z.string().min(1),
  iconText: z.string().min(1),
  amountText: z.string().min(1),
});

export const ctvMembershipTierInputSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  revenueFrom: z.coerce.number().int().min(0),
  revenueTo: z.coerce.number().int().min(0),
  rewardThreshold: z.coerce.number().int().min(0),
  rewardAmount: z.coerce.number().int().min(0),
  commissionPercent: z.coerce.number().min(0).max(100),
  sortOrder: z.coerce.number().int().min(0),
  icon: z.string().trim().min(1).max(32),
  isActive: z.coerce.boolean().optional(),
  badgeColorJson: z.string().min(2),
});

export function parseBadgeColorJson(raw: string): z.infer<typeof themeSchema> {
  const parsed = JSON.parse(raw) as unknown;
  return themeSchema.parse(parsed);
}
