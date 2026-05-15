import "server-only";

import type { PrismaClient } from "@prisma/client";

export type AttributionStateBreakdown = Partial<
  Record<
    "MATCHED" | "PARTIAL_MATCH" | "UNATTRIBUTED" | "SUSPICIOUS" | "DUPLICATE",
    number
  >
>;

function rollup(rows: { state: string; _count: { _all: number } }[]): AttributionStateBreakdown {
  const out: AttributionStateBreakdown = {};
  for (const r of rows) {
    const k = r.state as keyof AttributionStateBreakdown;
    out[k] = (out[k] ?? 0) + r._count._all;
  }
  return out;
}

export async function fetchAttributionStateBreakdown(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  since: Date;
}): Promise<AttributionStateBreakdown> {
  const rows = await args.db.affiliateConversionMatch.groupBy({
    by: ["state"],
    where: { affiliateProfileId: args.affiliateProfileId, resolvedAt: { gte: args.since } },
    _count: { _all: true },
  });
  return rollup(rows as { state: string; _count: { _all: number } }[]);
}

export async function countConversionsAttributed(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  since: Date;
}): Promise<number> {
  return args.db.affiliateConversionMatch.count({
    where: {
      affiliateProfileId: args.affiliateProfileId,
      resolvedAt: { gte: args.since },
      state: "MATCHED",
    },
  });
}
