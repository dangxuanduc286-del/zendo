import "server-only";

import type { AffiliateFraudTier, Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } from "@/lib/affiliate-event-bus";
import { readAffiliateOpsRollingFromRedis } from "@/lib/affiliate-ops-redis-rolling";
import {
  redisFraudIncrSuspiciousConv5m,
  redisFraudReadReplayAttemptsCurrentWindow,
  redisFraudSumFraudClicks,
  redisFraudSumSessionFlood5m,
  shouldAffiliateFraudRedis,
} from "@/lib/affiliate-fraud-redis";
import { getRedis } from "@/lib/redis";

const PREFIX = "aff:fraud:v1";

function tierRank(t: AffiliateFraudTier): number {
  switch (t) {
    case "LOW":
      return 0;
    case "MEDIUM":
      return 1;
    case "HIGH":
      return 2;
    case "CRITICAL":
      return 3;
    default:
      return 0;
  }
}

function maxTier(a: AffiliateFraudTier, b: AffiliateFraudTier): AffiliateFraudTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

type SignalDraft = { code: string; tier: AffiliateFraudTier; evidence: Prisma.InputJsonValue };

export async function runAffiliateFraudEvalLiteJob(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  nowMs?: number;
}): Promise<{ ok: boolean; signals: number; tier: AffiliateFraudTier }> {
  const nowMs = args.nowMs ?? Date.now();
  const autoActions = process.env.AFFILIATE_FRAUD_AUTO_ACTIONS !== "0";

  const profile = await args.db.affiliateProfile.findUnique({
    where: { id: args.affiliateProfileId },
    select: { id: true, fraudScoreTier: true, fraudDispatchHoldUntil: true, refCode: true },
  });
  if (!profile) return { ok: false, signals: 0, tier: "LOW" };

  const rolling = await readAffiliateOpsRollingFromRedis(profile.id);
  const replay15 = await redisFraudReadReplayAttemptsCurrentWindow({ affiliateProfileId: profile.id, nowMs });
  const fraudClicks1m = await redisFraudSumFraudClicks({ affiliateProfileId: profile.id, width: 1, nowMs });
  const fraudClicks5m = await redisFraudSumFraudClicks({ affiliateProfileId: profile.id, width: 5, nowMs });
  const sessFlood = await redisFraudSumSessionFlood5m({ affiliateProfileId: profile.id, nowMs });

  const signals: SignalDraft[] = [];

  if (rolling) {
    const c5 = rolling.clicks5m;
    const conv5 = rolling.conv5m;
    const s5 = rolling.sessions5mEstimate;
    if (c5 >= 60 && conv5 === 0 && s5 > 0 && s5 < 6) {
      signals.push({
        code: "CLICK_FLOOD_NO_CONV",
        tier: "HIGH",
        evidence: { clicks5m: c5, conv5m: conv5, sessions5m: s5, source: "rolling" },
      });
    }
    if (c5 >= 12 && conv5 >= 2 && conv5 / Math.max(1, c5) > 0.35) {
      signals.push({
        code: "IMPOSSIBLE_CONVERSION_RATE",
        tier: "CRITICAL",
        evidence: { clicks5m: c5, conv5m: conv5, ratio: conv5 / Math.max(1, c5), source: "rolling" },
      });
    }
    if (rolling.clicks1m >= 35 && rolling.conv1m === 0) {
      signals.push({
        code: "CLICK_BURST_1M",
        tier: "MEDIUM",
        evidence: { clicks1m: rolling.clicks1m, conv1m: rolling.conv1m, source: "rolling" },
      });
    }
  }

  if (replay15 >= 10) {
    signals.push({
      code: "REPLAY_STORM",
      tier: replay15 >= 22 ? "CRITICAL" : "HIGH",
      evidence: { replayAttempts15mWindow: replay15, source: "redis" },
    });
  }

  if (fraudClicks1m >= 140) {
    signals.push({
      code: "AFFILIATE_CLICK_SPAM_1M",
      tier: "HIGH",
      evidence: { fraudClicks1m, source: "redis_fraud_clicks_1m" },
    });
  } else if (fraudClicks5m >= 400) {
    signals.push({
      code: "AFFILIATE_CLICK_SPAM_5M",
      tier: "MEDIUM",
      evidence: { fraudClicks5m, source: "redis_fraud_clicks_1m" },
    });
  }

  if (sessFlood >= 500) {
    signals.push({
      code: "SESSION_FLOOD_5M",
      tier: "HIGH",
      evidence: { sessionEvents5mApprox: sessFlood, source: "redis_session_flood_5m" },
    });
  }

  if (signals.length === 0) {
    return { ok: true, signals: 0, tier: profile.fraudScoreTier };
  }

  let aggregate: AffiliateFraudTier = "LOW";
  for (const s of signals) aggregate = maxTier(aggregate, s.tier);

  const suspicious = signals.some((s) => s.code === "IMPOSSIBLE_CONVERSION_RATE" || s.code === "CLICK_FLOOD_NO_CONV");
  if (suspicious) void redisFraudIncrSuspiciousConv5m({ affiliateProfileId: profile.id, nowMs });

  const openCase =
    (await args.db.affiliateFraudCase.findFirst({
      where: {
        affiliateProfileId: profile.id,
        status: "OPEN",
        entityType: "PROFILE",
        entityKey: null,
      },
      orderBy: { openedAt: "desc" },
    })) ??
    (await args.db.affiliateFraudCase.create({
      data: {
        affiliateProfileId: profile.id,
        entityType: "PROFILE",
        title: "Automated fraud watch",
        status: "OPEN",
        tier: aggregate,
        metadata: { engine: "lite_v1", openedBy: "eval_job" } as Prisma.InputJsonValue,
      },
    }));

  if (tierRank(aggregate) > tierRank(openCase.tier)) {
    await args.db.affiliateFraudCase.update({
      where: { id: openCase.id },
      data: { tier: aggregate },
    });
  }

  const r = getRedis();
  const hourBucket = Math.floor(nowMs / 3_600_000);
  let inserted = 0;
  for (const s of signals) {
    const dedupe =
      shouldAffiliateFraudRedis() && r
        ? await (async () => {
            const h = createHash("sha256").update(`${openCase.id}|${s.code}|${hourBucket}`).digest("hex").slice(0, 32);
            const k = `${PREFIX}:sigdedupe:${h}`;
            try {
              await r.connect().catch(() => {});
              const ok = await r.set(k, "1", "EX", 7200, "NX");
              return ok === "OK";
            } catch {
              return true;
            }
          })()
        : true;
    if (!dedupe) continue;
    await args.db.affiliateFraudSignal.create({
      data: {
        caseId: openCase.id,
        code: s.code.slice(0, 64),
        tier: s.tier,
        evidence: s.evidence,
      },
    });
    inserted += 1;
  }

  const numericScore = Math.min(100, signals.length * 18 + tierRank(aggregate) * 12);
  await args.db.affiliateFraudScore.create({
    data: {
      affiliateProfileId: profile.id,
      caseId: openCase.id,
      scope: "AFFILIATE",
      scopeKey: null,
      numericScore,
      tier: aggregate,
      confidence: 0.72,
      breakdown: { signals: signals.map((x) => x.code), rolling: rolling != null } as Prisma.InputJsonValue,
    },
  });

  const newProfileTier = maxTier(profile.fraudScoreTier, aggregate);

  let proposedHoldEndMs = 0;
  if (autoActions) {
    if (aggregate === "CRITICAL") {
      proposedHoldEndMs = nowMs + 6 * 60 * 60 * 1000;
    } else if (signals.some((s) => s.code === "REPLAY_STORM" && tierRank(s.tier) >= 2)) {
      proposedHoldEndMs = nowMs + 2 * 60 * 60 * 1000;
    }
  }
  const existingHoldMs = profile.fraudDispatchHoldUntil?.getTime() ?? 0;
  const nextHoldMs = Math.max(existingHoldMs, proposedHoldEndMs);

  await args.db.affiliateProfile.update({
    where: { id: profile.id },
    data: {
      fraudScoreTier: newProfileTier,
      ...(nextHoldMs > nowMs ? { fraudDispatchHoldUntil: new Date(nextHoldMs) } : {}),
    },
  });

  if (tierRank(aggregate) >= tierRank("HIGH")) {
    void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.fraudAlert, {
      affiliateProfileId: profile.id,
      eventType: `FRAUD_${aggregate}`,
      pathname: `signals=${inserted}`,
    });
  }

  return { ok: true, signals: inserted, tier: newProfileTier };
}
