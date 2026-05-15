import "server-only";

import type { AlertSeverity, OpsAlertV1 } from "@/lib/affiliate-ops-anomaly-types";
import { getRedis } from "@/lib/redis";

function shouldUseServerAlertSuppression(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) && process.env.AFFILIATE_OPS_ALERT_SUPPRESS !== "0";
}

function cooldownMsForSeverity(s: AlertSeverity): number {
  if (s === "critical") return 300_000;
  if (s === "warning") return 900_000;
  return 2_400_000;
}

function suppressKey(profileId: string, alertId: string): string {
  return `aff:ops:sup:v1:${profileId}:${alertId}`;
}

/**
 * Cooldown per stable `alert.id`: first emission in window passes through; repeats within TTL are dropped.
 * After cooldown, the same alert can appear again (condition still firing).
 */
export async function applyAffiliateOpsAlertSuppression(args: {
  affiliateProfileId: string;
  alerts: OpsAlertV1[];
}): Promise<{ alerts: OpsAlertV1[]; suppressedCount: number }> {
  if (!shouldUseServerAlertSuppression()) {
    return { alerts: args.alerts, suppressedCount: 0 };
  }
  const r = getRedis();
  if (!r) return { alerts: args.alerts, suppressedCount: 0 };

  const out: OpsAlertV1[] = [];
  let suppressedCount = 0;
  const now = Date.now();
  try {
    await r.connect().catch(() => {});
    for (const a of args.alerts) {
      const key = suppressKey(args.affiliateProfileId, a.id);
      const windowMs = cooldownMsForSeverity(a.severity);
      let raw: string | null;
      try {
        raw = await r.get(key);
      } catch {
        out.push(a);
        continue;
      }
      const last = raw ? Number.parseInt(String(raw), 10) : 0;
      if (raw != null && Number.isFinite(last) && now - last < windowMs) {
        suppressedCount += 1;
        continue;
      }
      out.push(a);
      try {
        await r.set(key, String(now), "PX", windowMs);
      } catch {
        /* still delivered in response */
      }
    }
  } catch {
    return { alerts: args.alerts, suppressedCount: 0 };
  }
  return { alerts: out, suppressedCount };
}
