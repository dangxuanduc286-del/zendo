import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

/** Legacy `AffiliateAttribution` rows (first_touch + last_click) for backward compatibility. */
export async function persistAffiliateAttributionLegacyModels(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  orderId: string;
  sessionId: string | null;
  lastSource: string | null;
  meta: Prisma.InputJsonValue;
  snapshot: { sources: string[] };
}): Promise<void> {
  const first = await args.db.affiliateAttribution.findFirst({
    where: { affiliateProfileId: args.affiliateProfileId, orderId: args.orderId, model: "first_touch" },
    select: { id: true },
  });
  if (!first) {
    await args.db.affiliateAttribution.create({
      data: {
        affiliateProfileId: args.affiliateProfileId,
        orderId: args.orderId,
        sessionId: args.sessionId?.slice(0, 80) ?? null,
        model: "first_touch",
        source: args.snapshot.sources[0] ?? args.lastSource,
        weight: 1,
        metadata: args.meta,
      },
    });
  }

  const last = await args.db.affiliateAttribution.findFirst({
    where: { affiliateProfileId: args.affiliateProfileId, orderId: args.orderId, model: "last_click" },
    select: { id: true },
  });
  if (last) {
    await args.db.affiliateAttribution.update({
      where: { id: last.id },
      data: {
        sessionId: args.sessionId?.slice(0, 80) ?? null,
        source: args.lastSource ?? args.snapshot.sources[args.snapshot.sources.length - 1] ?? null,
        metadata: args.meta,
      },
    });
  } else {
    await args.db.affiliateAttribution.create({
      data: {
        affiliateProfileId: args.affiliateProfileId,
        orderId: args.orderId,
        sessionId: args.sessionId?.slice(0, 80) ?? null,
        model: "last_click",
        source: args.lastSource ?? args.snapshot.sources[args.snapshot.sources.length - 1] ?? null,
        weight: 1,
        metadata: args.meta,
      },
    });
  }
}
