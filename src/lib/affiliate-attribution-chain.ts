import "server-only";

import type { PrismaClient } from "@prisma/client";

/** Rolling window for touch-chain reads (first / last / future multi-touch). */
export const AFFILIATE_ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type TouchChainEntry = {
  at: string;
  eventType: string;
  pathname: string | null;
  utmSource: string | null;
  subid: string | null;
};

export async function buildAffiliateTouchChain(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  sessionId: string | null;
  orderId: string;
}): Promise<{ chain: TouchChainEntry[]; sources: string[]; refs: string[]; campaignHints: string[] }> {
  if (!args.sessionId) {
    return { chain: [], sources: [], refs: [], campaignHints: [] };
  }
  const since = new Date(Date.now() - AFFILIATE_ATTRIBUTION_WINDOW_MS);
  const rows = await args.db.affiliateTrafficEvent.findMany({
    where: {
      affiliateProfileId: args.affiliateProfileId,
      sessionId: args.sessionId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 48,
    select: {
      createdAt: true,
      eventType: true,
      pathname: true,
      metadata: true,
    },
  });
  const chain: TouchChainEntry[] = [];
  const sources: string[] = [];
  const refs: string[] = [];
  const campaignHints: string[] = [];
  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const utm =
      typeof meta.utm_source === "string"
        ? meta.utm_source.slice(0, 120)
        : typeof meta.utmSource === "string"
          ? meta.utmSource.slice(0, 120)
          : null;
    const sub = typeof meta.subid === "string" ? meta.subid.slice(0, 120) : null;
    const ref = typeof meta.affiliateRef === "string" ? meta.affiliateRef.slice(0, 64) : null;
    const camp = typeof meta.campaignId === "string" ? meta.campaignId.slice(0, 64) : null;
    if (utm && !sources.includes(utm)) sources.push(utm);
    if (ref && !refs.includes(ref)) refs.push(ref);
    if (camp && !campaignHints.includes(camp)) campaignHints.push(camp);
    chain.push({
      at: r.createdAt.toISOString(),
      eventType: r.eventType,
      pathname: r.pathname,
      utmSource: utm,
      subid: sub,
    });
  }
  return { chain, sources, refs, campaignHints };
}
