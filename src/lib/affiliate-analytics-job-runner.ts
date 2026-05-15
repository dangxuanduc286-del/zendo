import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { AffiliateJobKind } from "@/lib/affiliate-job-kinds";


export async function executeAffiliateAnalyticsJob(args: {
  db: PrismaClient;
  kind: AffiliateJobKind;
  payload: Record<string, unknown>;
}): Promise<unknown> {
  const { db, kind, payload } = args;
  const {
    rebuildAffiliateHourlyAggregates,
    rebuildAffiliateDailyAggregates,
    cleanupStaleAffiliateRealtimeSessions,
    deleteOrphanAffiliateTrafficEvents,
    purgeAffiliateTrafficEventsOlderThan,
  } = await import("@/lib/affiliate-analytics-jobs");
  const { clearAllAffiliateAnalyticsCaches } = await import("@/lib/affiliate-ops-cache");

  const now = Date.now();
  switch (kind) {
    case "AGGREGATE_HOURLY_WINDOW": {
      const hours = Math.min(168, Math.max(1, Number(payload.hours ?? 52)));
      const from = new Date(now - hours * 3600000);
      return rebuildAffiliateHourlyAggregates({ db, from, to: new Date(now) });
    }
    case "AGGREGATE_DAILY_WINDOW": {
      const days = Math.min(400, Math.max(1, Number(payload.days ?? 120)));
      const from = new Date(now - days * 86400000);
      return rebuildAffiliateDailyAggregates({ db, from, to: new Date(now) });
    }
    case "CLEANUP_REALTIME": {
      const h = Math.min(72, Math.max(1, Number(payload.staleHours ?? 3)));
      return cleanupStaleAffiliateRealtimeSessions({ db, olderThan: new Date(now - h * 3600000) });
    }
    case "CLEANUP_ORPHAN_EVENTS":
      return deleteOrphanAffiliateTrafficEvents({ db });
    case "CACHE_REFRESH_ALL":
      await clearAllAffiliateAnalyticsCaches();
      return { ok: true };
    case "PURGE_OLD_RAW_EVENTS": {
      if (process.env.AFFILIATE_PURGE_RAW_EVENTS !== "1") {
        return { skipped: true, reason: "Set AFFILIATE_PURGE_RAW_EVENTS=1 on server to enable purge." };
      }
      const days = Math.min(730, Math.max(30, Number(payload.retentionDays ?? 180)));
      const cutoff = new Date(now - days * 86400000);
      return purgeAffiliateTrafficEventsOlderThan({ db, cutoff });
    }
    case "EXPORT_FANOUT":      return { skipped: true };
    case "NOTIFICATION_FANOUT":      return { skipped: true };
    case "FRAUD_EVAL_PROFILE_LITE": {
      const affiliateProfileId =
        typeof payload.affiliateProfileId === "string" ? payload.affiliateProfileId.trim().slice(0, 64) : "";
      if (!affiliateProfileId) return { skipped: true, reason: "missing_affiliateProfileId" };
      const { runAffiliateFraudEvalLiteJob } = await import("@/lib/affiliate-fraud-eval-lite");
      return runAffiliateFraudEvalLiteJob({ db, affiliateProfileId });
    }
    default:
      return { noop: true };
  }
}
