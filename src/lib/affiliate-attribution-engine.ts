import "server-only";

import { createHash } from "node:crypto";
import type { AffiliateConversionMatchState, Prisma, PrismaClient } from "@prisma/client";
import { buildAffiliateTouchChain } from "@/lib/affiliate-attribution-chain";
import { persistAffiliateAttributionLegacyModels } from "@/lib/affiliate-attribution-legacy-persist";
import { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } from "@/lib/affiliate-event-bus";
import { enqueueConversionDispatchAfterAttribution } from "@/lib/conversion-dispatch/conversion-dispatch-enqueue";
import { getWebsiteSettings } from "@/lib/settings";

const MS_1H = 60 * 60 * 1000;
const MS_24H = 24 * MS_1H;
const MS_7D = 7 * MS_24H;
const MS_30D = 30 * MS_24H;

function fingerprintV1(parts: Record<string, string | number | null | undefined>): string {
  const stable = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash("sha256").update(stable).digest("hex").slice(0, 64);
}

function pickState(args: {
  duplicatePaidHits: number;
  selfReferralRisk: boolean;
  sessionId: string | null;
  touchRows: unknown[];
}): AffiliateConversionMatchState {
  if (args.duplicatePaidHits >= 2) return "DUPLICATE";
  if (args.selfReferralRisk) return "SUSPICIOUS";
  if (!args.sessionId) return "UNATTRIBUTED";
  if (args.touchRows.length === 0) return "PARTIAL_MATCH";
  return "MATCHED";
}

function countWindows(anchorMs: number, touchTimesMs: number[]): {
  w1: number;
  w24: number;
  w7: number;
  w30: number;
} {
  let w1 = 0;
  let w24 = 0;
  let w7 = 0;
  let w30 = 0;
  for (const t of touchTimesMs) {
    const d = anchorMs - t;
    if (d < 0) continue;
    if (d <= MS_1H) w1 += 1;
    if (d <= MS_24H) w24 += 1;
    if (d <= MS_7D) w7 += 1;
    if (d <= MS_30D) w30 += 1;
  }
  return { w1, w24, w7, w30 };
}

/**
 * Full attribution resolution: conversion match + touch/campaign/source chains + legacy rows + bus.
 * Idempotent per (affiliateProfileId, orderId); replay-safe (rebuilds child rows).
 */
export async function resolveAffiliateAttributionForOrder(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  orderId: string;
  sessionId: string | null;
  lastSource: string | null;
}): Promise<{ matchId: string; state: AffiliateConversionMatchState } | null> {
  const [order, profile, website] = await Promise.all([
    args.db.order.findFirst({
      where: { id: args.orderId },
      select: {
        id: true,
        affiliateProfileId: true,
        customerId: true,
        paidAt: true,
        createdAt: true,
        totalAmount: true,
      },
    }),
    args.db.affiliateProfile.findFirst({
      where: { id: args.affiliateProfileId },
      select: {
        id: true,
        customerId: true,
        fraudScoreTier: true,
        fraudCommissionSoftHold: true,
        fraudDispatchHoldUntil: true,
      },
    }),
    getWebsiteSettings(),
  ]);

  if (!order || order.affiliateProfileId !== args.affiliateProfileId || !profile) {
    return null;
  }

  const anchor = order.paidAt ?? order.createdAt;
  const anchorMs = anchor.getTime();
  const since30 = new Date(anchorMs - MS_30D);

  const commissionRow = await args.db.affiliateCommission.findUnique({
    where: { affiliateProfileId_orderId: { affiliateProfileId: args.affiliateProfileId, orderId: args.orderId } },
    select: { amount: true },
  });

  const duplicatePaidHits = await args.db.affiliateTrafficEvent.count({
    where: {
      affiliateProfileId: args.affiliateProfileId,
      orderId: args.orderId,
      eventType: "ORDER_PAID",
    },
  });

  const selfReferralRisk = Boolean(
    order.customerId && profile.customerId && order.customerId === profile.customerId,
  );

  let visitorKey: string | null = null;
  if (args.sessionId) {
    const sess = await args.db.affiliateRealtimeSession.findUnique({
      where: { sessionId: args.sessionId },
      select: { visitorKey: true },
    });
    visitorKey = sess?.visitorKey?.trim().slice(0, 120) ?? null;
  }

  const touchRows = args.sessionId
    ? await args.db.affiliateTrafficEvent.findMany({
        where: {
          affiliateProfileId: args.affiliateProfileId,
          sessionId: args.sessionId,
          createdAt: { lte: anchor, gte: since30 },
        },
        orderBy: { createdAt: "asc" },
        take: 120,
        select: {
          id: true,
          createdAt: true,
          eventType: true,
          pathname: true,
          referrer: true,
          metadata: true,
          device: true,
          browser: true,
          productId: true,
          trackingLinkId: true,
        },
      })
    : [];

  const touchTimesMs = touchRows.map((r) => r.createdAt.getTime());
  const windows = countWindows(anchorMs, touchTimesMs);

  const state = pickState({
    duplicatePaidHits,
    selfReferralRisk,
    sessionId: args.sessionId,
    touchRows,
  });

  const winningModel = (website.attributionRule ?? "last_click").slice(0, 32);
  const fp = fingerprintV1({
    affiliateProfileId: args.affiliateProfileId,
    orderId: args.orderId,
    sessionId: args.sessionId ?? "",
    touchTail: touchRows.length ? touchRows[touchRows.length - 1]!.id : "",
    anchor: anchor.toISOString(),
  });

  const revenueMinor =
    order.totalAmount == null
      ? null
      : Math.round(Number(order.totalAmount) * 100);
  const commissionMinor =
    commissionRow?.amount == null ? null : Math.round(Number(commissionRow.amount) * 100);

  const signals: Prisma.InputJsonValue = {
    duplicatePaidHits,
    selfReferralRisk,
    engineVersion: 1,
  };

  const existing = await args.db.affiliateConversionMatch.findUnique({
    where: {
      affiliateProfileId_orderId: {
        affiliateProfileId: args.affiliateProfileId,
        orderId: args.orderId,
      },
    },
    select: { id: true, replayVersion: true },
  });
  const replayVersion = (existing?.replayVersion ?? 0) + 1;

  const snapshot = await buildAffiliateTouchChain({
    db: args.db,
    affiliateProfileId: args.affiliateProfileId,
    sessionId: args.sessionId,
    orderId: args.orderId,
  });

  const meta: Prisma.InputJsonValue = {
    touchChain: snapshot.chain,
    sourceChain: snapshot.sources,
    refChain: snapshot.refs,
    campaignChain: snapshot.campaignHints,
    recordedAt: new Date().toISOString(),
    winningModel,
    state,
    fraud: {
      tier: profile.fraudScoreTier,
      commissionSoftHold: profile.fraudCommissionSoftHold,
      dispatchHoldActive: Boolean(profile.fraudDispatchHoldUntil && profile.fraudDispatchHoldUntil > new Date()),
    },
  };

  const match = await args.db.$transaction(async (tx) => {
    const m = await tx.affiliateConversionMatch.upsert({
      where: {
        affiliateProfileId_orderId: {
          affiliateProfileId: args.affiliateProfileId,
          orderId: args.orderId,
        },
      },
      create: {
        affiliateProfileId: args.affiliateProfileId,
        orderId: args.orderId,
        sessionId: args.sessionId?.slice(0, 80) ?? null,
        visitorKey,
        state,
        winningModel,
        fingerprint: fp,
        touchCount: touchRows.length,
        window1hTouches: windows.w1,
        window24hTouches: windows.w24,
        window7dTouches: windows.w7,
        window30dTouches: windows.w30,
        duplicatePaidHits,
        selfReferralRisk,
        commissionMinor: commissionMinor ?? undefined,
        revenueMinor: revenueMinor ?? undefined,
        anchorAt: anchor,
        signals,
        metadata: meta,
        replayVersion,
      },
      update: {
        sessionId: args.sessionId?.slice(0, 80) ?? null,
        visitorKey,
        state,
        winningModel,
        fingerprint: fp,
        touchCount: touchRows.length,
        window1hTouches: windows.w1,
        window24hTouches: windows.w24,
        window7dTouches: windows.w7,
        window30dTouches: windows.w30,
        duplicatePaidHits,
        selfReferralRisk,
        commissionMinor: commissionMinor ?? undefined,
        revenueMinor: revenueMinor ?? undefined,
        anchorAt: anchor,
        signals,
        metadata: meta,
        replayVersion,
      },
    });

    await tx.affiliateSourceChain.deleteMany({ where: { conversionMatchId: m.id } });
    await tx.affiliateCampaignChain.deleteMany({ where: { conversionMatchId: m.id } });
    await tx.affiliateAttributionTouch.deleteMany({ where: { conversionMatchId: m.id } });

    if (touchRows.length) {
      await tx.affiliateAttributionTouch.createMany({
        data: touchRows.map((r, sequence) => {
          const md = (r.metadata ?? {}) as Record<string, unknown>;
          const utmSource =
            typeof md.utm_source === "string"
              ? md.utm_source.slice(0, 120)
              : typeof md.utmSource === "string"
                ? md.utmSource.slice(0, 120)
                : null;
          const utmMedium = typeof md.utm_medium === "string" ? md.utm_medium.slice(0, 120) : null;
          const utmCampaign = typeof md.utm_campaign === "string" ? md.utm_campaign.slice(0, 160) : null;
          const subid = typeof md.subid === "string" ? md.subid.slice(0, 120) : null;
          return {
            conversionMatchId: m.id,
            sequence,
            trafficEventId: r.id,
            touchedAt: r.createdAt,
            eventType: r.eventType,
            pathname: r.pathname,
            referrer: r.referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            subid,
            device: r.device,
            browser: r.browser,
            productId: r.productId,
            trackingLinkId: r.trackingLinkId,
          };
        }),
      });
    }

    const campaignOrdered: { key: string | null; label: string | null }[] = [];
    const seenCamp = new Set<string>();
    for (const r of touchRows) {
      const md = (r.metadata ?? {}) as Record<string, unknown>;
      const cid = typeof md.campaignId === "string" ? md.campaignId.slice(0, 120) : null;
      const uc = typeof md.utm_campaign === "string" ? md.utm_campaign.slice(0, 160) : null;
      const key = cid ?? uc;
      if (!key || seenCamp.has(key)) continue;
      seenCamp.add(key);
      campaignOrdered.push({ key, label: uc });
    }
    if (campaignOrdered.length) {
      await tx.affiliateCampaignChain.createMany({
        data: campaignOrdered.map((c, position) => ({
          conversionMatchId: m.id,
          position,
          campaignKey: c.key,
          label: c.label,
          metadata: { position } as Prisma.InputJsonValue,
        })),
      });
    }

    const sourceOrdered: { utmSource: string | null; utmMedium: string | null; referrer: string | null; path: string | null }[] = [];
    const seenSrc = new Set<string>();
    for (const r of touchRows) {
      const md = (r.metadata ?? {}) as Record<string, unknown>;
      const utmSource =
        typeof md.utm_source === "string"
          ? md.utm_source.slice(0, 120)
          : typeof md.utmSource === "string"
            ? md.utmSource.slice(0, 120)
            : null;
      const utmMedium = typeof md.utm_medium === "string" ? md.utm_medium.slice(0, 120) : null;
      const k = `${utmSource ?? ""}|${utmMedium ?? ""}|${r.referrer ?? ""}|${r.pathname ?? ""}`;
      if (seenSrc.has(k)) continue;
      seenSrc.add(k);
      sourceOrdered.push({
        utmSource,
        utmMedium,
        referrer: r.referrer?.slice(0, 512) ?? null,
        path: r.pathname?.slice(0, 512) ?? null,
      });
    }
    if (sourceOrdered.length) {
      await tx.affiliateSourceChain.createMany({
        data: sourceOrdered.map((s, position) => ({
          conversionMatchId: m.id,
          position,
          utmSource: s.utmSource,
          utmMedium: s.utmMedium,
          referrer: s.referrer,
          landingPath: s.path,
          metadata: { position } as Prisma.InputJsonValue,
        })),
      });
    }

    return m;
  });

  await persistAffiliateAttributionLegacyModels({
    db: args.db,
    affiliateProfileId: args.affiliateProfileId,
    orderId: args.orderId,
    sessionId: args.sessionId,
    lastSource: args.lastSource,
    meta,
    snapshot,
  });

  void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.attributionResolved, {
    affiliateProfileId: args.affiliateProfileId,
    orderId: args.orderId,
    matchId: match.id,
    state,
    replayVersion,
  });

  void enqueueConversionDispatchAfterAttribution({
    db: args.db,
    affiliateProfileId: args.affiliateProfileId,
    orderId: args.orderId,
    conversionMatchId: match.id,
    state,
    replayVersion,
    sessionId: args.sessionId,
  });

  return { matchId: match.id, state };
}
