import "server-only";

export type AffiliateServiceLogSeverity = "debug" | "info" | "warn" | "error";

export type AffiliateServiceLogFields = {
  service: string;
  severity: AffiliateServiceLogSeverity;
  message: string;
  requestId?: string | null;
  jobId?: string | null;
  affiliateProfileId?: string | null;
  durationMs?: number | null;
  extra?: Record<string, unknown>;
};

/**
 * Log cấu trúc ra stdout (JSON line) — không dùng console.* để tránh bị strip bởi Next compiler.
 */
export function writeAffiliateServiceLog(row: AffiliateServiceLogFields): void {
  const payload = {
    ts: new Date().toISOString(),
    ...row,
  };
  try {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
}
