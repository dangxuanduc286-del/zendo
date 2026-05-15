import "server-only";

import type { PrismaClient } from "@prisma/client";

export async function listRecentAffiliateFraudCases(args: {
  db: PrismaClient;
  take: number;
  status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
}): Promise<
  {
    id: string;
    affiliateProfileId: string;
    title: string;
    status: string;
    tier: string;
    openedAt: Date;
    signalCount: number;
  }[]
> {
  const take = Math.min(80, Math.max(1, args.take));
  const where = args.status ? { status: args.status } : {};
  const rows = await args.db.affiliateFraudCase.findMany({
    where,
    orderBy: { openedAt: "desc" },
    take,
    select: {
      id: true,
      affiliateProfileId: true,
      title: true,
      status: true,
      tier: true,
      openedAt: true,
      _count: { select: { signals: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    affiliateProfileId: r.affiliateProfileId,
    title: r.title,
    status: r.status,
    tier: r.tier,
    openedAt: r.openedAt,
    signalCount: r._count.signals,
  }));
}

export async function getAffiliateFraudCaseDetail(args: { db: PrismaClient; caseId: string }) {
  return args.db.affiliateFraudCase.findUnique({
    where: { id: args.caseId },
    include: {
      signals: { orderBy: { createdAt: "desc" }, take: 80 },
      scores: { orderBy: { createdAt: "desc" }, take: 20 },
      actions: { orderBy: { createdAt: "desc" }, take: 40 },
      affiliateProfile: { select: { id: true, refCode: true, fraudScoreTier: true, fraudDispatchHoldUntil: true } },
    },
  });
}
