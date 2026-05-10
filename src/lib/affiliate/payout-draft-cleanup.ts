/**
 * Lifecycle cleanup for `private/affiliate-payout-change-drafts/*` only.
 *
 * Does NOT list or delete `private/affiliate-payout-accounts/*` (initial registration KYC).
 *
 * ### Superseded / archived KYC (future)
 * After an approved bank change, previous CCCD blobs may still exist on R2 under `...-drafts/`
 * or legacy paths. A future policy can delete or cold-archive them using AuditLog metadata — this
 * module intentionally does not touch keys still referenced by `AffiliatePayoutAccount`.
 */

import type { PrismaClient } from "@prisma/client";
import { deleteR2ObjectSafe, listR2ObjectsPage } from "@/lib/cloudflare-r2";

export const AFFILIATE_PAYOUT_CHANGE_DRAFT_PREFIX = "private/affiliate-payout-change-drafts/";

/**
 * Future retention for CCCD blobs replaced after an approved change (e.g. under this prefix or legacy paths).
 * `null` = not implemented — business/legal to define before enforcement.
 */
export const PAYOUT_KYC_REPLACED_BLOB_RETENTION_DAYS: number | null = null;

export type AffiliatePayoutDraftCleanupEnv = {
  /** Unreferenced keys older than this (by R2 LastModified) are eligible. Default 72. */
  orphanTtlHours: number;
  /** Rejected change-requests keep blobs protected until this long after review. Default 14 days. */
  rejectedRetentionDays: number;
  listingPageSize: number;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 999999);
}

export function resolveAffiliatePayoutDraftCleanupEnv(): AffiliatePayoutDraftCleanupEnv {
  return {
    orphanTtlHours: parsePositiveInt(process.env.AFFILIATE_PAYOUT_DRAFT_ORPHAN_TTL_HOURS, 72),
    rejectedRetentionDays: parsePositiveInt(process.env.AFFILIATE_PAYOUT_REJECTED_MEDIA_RETENTION_DAYS, 14),
    listingPageSize: Math.min(parsePositiveInt(process.env.AFFILIATE_PAYOUT_DRAFT_CLEANUP_LIST_PAGE_SIZE, 500), 1000),
  };
}

export async function collectProtectedCitizenKeys(
  db: Pick<PrismaClient, "affiliatePayoutAccount" | "affiliatePayoutAccountChangeRequest">,
  rejectedRetentionDays: number,
): Promise<Set<string>> {
  const rejectKeepAfter = new Date(Date.now() - rejectedRetentionDays * 24 * 60 * 60 * 1000);

  const [accounts, pendingOnly, rejectedProtected] = await Promise.all([
    db.affiliatePayoutAccount.findMany({
      select: { citizenIdFrontObjectKey: true, citizenIdBackObjectKey: true },
    }),
    db.affiliatePayoutAccountChangeRequest.findMany({
      where: { status: "PENDING" },
      select: { citizenIdFrontObjectKey: true, citizenIdBackObjectKey: true },
    }),
    db.affiliatePayoutAccountChangeRequest.findMany({
      where: {
        status: "REJECTED",
        OR: [{ reviewedAt: null }, { reviewedAt: { gte: rejectKeepAfter } }],
      },
      select: { citizenIdFrontObjectKey: true, citizenIdBackObjectKey: true },
    }),
  ]);

  const set = new Set<string>();
  const addPair = (a: { citizenIdFrontObjectKey: string; citizenIdBackObjectKey: string }): void => {
    if (a.citizenIdFrontObjectKey.trim()) set.add(a.citizenIdFrontObjectKey.trim());
    if (a.citizenIdBackObjectKey.trim()) set.add(a.citizenIdBackObjectKey.trim());
  };

  for (const a of accounts) addPair(a);
  for (const c of pendingOnly) addPair(c);
  for (const c of rejectedProtected) addPair(c);

  return set;
}

export type AffiliatePayoutDraftCleanupResult = {
  prefix: string;
  dryRun: boolean;
  inspected: number;
  eligibleOrphans: number;
  deleted: number;
  errors: number;
  orphanTtlHours: number;
  rejectedRetentionDays: number;
};

/**
 * Idempotent cleanup: listing is paginated; each delete safe to retry.
 */
export async function runAffiliatePayoutDraftCleanup(input: {
  db: PrismaClient;
  dryRun: boolean;
  env?: AffiliatePayoutDraftCleanupEnv;
  log?: (msg: string, meta?: Record<string, unknown>) => void;
}): Promise<AffiliatePayoutDraftCleanupResult> {
  const env = input.env ?? resolveAffiliatePayoutDraftCleanupEnv();
  const log = input.log ?? ((msg, meta) => console.log(msg, meta ? JSON.stringify(meta) : ""));
  const prefix = AFFILIATE_PAYOUT_CHANGE_DRAFT_PREFIX;
  const now = Date.now();
  const minAgeMs = env.orphanTtlHours * 60 * 60 * 1000;

  const protectedKeys = await collectProtectedCitizenKeys(input.db, env.rejectedRetentionDays);

  let inspected = 0;
  let eligibleOrphans = 0;
  let deleted = 0;
  let errors = 0;
  let continuation: string | undefined;

  log("affiliate_payout_draft_cleanup_start", {
    dryRun: input.dryRun,
    inspectedSoFar: 0,
    protectedKeyCount: protectedKeys.size,
    orphanTtlHours: env.orphanTtlHours,
    rejectedRetentionDays: env.rejectedRetentionDays,
  });

  do {
    const page = await listR2ObjectsPage({
      prefix,
      maxKeys: env.listingPageSize,
      continuationToken: continuation,
    });
    for (const obj of page.objects) {
      inspected += 1;
      const key = obj.key.trim();
      if (!key.startsWith(prefix)) continue;

      if (protectedKeys.has(key)) continue;

      const lm = obj.lastModified;
      if (!lm || lm.getTime() > now - minAgeMs) continue;

      eligibleOrphans += 1;

      if (input.dryRun) continue;

      try {
        const ok = await deleteR2ObjectSafe(key);
        if (ok) deleted += 1;
      } catch (e) {
        errors += 1;
        log("affiliate_payout_draft_cleanup_delete_error", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    continuation = page.continuationToken;
  } while (continuation);

  log("affiliate_payout_draft_cleanup_done", {
    dryRun: input.dryRun,
    inspected,
    eligibleOrphans,
    deleted,
    errors,
    protectedKeyCount: protectedKeys.size,
  });

  return {
    prefix,
    dryRun: input.dryRun,
    inspected,
    eligibleOrphans,
    deleted,
    errors,
    orphanTtlHours: env.orphanTtlHours,
    rejectedRetentionDays: env.rejectedRetentionDays,
  };
}
