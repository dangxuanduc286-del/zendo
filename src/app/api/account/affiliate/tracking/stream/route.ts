import { affiliateTrackingStreamGet } from "@/lib/affiliate-tracking-stream-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE bridge: Redis `PSUBSCRIBE zendo:bus:tracking.*` → `text/event-stream`.
 * Auth: active affiliate profile (session cookie). Scoped server-side by `affiliateProfileId`.
 *
 * Client: `new EventSource("/api/affiliate/tracking/stream", { withCredentials: true })`
 */
export async function GET(request: Request): Promise<Response> {
  return affiliateTrackingStreamGet(request);
}
