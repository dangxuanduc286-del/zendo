import "server-only";

import Redis from "ioredis";

let shared: Redis | null | undefined = undefined;

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u && u.length > 0 ? u : null;
}

/**
 * Singleton Redis cho cache, rate limit, lock (tách connection với BullMQ trong `affiliate-bullmq-queue`).
 */
export function getRedis(): Redis | null {
  if (shared !== undefined) return shared;
  const url = redisUrl();
  if (!url) {
    shared = null;
    return null;
  }
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 20,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 10_000,
      commandTimeout: 5_000,
      retryStrategy(times) {
        if (times > 25) return null;
        return Math.min(times * 400, 8_000);
      },
    });
    client.on("error", () => {
      /* ioredis tự retry */
    });
    shared = client;
    return client;
  } catch {
    shared = null;
    return null;
  }
}

export async function redisPing(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const r = getRedis();
  if (!r) return { ok: false, ms: 0, error: "no_redis" };
  const t0 = Date.now();
  try {
    await r.connect().catch(() => {});
    const pong = await r.ping();
    const ms = Date.now() - t0;
    return { ok: pong === "PONG", ms };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

export function isRedisUrlConfigured(): boolean {
  return Boolean(redisUrl());
}
