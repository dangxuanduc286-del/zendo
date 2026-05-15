import { z } from "zod";

export type TrafficSourceBucket = "TIKTOK" | "FACEBOOK" | "YOUTUBE" | "INSTAGRAM" | "DIRECT" | "UNKNOWN";

export type DeviceBucket = "mobile" | "desktop" | "tablet";

export type AffiliateTrafficQueryFilters = {
  source: TrafficSourceBucket | "ALL";
  device: DeviceBucket | "ALL";
  pathnameContains: string | null;
  productId: string | null;
};

const sourceSchema = z.enum(["ALL", "TIKTOK", "FACEBOOK", "YOUTUBE", "INSTAGRAM", "DIRECT", "UNKNOWN"]);
const deviceSchema = z.enum(["ALL", "mobile", "desktop", "tablet"]);
const productIdSchema = z.string().min(16).max(40).optional().nullable();

export function parseAffiliateTrafficFilters(sp: URLSearchParams): AffiliateTrafficQueryFilters {
  const source = sourceSchema.safeParse(sp.get("source") ?? undefined).success
    ? sourceSchema.parse(sp.get("source") ?? undefined)
    : "ALL";
  const device = deviceSchema.safeParse(sp.get("device") ?? undefined).success
    ? deviceSchema.parse(sp.get("device") ?? undefined)
    : "ALL";
  const pathnameRaw = (sp.get("pathname") ?? "").trim().slice(0, 200);
  const pathnameContains = pathnameRaw.length ? pathnameRaw : null;
  const pidRaw = (sp.get("productId") ?? "").trim();
  const productParsed = productIdSchema.safeParse(pidRaw || null);
  const productId = productParsed.success && productParsed.data ? productParsed.data : null;
  return { source, device, pathnameContains, productId };
}
