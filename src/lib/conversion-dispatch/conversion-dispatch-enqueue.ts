import "server-only";

import { createHash } from "node:crypto";
import type { AffiliateConversionMatchState, ConversionDispatchProvider, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  enqueueConversionDispatchBullJob,
  isAffiliateConversionDispatchQueueEnabled,
} from "@/lib/affiliate-conversion-dispatch-bullmq";

function pickAccessToken(cfg: unknown, provider: "TIKTOK" | "META"): string | null {
  if (!cfg || typeof cfg !== "object") return null;
  const o = cfg as Record<string, unknown>;
  const direct =
    provider === "META"
      ? typeof o.metaAccessToken === "string"
        ? o.metaAccessToken
        : typeof o.accessToken === "string"
          ? o.accessToken
          : null
      : typeof o.tiktokAccessToken === "string"
        ? o.tiktokAccessToken
        : typeof o.accessToken === "string"
          ? o.accessToken
          : null;
  return direct?.trim().slice(0, 800) || null;
}

function payloadFingerprint(parts: Record<string, string | number | null | undefined>): string {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash("sha256").update(stable).digest("hex").slice(0, 64);
}

function extractClickIdsFromTrafficMetadata(rows: { metadata: unknown }[]): { ttclid: string | null; fbclid: string | null } {
  let ttclid: string | null = null;
  let fbclid: string | null = null;
  for (const t of rows) {
    const m = (t.metadata ?? {}) as Record<string, unknown>;
    if (!ttclid && typeof m.ttclid === "string") ttclid = m.ttclid.trim().slice(0, 512) || null;
    if (!fbclid && typeof m.fbclid === "string") fbclid = m.fbclid.trim().slice(0, 512) || null;
    if (ttclid && fbclid) break;
  }
  return { ttclid, fbclid };
}

/**
 * After deterministic conversion match — enqueue server-side CAPI jobs (TikTok / Meta) when eligible.
 * Idempotent via `dedupeKey` (unique). Never throws to attribution path.
 */
export async function enqueueConversionDispatchAfterAttribution(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  orderId: string;
  conversionMatchId: string;
  state: AffiliateConversionMatchState;
  replayVersion: number;
  sessionId: string | null;
}): Promise<void> {
  if (args.state !== "MATCHED") return;
  if (!isAffiliateConversionDispatchQueueEnabled()) return;

  try {
    const profileGate = await args.db.affiliateProfile.findUnique({
      where: { id: args.affiliateProfileId },
      select: { fraudDispatchHoldUntil: true, fraudScoreTier: true },
    });
    const now = new Date();
    if (profileGate?.fraudDispatchHoldUntil && profileGate.fraudDispatchHoldUntil > now) {
      return;
    }
    if (profileGate?.fraudScoreTier === "CRITICAL" && process.env.AFFILIATE_FRAUD_BLOCK_CAPI_ON_CRITICAL === "1") {
      return;
    }

    const integrations = await args.db.affiliatePixelIntegration.findMany({
      where: {
        affiliateProfileId: args.affiliateProfileId,
        status: "CONNECTED",
        provider: { in: ["TIKTOK_PIXEL", "META_PIXEL"] },
      },
      select: { provider: true, externalPixelId: true, config: true },
    });

    const touchRows =
      integrations.length > 0
        ? await args.db.affiliateAttributionTouch.findMany({
            where: { conversionMatchId: args.conversionMatchId },
            orderBy: { sequence: "asc" },
            take: 80,
            select: { trafficEventId: true },
          })
        : [];
    const trafficIds = touchRows.map((t) => t.trafficEventId).filter((x): x is string => Boolean(x));
    const trafficMeta =
      trafficIds.length > 0
        ? await args.db.affiliateTrafficEvent.findMany({
            where: { id: { in: trafficIds } },
            select: { metadata: true },
          })
        : [];

    const click = extractClickIdsFromTrafficMetadata(trafficMeta);

    for (const row of integrations) {
      const provider: ConversionDispatchProvider | null =
        row.provider === "TIKTOK_PIXEL" ? "TIKTOK" : row.provider === "META_PIXEL" ? "META" : null;
      if (!provider) continue;
      if (!row.externalPixelId?.trim()) continue;
      const token = pickAccessToken(row.config, provider === "TIKTOK" ? "TIKTOK" : "META");
      if (!token) continue;

      const dedupeKey = `capi_v1_${provider}_${args.affiliateProfileId}_${args.orderId}_rv${args.replayVersion}`.slice(0, 180);
      const fp = payloadFingerprint({
        orderId: args.orderId,
        provider,
        rv: args.replayVersion,
        internal: "ORDER_PAID",
      });

      try {
        const job = await args.db.conversionDispatchJob.create({
          data: {
            affiliateProfileId: args.affiliateProfileId,
            orderId: args.orderId,
            conversionMatchId: args.conversionMatchId,
            provider,
            internalEvent: "ORDER_PAID",
            payloadFingerprint: fp,
            dedupeKey,
            status: "QUEUED",
            payloadSummary: {
              sessionId: args.sessionId,
              replayVersion: args.replayVersion,
              ttclid: click.ttclid,
              fbclid: click.fbclid,
            } as object,
          },
        });
        try {
          await enqueueConversionDispatchBullJob({ dispatchJobId: job.id, dedupeKey });
        } catch {
          /* DB job vẫn QUEUED — Redis/Bull tạm lỗi; chạy lại worker sau. */
        }
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          continue;
        }
        throw e;
      }
    }
  } catch {
    /* never block attribution */
  }
}
