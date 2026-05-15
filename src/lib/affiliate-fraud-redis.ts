import "server-only";

import type { Redis } from "ioredis";
import { getRedis } from "@/lib/redis";

const PREFIX = "aff:fraud:v1";
const TTL_SEC = 7200;

function minuteEpoch(nowMs: number): number {
  return Math.floor(nowMs / 60_000);
}

function window15(nowMs: number): number {
  return Math.floor(nowMs / 900_000);
}

function window5m(nowMs: number): number {
  return Math.floor(nowMs / 300_000);
}

export function shouldAffiliateFraudRedis(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) && process.env.AFFILIATE_FRAUD_REDIS !== "0";
}

/** Rolling affiliate-click spam counter (1-minute buckets). */
export async function redisFraudIncrFraudClicks1m(args: { affiliateProfileId: string; nowMs?: number }): Promise<void> {
  if (!shouldAffiliateFraudRedis()) return;
  const r = getRedis();
  if (!r) return;
  const nowMs = args.nowMs ?? Date.now();
  const m = minuteEpoch(nowMs);
  const k = `${PREFIX}:${args.affiliateProfileId}:fraud_clicks_1m:${m}`;
  try {
    await r.connect().catch(() => {});
    const pip = r.pipeline();
    pip.incr(k);
    pip.expire(k, TTL_SEC);
    await pip.exec();
  } catch {
    /* best-effort */
  }
}

/** Session event density (5-minute buckets) — O(1) per ingest. */
export async function redisFraudIncrSessionFlood5m(args: {
  affiliateProfileId: string;
  sessionId: string | null | undefined;
  nowMs?: number;
}): Promise<void> {
  if (!shouldAffiliateFraudRedis()) return;
  const sid = args.sessionId?.trim().slice(0, 80);
  if (!sid) return;
  const r = getRedis();
  if (!r) return;
  const nowMs = args.nowMs ?? Date.now();
  const w = window5m(nowMs);
  const k = `${PREFIX}:${args.affiliateProfileId}:session_flood_5m:${w}`;
  try {
    await r.connect().catch(() => {});
    const pip = r.pipeline();
    pip.incr(k);
    pip.expire(k, TTL_SEC);
    await pip.exec();
  } catch {
    /* best-effort */
  }
}

/** CAPI / attribution replay attempts (15-minute wall windows). */
export async function redisFraudIncrReplayAttempts15m(args: { affiliateProfileId: string; nowMs?: number }): Promise<void> {
  if (!shouldAffiliateFraudRedis()) return;
  const r = getRedis();
  if (!r) return;
  const nowMs = args.nowMs ?? Date.now();
  const w = window15(nowMs);
  const k = `${PREFIX}:${args.affiliateProfileId}:replay_attempts_15m:${w}`;
  try {
    await r.connect().catch(() => {});
    const pip = r.pipeline();
    pip.incr(k);
    pip.expire(k, TTL_SEC);
    await pip.exec();
  } catch {
    /* best-effort */
  }
}

export async function redisFraudReadReplayAttemptsCurrentWindow(args: {
  affiliateProfileId: string;
  nowMs?: number;
}): Promise<number> {
  if (!shouldAffiliateFraudRedis()) return 0;
  const r = getRedis();
  if (!r) return 0;
  const nowMs = args.nowMs ?? Date.now();
  const w = window15(nowMs);
  const k = `${PREFIX}:${args.affiliateProfileId}:replay_attempts_15m:${w}`;
  try {
    await r.connect().catch(() => {});
    const v = await r.get(k);
    const n = v == null ? 0 : Number.parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Sum fraud_clicks_1m over last `width` minutes ending at now (inclusive). */
export async function redisFraudSumFraudClicks(args: {
  affiliateProfileId: string;
  width: number;
  nowMs?: number;
}): Promise<number> {
  if (!shouldAffiliateFraudRedis()) return 0;
  const r = getRedis() as Redis | null;
  if (!r) return 0;
  const nowMs = args.nowMs ?? Date.now();
  const end = minuteEpoch(nowMs);
  const width = Math.min(120, Math.max(1, args.width));
  const keys: string[] = [];
  for (let i = 0; i < width; i++) {
    keys.push(`${PREFIX}:${args.affiliateProfileId}:fraud_clicks_1m:${end - i}`);
  }
  try {
    await r.connect().catch(() => {});
    let sum = 0;
    const chunk = 80;
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
  } catch {
    return 0;
  }
}

export async function redisFraudSumSessionFlood5m(args: { affiliateProfileId: string; nowMs?: number }): Promise<number> {
  if (!shouldAffiliateFraudRedis()) return 0;
  const r = getRedis() as Redis | null;
  if (!r) return 0;
  const nowMs = args.nowMs ?? Date.now();
  const end = window5m(nowMs);
  const keys: string[] = [];
  for (let i = 0; i < 3; i++) {
    keys.push(`${PREFIX}:${args.affiliateProfileId}:session_flood_5m:${end - i}`);
  }
  try {
    await r.connect().catch(() => {});
    let sum = 0;
    const vals = await r.mget(...keys);
    for (const v of vals) {
      if (v == null) continue;
      const n = Number.parseInt(String(v), 10);
      if (Number.isFinite(n)) sum += n;
    }
    return sum;
  } catch {
    return 0;
  }
}

/** Mark suspicious conversion window (5m bucket) — called from fraud eval when rule hits (not every request). */
export async function redisFraudIncrSuspiciousConv5m(args: { affiliateProfileId: string; nowMs?: number }): Promise<void> {
  if (!shouldAffiliateFraudRedis()) return;
  const r = getRedis();
  if (!r) return;
  const nowMs = args.nowMs ?? Date.now();
  const w = window5m(nowMs);
  const k = `${PREFIX}:${args.affiliateProfileId}:suspicious_conv_5m:${w}`;
  try {
    await r.connect().catch(() => {});
    const pip = r.pipeline();
    pip.incr(k);
    pip.expire(k, TTL_SEC);
    await pip.exec();
  } catch {
    /* best-effort */
  }
}
