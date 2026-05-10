export type RateLimitResult =
  | {
      ok: true;
      remaining: number;
      resetAtMs: number;
    }
  | {
      ok: false;
      remaining: 0;
      resetAtMs: number;
      retryAfterSeconds: number;
    };

type Entry = {
  count: number;
  resetAtMs: number;
  lastSeenMs: number;
};

type Store = Map<string, Entry>;

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: Store;
  __rateLimitLastSweepMs?: number;
};

function getStore(): Store {
  if (!globalForRateLimit.__rateLimitStore) {
    globalForRateLimit.__rateLimitStore = new Map<string, Entry>();
  }
  return globalForRateLimit.__rateLimitStore;
}

function maybeSweep(nowMs: number, windowMs: number): void {
  const last = globalForRateLimit.__rateLimitLastSweepMs ?? 0;
  if (nowMs - last < windowMs) return;
  globalForRateLimit.__rateLimitLastSweepMs = nowMs;

  const store = getStore();
  // Remove expired / stale keys to keep memory bounded.
  for (const [key, entry] of store.entries()) {
    if (entry.resetAtMs <= nowMs || nowMs - entry.lastSeenMs > windowMs * 3) {
      store.delete(key);
    }
  }
}

export function rateLimitFixedWindow(input: {
  key: string;
  max: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  const key = input.key.trim();
  if (!key) {
    // Deny-by-default if key is missing; avoid accidental unbounded access.
    return {
      ok: false,
      remaining: 0,
      resetAtMs: nowMs + input.windowMs,
      retryAfterSeconds: Math.max(1, Math.ceil(input.windowMs / 1000)),
    };
  }

  maybeSweep(nowMs, input.windowMs);
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + input.windowMs;
    store.set(key, { count: 1, resetAtMs, lastSeenMs: nowMs });
    return { ok: true, remaining: Math.max(0, input.max - 1), resetAtMs };
  }

  existing.lastSeenMs = nowMs;
  if (existing.count >= input.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000));
    return { ok: false, remaining: 0, resetAtMs: existing.resetAtMs, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true, remaining: Math.max(0, input.max - existing.count), resetAtMs: existing.resetAtMs };
}

