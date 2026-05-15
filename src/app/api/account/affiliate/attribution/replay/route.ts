import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveAffiliateAttributionForOrder } from "@/lib/affiliate-attribution-engine";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderIds: z.array(z.string().min(8).max(64)).max(15),
});

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = await applyAnalyticsRateLimit({ key: `attr:replay:${auth.customerId}`, windowMs: 60_000, max: 8 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON không hợp lệ." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }

  const results: { orderId: string; ok: boolean; error?: string }[] = [];
  for (const orderId of parsed.data.orderIds) {
    try {
      const order = await db.order.findFirst({
        where: { id: orderId, affiliateProfileId: auth.affiliateProfileId },
        select: { id: true },
      });
      if (!order) {
        results.push({ orderId, ok: false, error: "forbidden_or_missing" });
        continue;
      }
      const paidEv = await db.affiliateTrafficEvent.findFirst({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          orderId,
          eventType: "ORDER_PAID",
        },
        orderBy: { createdAt: "desc" },
        select: { sessionId: true, metadata: true },
      });
      const sessionId = paidEv?.sessionId?.trim().slice(0, 80) ?? null;
      const meta = (paidEv?.metadata ?? {}) as Record<string, unknown>;
      const lastSource =
        typeof meta.utm_source === "string"
          ? meta.utm_source.slice(0, 120)
          : typeof meta.utmSource === "string"
            ? meta.utmSource.slice(0, 120)
            : null;

      await resolveAffiliateAttributionForOrder({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        orderId,
        sessionId,
        lastSource,
      });
      results.push({ orderId, ok: true });
    } catch (e) {
      results.push({ orderId, ok: false, error: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ ok: true as const, results }, { status: 200 });
}
