import { affiliateTrackingStreamGet } from "@/lib/affiliate-tracking-stream-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Phase 1.9 URL — same behavior as `GET /api/account/affiliate/tracking/stream`. */
export async function GET(request: Request): Promise<Response> {
  return affiliateTrackingStreamGet(request);
}
