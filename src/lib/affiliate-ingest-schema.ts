import "server-only";

import type { AffiliateTrafficEventType } from "@prisma/client";
import { z } from "zod";
import { normalizePathname, normalizeReferrer, normalizeSubId, normalizeUtmSource } from "@/lib/affiliate-tracking";

const PRISMA_EVENT_VALUES = [
  "AFFILIATE_CLICK",
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_STARTED",
  "CHECKOUT_COMPLETED",
  "ORDER_PAID",
  "ORDER_CANCELLED",
] as const satisfies readonly AffiliateTrafficEventType[];

const prismaEventEnum = z.enum(PRISMA_EVENT_VALUES);

/** Map client / partner aliases → Prisma enum (never trust client for revenue/order binding). */
export function normalizeAffiliateTrackEventType(raw: unknown): AffiliateTrafficEventType {
  if (typeof raw !== "string") throw new TypeError("eventType");
  const s = raw.trim();
  if (!s) throw new TypeError("eventType");
  const lower = s.toLowerCase().replace(/-/g, "_");
  const alias: Record<string, AffiliateTrafficEventType> = {
    page_view: "PAGE_VIEW",
    product_view: "PRODUCT_VIEW",
    add_to_cart: "ADD_TO_CART",
    checkout_start: "CHECKOUT_STARTED",
    checkout_started: "CHECKOUT_STARTED",
    /** Treated as paid order signal — still validated against DB order state in pipeline. */
    purchase: "ORDER_PAID",
    affiliate_click: "AFFILIATE_CLICK",
    campaign_click: "AFFILIATE_CLICK",
  };
  if (lower in alias) return alias[lower]!;
  const upper = s.toUpperCase().replace(/-/g, "_");
  const parsed = prismaEventEnum.safeParse(upper);
  if (parsed.success) return parsed.data;
  throw new TypeError("eventType");
}

const looseString = (max: number) =>
  z
    .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return null;
      if (typeof v === "string") {
        const t = v.trim();
        return t.length ? t.slice(0, max) : null;
      }
      if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
      if (typeof v === "boolean") return (v ? "1" : "0").slice(0, max);
      return null;
    });

export const affiliateTrackBodySchema = z
  .object({
    ref: z.string().min(1).max(64).transform((s) => s.trim()),
    eventType: z.preprocess(
      (v) => (typeof v === "number" && Number.isFinite(v) ? String(v) : v),
      z.string().transform((s) => normalizeAffiliateTrackEventType(s)),
    ),
    pathname: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => normalizePathname(v)),
    referrer: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => normalizeReferrer(v)),
    utm_source: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => normalizeUtmSource(v)),
    utm_medium: looseString(120).optional(),
    utm_campaign: looseString(120).optional(),
    utm_term: looseString(120).optional(),
    utm_content: looseString(120).optional(),
    subid: z
      .union([z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => normalizeSubId(v)),
    sessionId: looseString(80).optional(),
    visitorKey: looseString(120).optional(),
    productId: looseString(64).optional(),
    orderId: looseString(64).optional(),
    revenue: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const n = typeof v === "string" ? Number(v) : v;
        if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
        return n;
      }),
    commission: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const n = typeof v === "string" ? Number(v) : v;
        if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
        return n;
      }),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    /** Ignored for persistence — server timestamps only (future signed ingest may use). */
    clientTimestamp: z.union([z.number(), z.string()]).optional().nullable(),
  })
  .strict();

export type AffiliateTrackBodyParsed = z.infer<typeof affiliateTrackBodySchema>;

/** True when client used `campaign_click` alias (stored on normalized body via parallel parse). */
export function wasCampaignClickAlias(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const et = (raw as { eventType?: unknown }).eventType;
  if (typeof et !== "string") return false;
  return et.trim().toLowerCase().replace(/-/g, "_") === "campaign_click";
}
