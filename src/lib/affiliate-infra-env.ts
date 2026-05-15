import "server-only";

export type AffiliateInfraEnvCheck = { severity: "warn" | "info"; code: string; message: string };

/** Gợi ý cấu hình production (Redis, BullMQ, multi-instance). Không throw. */
export function collectAffiliateInfraEnvChecks(): AffiliateInfraEnvCheck[] {
  const out: AffiliateInfraEnvCheck[] = [];
  const redis = Boolean(process.env.REDIS_URL?.trim());
  if (process.env.NODE_ENV === "production" && !redis) {
    out.push({
      severity: "warn",
      code: "redis_missing",
      message: "REDIS_URL trống — rate limit, cache, queue lock không đồng bộ giữa nhiều instance.",
    });
  }
  if (redis && process.env.AFFILIATE_BULLMQ === "0") {
    out.push({
      severity: "warn",
      code: "bullmq_disabled",
      message: "AFFILIATE_BULLMQ=0 — job không qua BullMQ; chỉ xử lý in-memory hoặc drain inline.",
    });
  }
  if (redis && process.env.AFFILIATE_BULLMQ !== "0") {
    out.push({
      severity: "info",
      code: "bullmq_worker",
      message: "BullMQ bật: chạy `npm run affiliate:worker` (hoặc drain qua admin) để xử lý queue ổn định.",
    });
  }
  return out;
}
