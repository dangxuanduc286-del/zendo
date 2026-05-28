"use client";

/** TTL mặc định cho JSON affiliate/CTV (stale-while-revalidate, không đổi payload API). */
export const AFFILIATE_CLIENT_JSON_CACHE_TTL_MS = 60_000;

type CacheEntry = { at: number; data: unknown };

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function readAffiliateClientJsonCache<T>(key: string, ttlMs = AFFILIATE_CLIENT_JSON_CACHE_TTL_MS): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) return null;
  return hit.data as T;
}

export function writeAffiliateClientJsonCache(key: string, data: unknown): void {
  store.set(key, { at: Date.now(), data });
}

export function invalidateAffiliateClientJsonCache(key?: string): void {
  if (key) {
    store.delete(key);
    inflight.delete(key);
    return;
  }
  store.clear();
  inflight.clear();
}

function runInflightDeduped<T>(key: string, force: boolean, factory: () => Promise<T>): Promise<T> {
  if (force) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const run = factory();
  inflight.set(key, run);
  void run.finally(() => {
    if (inflight.get(key) === run) inflight.delete(key);
  });
  return run;
}

/**
 * GET JSON keyed by URL — dedupe in-flight (sync) + TTL cache.
 */
export async function fetchAffiliateJsonByUrl<T>(args: {
  url: string;
  ttlMs?: number;
  force?: boolean;
  signal?: AbortSignal;
  parse?: (res: Response) => Promise<T>;
}): Promise<T> {
  const ttlMs = args.ttlMs ?? AFFILIATE_CLIENT_JSON_CACHE_TTL_MS;
  const force = Boolean(args.force);
  const cacheKey = args.url;

  if (!force) {
    const cached = readAffiliateClientJsonCache<T>(cacheKey, ttlMs);
    if (cached != null) return cached;
  }

  return runInflightDeduped(cacheKey, force, async () => {
    const res = await fetch(args.url, {
      credentials: "same-origin",
      cache: "no-store",
      signal: args.signal,
      headers: { Accept: "application/json" },
    });
    const json = args.parse ? await args.parse(res) : ((await res.json()) as T);
    writeAffiliateClientJsonCache(cacheKey, json);
    return json;
  });
}

/** GET JSON với dedupe in-flight + cache TTL (SWR: trả cache ngay, revalidate nền). */
export async function fetchAffiliateClientJson<T>(args: {
  cacheKey: string;
  url: string;
  ttlMs?: number;
  force?: boolean;
  signal?: AbortSignal;
  parse?: (res: Response) => Promise<T>;
}): Promise<T> {
  const ttlMs = args.ttlMs ?? AFFILIATE_CLIENT_JSON_CACHE_TTL_MS;
  const force = Boolean(args.force);

  if (!force) {
    const cached = readAffiliateClientJsonCache<T>(args.cacheKey, ttlMs);
    if (cached != null) return cached;
  }

  return runInflightDeduped(args.cacheKey, force, async () => {
    const res = await fetch(args.url, {
      credentials: "same-origin",
      cache: "no-store",
      signal: args.signal,
      headers: { Accept: "application/json" },
    });
    const json = args.parse ? await args.parse(res) : ((await res.json()) as T);
    writeAffiliateClientJsonCache(args.cacheKey, json);
    return json;
  });
}
