import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import { ctvMembershipTierInputSchema, parseBadgeColorJson } from "@/lib/admin/ctv-membership-tiers-admin";
import { CTV_MEMBERSHIP_TIERS_CACHE_TAG, fetchCtvMembershipTiersFromDb } from "@/lib/ctv/ctv-membership-tier-repository";
import { db } from "@/lib/db";

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAllowedRole(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const tiers = await fetchCtvMembershipTiersFromDb(false);
  return NextResponse.json({ tiers });
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAllowedRole(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = ctvMembershipTierInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const theme = parseBadgeColorJson(input.badgeColorJson);

  const row = await db.ctvMembershipTier.create({
    data: {
      code: input.code,
      name: input.name,
      revenueFrom: input.revenueFrom,
      revenueTo: input.revenueTo,
      rewardThreshold: input.rewardThreshold,
      rewardAmount: input.rewardAmount,
      commissionPercent: input.commissionPercent,
      sortOrder: input.sortOrder,
      icon: input.icon,
      isActive: input.isActive ?? true,
      badgeColor: JSON.stringify(theme),
    },
  });

  revalidateTag(CTV_MEMBERSHIP_TIERS_CACHE_TAG);
  return NextResponse.json({ ok: true, id: row.id });
}
