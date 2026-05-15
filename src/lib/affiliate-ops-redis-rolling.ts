import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Redis } from "ioredis";
import type { AffiliateTrafficEventType } from "@prisma/client";
import type { OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";
import { getRedis } from "@/lib/redis";

const PREFIX = "aff:roll:v2";
const TTL_SEC = 7200;

const CLICK_LIKE: AffiliateTrafficEventType[] = [
  "AFFILIATE_CLICK",
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_STARTED",
];

export function shouldAffiliateOpsUseRedisRolling(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) && process.env.AFFILIATE_OPS_REDIS_ROLLING !== "0";
}

function isClickLike(eventType: AffiliateTrafficEventType): boolean {
  return CLICK_LIKE.includes(eventType);
}

function minuteEpoch(nowMs: number): number {
  return Math.floor(nowMs / 60_000);
}

function metricKey(profileId: string, metric: "clk" | "conv" | "rev" | "affclk", m: number): string {
  return `${PREFIX}:${profileId}:${metric}:${m}`;
}

function hllKey(profileId: string, kind: "sess_hll" | "ip_hll", m: number): string {
  return `${PREFIX}:${profileId}:${kind}:${m}`;
}

function metaLastIncrKey(profileId: string): string {
  return `${PREFIX}:${profileId}:meta:lastIncrAt`;
}

export function globalRollTickKey(): string {
  return `${PREFIX}:global:lastAggTickMs`;
}

export function hashIpForRoll(ip: string | null | undefined): string | null {
  const t = ip?.trim();
  if (!t) return null;
  return createHash("sha256").update(t).digest("hex").slice(0, 20);
}

/**
 * O(1) write path — called after successful DB insert (worker or sync persist).
 */
export async function redisAffiliateOpsRollIncr(args: {
  affiliateProfileId: string;
  eventType: AffiliateTrafficEventType;
  sessionId: string | null | undefined;
  revenue: number | null | undefined;
  ip: string | null | undefined;
  nowMs?: number;
}): Promise<void> {
  if (!shouldAffiliateOpsUseRedisRolling()) return;
  const r = getRedis();
  if (!r) return;
  const nowMs = args.nowMs ?? Date.now();
  const m = minuteEpoch(nowMs);
  const pip = r.pipeline();
  const touch = (key: string) => {
    pip.expire(key, TTL_SEC);
  };

  if (isClickLike(args.eventType)) {
    const k = metricKey(args.affiliateProfileId, "clk", m);
    pip.incr(k);
    touch(k);
  }
  if (args.eventType === "AFFILIATE_CLICK") {
    const k = metricKey(args.affiliateProfileId, "affclk", m);
    pip.incr(k);
    touch(k);
  }
  if (args.eventType === "ORDER_PAID") {
    const kc = metricKey(args.affiliateProfileId, "conv", m);
    pip.incr(kc);
    touch(kc);
    const cents = Math.round(Number(args.revenue ?? 0) * 100);
    if (Number.isFinite(cents) && cents !== 0) {
      const kr = metricKey(args.affiliateProfileId, "rev", m);
      pip.incrby(kr, cents);
      touch(kr);
    }
  }

  const sid = args.sessionId?.trim().slice(0, 80);
  if (sid) {
    const ks = hllKey(args.affiliateProfileId, "sess_hll", m);
    pip.pfadd(ks, sid);
    touch(ks);
  }
  const ipH = hashIpForRoll(args.ip ?? null);
  if (ipH) {
    const ki = hllKey(args.affiliateProfileId, "ip_hll", m);
    pip.pfadd(ki, ipH);
    touch(ki);
  }

  pip.set(metaLastIncrKey(args.affiliateProfileId), String(nowMs));
  pip.expire(metaLastIncrKey(args.affiliateProfileId), TTL_SEC);

  try {
    await r.connect().catch(() => {});
    await pip.exec();
  } catch {
    /* best-effort */
  }
}

async function mgetSum(r: Redis, keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const chunk = 96;
  let sum = 0;
  for (let i = 0; i < keys.length; i += chunk) {
    const part = keys.slice(i, i + chunk);
    const vals = await r.mget(...part);
    for (const v of vals) {
      if (v == null) continue;
      const n = Number.parseInt(String(v), 10);
      if (Number.isFinite(n)) sum += n;
    }
  }
  return sum;
}

async function sumMetricWindow(
  r: Redis,
  profileId: string,
  metric: "clk" | "conv" | "rev" | "affclk",
  endMin: number,
  startOffset: number,
  width: number,
): Promise<number> {
  const keys: string[] = [];
  for (let i = 0; i < width; i++) {
    keys.push(metricKey(profileId, metric, endMin - startOffset - i));
  }
  return mgetSum(r, keys);
}

async function pfCountMergedWindow(
  r: Redis,
  profileId: string,
  kind: "sess_hll" | "ip_hll",
  endMin: number,
  width: number,
): Promise<number> {
  const keys: string[] = [];
  for (let i = 0; i < width; i++) {
    keys.push(hllKey(profileId, kind, endMin - i));
  }
  const tmp = `${PREFIX}:${profileId}:__tmp_${kind}_${randomBytes(10).toString("hex")}`;
  try {
    await r.pfmerge(tmp, ...keys);
    const n = await r.pfcount(tmp);
    await r.del(tmp);
    return n;
  } catch {
    try {
      await r.del(tmp);
    } catch {
      /* ignore */
    }
    return 0;
  }
}

export async function readAffiliateOpsRollingFromRedis(profileId: string): Promise<OpsRollingCounts | null> {
  const r = getRedis();
  if (!r || !shouldAffiliateOpsUseRedisRolling()) return null;
  const readAtMs = Date.now();
  const curMin = minuteEpoch(readAtMs);
  try {
    await r.connect().catch(() => {});

    const [
      lastIncrRaw,
      tickRaw,
      clicks1m,
      clicks1mBaseline,
      clicks5m,
      clicks5mBaseline,
      clicks15m,
      clicks15mBaseline,
      clicks1h,
      clicks1hBaseline,
      conv1m,
      conv1mBaseline,
      conv5m,
      conv5mBaseline,
      conv15m,
      conv15mBaseline,
      conv1h,
      conv1hBaseline,
      revenue5mMinor,
      revenue5mBaselineMinor,
      revenue1hMinor,
      clicks5mAffiliateClick,
      sessions5mEstimate,
      distinctIp5mEstimate,
    ] = await Promise.all([
      r.get(metaLastIncrKey(profileId)),
      r.get(globalRollTickKey()),
      sumMetricWindow(r, profileId, "clk", curMin, 0, 1),
      sumMetricWindow(r, profileId, "clk", curMin, 1, 1),
      sumMetricWindow(r, profileId, "clk", curMin, 0, 5),
      sumMetricWindow(r, profileId, "clk", curMin, 5, 5),
      sumMetricWindow(r, profileId, "clk", curMin, 0, 15),
      sumMetricWindow(r, profileId, "clk", curMin, 15, 15),
      sumMetricWindow(r, profileId, "clk", curMin, 0, 60),
      sumMetricWindow(r, profileId, "clk", curMin, 60, 60),
      sumMetricWindow(r, profileId, "conv", curMin, 0, 1),
      sumMetricWindow(r, profileId, "conv", curMin, 1, 1),
      sumMetricWindow(r, profileId, "conv", curMin, 0, 5),
      sumMetricWindow(r, profileId, "conv", curMin, 5, 5),
      sumMetricWindow(r, profileId, "conv", curMin, 0, 15),
      sumMetricWindow(r, profileId, "conv", curMin, 15, 15),
      sumMetricWindow(r, profileId, "conv", curMin, 0, 60),
      sumMetricWindow(r, profileId, "conv", curMin, 60, 60),
      sumMetricWindow(r, profileId, "rev", curMin, 0, 5),
      sumMetricWindow(r, profileId, "rev", curMin, 5, 5),
      sumMetricWindow(r, profileId, "rev", curMin, 0, 60),
      sumMetricWindow(r, profileId, "affclk", curMin, 0, 5),
      pfCountMergedWindow(r, profileId, "sess_hll", curMin, 5),
      pfCountMergedWindow(r, profileId, "ip_hll", curMin, 5),
    ]);

    const lastIncrAtMs = lastIncrRaw ? Number.parseInt(String(lastIncrRaw), 10) : NaN;
    const lastGlobalTickMs = tickRaw ? Number.parseInt(String(tickRaw), 10) : NaN;
    const writerLagMs =
      Number.isFinite(lastIncrAtMs) && lastIncrAtMs > 0 ? Math.max(0, readAtMs - lastIncrAtMs) : null;

    return {
      now: readAtMs,
      source: "redis",
      clicks1m,
      clicks1mBaseline,
      clicks5m,
      clicks5mBaseline,
      clicks15m,
      clicks15mBaseline,
      clicks1h,
      clicks1hBaseline,
      conv1m,
      conv1mBaseline,
      conv5m,
      conv5mBaseline,
      conv15m,
      conv15mBaseline,
      conv1h,
      conv1hBaseline,
      revenue5mMinor,
      revenue5mBaselineMinor,
      revenue1hMinor,
      clicks5mAffiliateClick,
      sessions5mEstimate,
      distinctIp5mEstimate,
      rollMeta: {
        lastIncrAtMs: Number.isFinite(lastIncrAtMs) ? lastIncrAtMs : null,
        readAtMs,
        writerLagMs,
        lastGlobalTickMs: Number.isFinite(lastGlobalTickMs) ? lastGlobalTickMs : null,
      },
    };
  } catch {
    return null;
  }
}
