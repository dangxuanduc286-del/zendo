import "server-only";

import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function assertAdminAccess(): Promise<void> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "";
  if (!session?.user?.id || !["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role)) {
    throw new Error("Unauthorized");
  }
}

export type CtvRewardTransactionListParams = {
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CtvRewardTransactionRow = {
  id: string;
  affiliateProfileId: string;
  affiliateDisplayName: string;
  refCode: string;
  grantId: string;
  amount: number;
  tierName: string;
  createdAt: Date;
};

function buildWhere(params: CtvRewardTransactionListParams): Prisma.CtvRevenueRewardTransactionWhereInput {
  const parts: Prisma.CtvRevenueRewardTransactionWhereInput[] = [];
  const from = (params.from ?? "").trim();
  const to = (params.to ?? "").trim();
  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
    }
    if (Object.keys(createdAt).length > 0) parts.push({ createdAt });
  }
  const q = (params.query ?? "").trim();
  if (q) {
    parts.push({
      OR: [
        { id: { contains: q, mode: "insensitive" } },
        { grantId: { contains: q, mode: "insensitive" } },
        { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
        { grant: { tier: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return parts.length ? { AND: parts } : {};
}

export async function getCtvRewardTransactionList(
  params?: CtvRewardTransactionListParams,
): Promise<{ rows: CtvRewardTransactionRow[]; total: number }> {
  await assertAdminAccess();
  const where = buildWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const [rows, total] = await Promise.all([
    db.ctvRevenueRewardTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        affiliateProfileId: true,
        grantId: true,
        amount: true,
        createdAt: true,
        affiliateProfile: {
          select: {
            refCode: true,
            customer: { select: { fullName: true, email: true } },
            admin: { select: { fullName: true, username: true } },
          },
        },
        grant: { select: { tier: { select: { name: true } } } },
      },
    }),
    db.ctvRevenueRewardTransaction.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      affiliateProfileId: r.affiliateProfileId,
      affiliateDisplayName:
        r.affiliateProfile.customer?.fullName?.trim() ||
        r.affiliateProfile.customer?.email?.trim() ||
        r.affiliateProfile.admin?.fullName?.trim() ||
        r.affiliateProfile.admin?.username?.trim() ||
        r.affiliateProfile.refCode,
      refCode: r.affiliateProfile.refCode,
      grantId: r.grantId,
      amount: Number(r.amount),
      tierName: r.grant.tier.name,
      createdAt: r.createdAt,
    })),
    total,
  };
}

export function formatCtvRewardTransactionsCsv(rows: CtvRewardTransactionRow[]): string {
  const header = ["createdAt", "transactionId", "affiliateDisplayName", "refCode", "tierName", "amount", "grantId"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [r.createdAt.toISOString(), r.id, r.affiliateDisplayName, r.refCode, r.tierName, String(r.amount), r.grantId]
      .map((c) => esc(String(c)))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}
