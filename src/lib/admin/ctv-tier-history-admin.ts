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

export type CtvTierHistoryListParams = {
  query?: string;
  tierId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type CtvTierHistoryRow = {
  id: string;
  affiliateProfileId: string;
  affiliateDisplayName: string;
  refCode: string;
  fromTierName: string | null;
  toTierName: string;
  revenue: number;
  createdAt: Date;
};

function affiliateDisplayName(row: {
  refCode: string;
  customer: { fullName: string | null; email: string | null; phone: string | null } | null;
  admin: { fullName: string | null; email: string | null; username: string } | null;
}): string {
  if (row.customer?.fullName?.trim()) return row.customer.fullName.trim();
  if (row.customer?.email?.trim()) return row.customer.email.trim();
  if (row.customer?.phone?.trim()) return row.customer.phone.trim();
  if (row.admin?.fullName?.trim()) return row.admin.fullName.trim();
  if (row.admin?.username?.trim()) return row.admin.username.trim();
  return row.refCode;
}

function buildWhere(params: CtvTierHistoryListParams): Prisma.CtvTierHistoryWhereInput {
  const parts: Prisma.CtvTierHistoryWhereInput[] = [];
  if (params.tierId?.trim()) {
    parts.push({ OR: [{ toTierId: params.tierId }, { fromTierId: params.tierId }] });
  }
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
        { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { toTier: { name: { contains: q, mode: "insensitive" } } },
        { fromTier: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return parts.length ? { AND: parts } : {};
}

const select = {
  id: true,
  affiliateProfileId: true,
  revenue: true,
  createdAt: true,
  affiliateProfile: {
    select: {
      refCode: true,
      customer: { select: { fullName: true, email: true, phone: true } },
      admin: { select: { fullName: true, email: true, username: true } },
    },
  },
  fromTier: { select: { name: true } },
  toTier: { select: { name: true } },
} satisfies Prisma.CtvTierHistorySelect;

export async function getCtvTierHistoryList(
  params?: CtvTierHistoryListParams,
): Promise<{ rows: CtvTierHistoryRow[]; total: number }> {
  await assertAdminAccess();
  const where = buildWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const [rows, total] = await Promise.all([
    db.ctvTierHistory.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, select }),
    db.ctvTierHistory.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      affiliateProfileId: r.affiliateProfileId,
      affiliateDisplayName: affiliateDisplayName(r.affiliateProfile),
      refCode: r.affiliateProfile.refCode,
      fromTierName: r.fromTier?.name ?? null,
      toTierName: r.toTier.name,
      revenue: Number(r.revenue),
      createdAt: r.createdAt,
    })),
    total,
  };
}

export function formatCtvTierHistoryCsv(rows: CtvTierHistoryRow[]): string {
  const header = ["createdAt", "affiliateDisplayName", "refCode", "fromTier", "toTier", "revenue", "affiliateProfileId"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.affiliateDisplayName,
      r.refCode,
      r.fromTierName ?? "",
      r.toTierName,
      String(r.revenue),
      r.affiliateProfileId,
    ]
      .map((c) => esc(String(c)))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}
