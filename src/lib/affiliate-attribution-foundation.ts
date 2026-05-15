import "server-only";

import type { PrismaClient } from "@prisma/client";
import { resolveAffiliateAttributionForOrder } from "@/lib/affiliate-attribution-engine";

export { AFFILIATE_ATTRIBUTION_WINDOW_MS, buildAffiliateTouchChain, type TouchChainEntry } from "@/lib/affiliate-attribution-chain";

/**
 * Persist full attribution (conversion match + chains) and legacy first/last rows.
 * Invoked from BullMQ attribution worker — async-safe and replay-safe.
 */
export async function recordAffiliateOrderAttributionFoundation(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  orderId: string;
  sessionId: string | null;
  lastSource: string | null;
}): Promise<void> {
  await resolveAffiliateAttributionForOrder(args);
}
