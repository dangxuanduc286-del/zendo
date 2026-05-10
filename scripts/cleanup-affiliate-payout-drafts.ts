/**
 * Manual / scheduled cleanup for orphan CCCD draft uploads under
 * `private/affiliate-payout-change-drafts/`.
 *
 * Usage:
 *   tsx scripts/cleanup-affiliate-payout-drafts.ts
 *   AFFILIATE_PAYOUT_DRAFT_CLEANUP_DRY_RUN=1 tsx scripts/cleanup-affiliate-payout-drafts.ts
 */
process.loadEnvFile?.(".env");

async function runAffiliatePayoutDraftCleanupCli(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { runAffiliatePayoutDraftCleanup, resolveAffiliatePayoutDraftCleanupEnv } = await import(
    "../src/lib/affiliate/payout-draft-cleanup"
  );

  const dryRun =
    String(process.env.AFFILIATE_PAYOUT_DRAFT_CLEANUP_DRY_RUN ?? "")
      .trim()
      .toLowerCase() === "1" ||
    String(process.env.AFFILIATE_PAYOUT_DRAFT_CLEANUP_DRY_RUN ?? "")
      .trim()
      .toLowerCase() === "true";

  const env = resolveAffiliatePayoutDraftCleanupEnv();

  const result = await runAffiliatePayoutDraftCleanup({
    db,
    dryRun,
    env,
    log: (msg, meta) => {
      console.log(
        JSON.stringify({
          level: "info",
          msg,
          ...meta,
        }),
      );
    },
  });

  console.log(
    JSON.stringify({
      level: "summary",
      ...result,
    }),
  );

  if (result.errors > 0) {
    process.exitCode = 1;
  }
}

void runAffiliatePayoutDraftCleanupCli().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "affiliate_payout_draft_cleanup_fatal",
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
