import "server-only";

import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function money(n: unknown): number {
  const v =
    typeof n === "object" && n != null && "toNumber" in n
      ? Number((n as { toNumber: () => number }).toNumber())
      : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

async function assertAdminAccess(): Promise<void> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "";
  const isAllowed = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role);
  if (!session?.user?.id || !isAllowed) {
    throw new Error("Unauthorized");
  }
}

export type CtvRevenueRewardAuditListParams = {
  query?: string;
  tierId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CtvRevenueRewardAuditRow = {
  id: string;
  affiliateProfileId: string;
  affiliateDisplayName: string;
  refCode: string;
  tierId: string;
  tierName: string;
  tierCode: string;
  qualifiedRevenue30d: number;
  rewardAmount: number;
  grantId: string;
  transactionId: string;
  receivedAt: Date;
};

function affiliateDisplayName(row: {
  customer: { fullName: string | null; email: string | null; phone: string | null } | null;
  admin: { fullName: string | null; email: string | null; username: string } | null;
  refCode: string;
}): string {
  if (row.customer?.fullName?.trim()) return row.customer.fullName.trim();
  if (row.customer?.email?.trim()) return row.customer.email.trim();
  if (row.customer?.phone?.trim()) return row.customer.phone.trim();
  if (row.admin?.fullName?.trim()) return row.admin.fullName.trim();
  if (row.admin?.username?.trim()) return row.admin.username.trim();
  return row.refCode;
}

function buildAuditWhere(params: CtvRevenueRewardAuditListParams): Prisma.CtvRevenueRewardAuditLogWhereInput {
  const parts: Prisma.CtvRevenueRewardAuditLogWhereInput[] = [];
  const tierId = (params.tierId ?? "").trim();
  if (tierId) parts.push({ tierId });

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
        { transactionId: { contains: q, mode: "insensitive" } },
        { grantId: { contains: q, mode: "insensitive" } },
        { grant: { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } } },
        { grant: { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } } },
        { grant: { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } } },
        { grant: { affiliateProfile: { customer: { phone: { contains: q, mode: "insensitive" } } } } },
        { grant: { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } } },
        { grant: { affiliateProfile: { admin: { email: { contains: q, mode: "insensitive" } } } } },
        { grant: { affiliateProfile: { admin: { username: { contains: q, mode: "insensitive" } } } } },
        { grant: { tier: { name: { contains: q, mode: "insensitive" } } } },
        { grant: { tier: { code: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  return parts.length ? { AND: parts } : {};
}

const auditSelect = {
  id: true,
  affiliateProfileId: true,
  tierId: true,
  grantId: true,
  transactionId: true,
  rewardAmount: true,
  qualifiedRevenue30d: true,
  createdAt: true,
  grant: {
    select: {
      affiliateProfile: {
        select: {
          refCode: true,
          customer: { select: { fullName: true, email: true, phone: true } },
          admin: { select: { fullName: true, email: true, username: true } },
        },
      },
      tier: { select: { name: true, code: true } },
    },
  },
} satisfies Prisma.CtvRevenueRewardAuditLogSelect;

function mapAuditRow(
  row: Prisma.CtvRevenueRewardAuditLogGetPayload<{ select: typeof auditSelect }>,
): CtvRevenueRewardAuditRow {
  const ap = row.grant.affiliateProfile;
  return {
    id: row.id,
    affiliateProfileId: row.affiliateProfileId,
    affiliateDisplayName: affiliateDisplayName(ap),
    refCode: ap.refCode,
    tierId: row.tierId,
    tierName: row.grant.tier.name,
    tierCode: row.grant.tier.code,
    qualifiedRevenue30d: money(row.qualifiedRevenue30d),
    rewardAmount: money(row.rewardAmount),
    grantId: row.grantId,
    transactionId: row.transactionId,
    receivedAt: row.createdAt,
  };
}

export async function getCtvRevenueRewardAuditList(
  params?: CtvRevenueRewardAuditListParams,
): Promise<{ rows: CtvRevenueRewardAuditRow[]; total: number }> {
  await assertAdminAccess();

  const where = buildAuditWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));

  const [rows, total] = await Promise.all([
    db.ctvRevenueRewardAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: auditSelect,
    }),
    db.ctvRevenueRewardAuditLog.count({ where }),
  ]);

  return { rows: rows.map(mapAuditRow), total };
}

export async function getCtvRevenueRewardAuditCsvRows(
  params?: CtvRevenueRewardAuditListParams,
): Promise<CtvRevenueRewardAuditRow[]> {
  const { rows } = await getCtvRevenueRewardAuditList({ ...params, limit: 5000 });
  return rows;
}

export function formatCtvRevenueRewardAuditCsv(rows: CtvRevenueRewardAuditRow[]): string {
  const header = [
    "receivedAt",
    "affiliateDisplayName",
    "refCode",
    "tierName",
    "tierCode",
    "qualifiedRevenue30d",
    "rewardAmount",
    "grantId",
    "transactionId",
    "affiliateProfileId",
    "tierId",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.receivedAt.toISOString(),
      r.affiliateDisplayName,
      r.refCode,
      r.tierName,
      r.tierCode,
      String(r.qualifiedRevenue30d),
      String(r.rewardAmount),
      r.grantId,
      r.transactionId,
      r.affiliateProfileId,
      r.tierId,
    ]
      .map((c) => esc(String(c)))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}
