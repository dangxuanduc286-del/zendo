import "server-only";

import { getRedis } from "@/lib/redis";

const LIST_KEY = "zendo:audit:v1:affiliate-ops";
const MAX = 200;

export type AffiliateOpsAuditRow = {
  at: string;
  adminId: string;
  action: string;
  meta?: Record<string, unknown>;
};

const memoryRing: AffiliateOpsAuditRow[] = [];

export async function appendAffiliateOpsAudit(row: Omit<AffiliateOpsAuditRow, "at"> & { at?: string }): Promise<void> {
  const full: AffiliateOpsAuditRow = {
    at: row.at ?? new Date().toISOString(),
    adminId: row.adminId,
    action: row.action,
    meta: row.meta,
  };
  memoryRing.unshift(full);
  if (memoryRing.length > MAX) memoryRing.length = MAX;
  const r = getRedis();
  if (!r) return;
  try {
    await r.connect().catch(() => {});
    await r.lpush(LIST_KEY, JSON.stringify(full));
    await r.ltrim(LIST_KEY, 0, MAX - 1);
    await r.expire(LIST_KEY, 86400 * 14);
  } catch {
    /* memory only */
  }
}

export async function readAffiliateOpsAudit(take = 50): Promise<AffiliateOpsAuditRow[]> {
  const r = getRedis();
  if (r) {
    try {
      await r.connect().catch(() => {});
      const rows = await r.lrange(LIST_KEY, 0, take - 1);
      const parsed = rows
        .map((s) => {
          try {
            return JSON.parse(s) as AffiliateOpsAuditRow;
          } catch {
            return null;
          }
        })
        .filter((x): x is AffiliateOpsAuditRow => Boolean(x));
      if (parsed.length) return parsed;
    } catch {
      /* fall through */
    }
  }
  return memoryRing.slice(0, take);
}
