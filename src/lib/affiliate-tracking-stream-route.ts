import "server-only";

import { createAffiliateTrackingSseResponse, noteAffiliateTrackingSseReconnectHint } from "@/lib/affiliate-tracking-sse";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "@/app/api/account/affiliate/analytics/_shared";

export async function affiliateTrackingStreamGet(request: Request): Promise<Response> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return new Response(JSON.stringify({ ok: false, message: auth.message }), {
      status: auth.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const rl = await applyAnalyticsRateLimit({ key: `sse:${auth.customerId}`, windowMs: 60_000, max: 24 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ ok: false, message: "Quá nhiều kết nối stream. Thử lại sau." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(rateLimitRetryAfter(rl)),
      },
    });
  }

  const lastEventId = request.headers.get("Last-Event-ID");
  if (lastEventId) {
    noteAffiliateTrackingSseReconnectHint();
  }

  return createAffiliateTrackingSseResponse({
    affiliateProfileId: auth.affiliateProfileId,
    signal: request.signal,
    lastEventId,
  });
}
