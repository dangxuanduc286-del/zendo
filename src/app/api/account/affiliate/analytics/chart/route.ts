import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AFFILIATE_ANALYTICS_CACHE_TTL_MS, withAffiliateAnalyticsCache } from "@/lib/affiliate-analytics-route-cache";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";
import { rangeStart } from "@/lib/affiliate-analytics";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]).default("7d");
const typeSchema = z.enum(["traffic", "conversions", "commission", "revenue"]).default("traffic");

type BucketRow = { day: Date; clicks: bigint; paid: bigint; revenue: string | null; commission: string | null };

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? (rangeSchema.parse(searchParams.get("range") ?? undefined) as "today" | "7d" | "30d" | "month")
    : "7d";
  const type = typeSchema.safeParse(searchParams.get("type") ?? undefined).success
    ? (typeSchema.parse(searchParams.get("type") ?? undefined) as "traffic" | "conversions" | "commission" | "revenue")
    : "traffic";

  const rl = await applyAnalyticsRateLimit({ key: `ch:${auth.customerId}`, windowMs: 10_000, max: 40 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const since = rangeStart(range);

  try {
    const body = await withAffiliateAnalyticsCache({
      affiliateProfileId: auth.affiliateProfileId,
      segment: "chart",
      parts: { range, type },
      ttlMs: AFFILIATE_ANALYTICS_CACHE_TTL_MS.chart,
      obsLabel: "chart",
      compute: async () => {
        const vnDay = Prisma.sql`date_trunc('day', "createdAt" + interval '7 hour')`;
        const rows = (await db.$queryRaw(
          Prisma.sql`
        SELECT
          ${vnDay} AS day,
          SUM(CASE WHEN "eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END) AS clicks,
          SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END) AS paid,
          SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("revenue", 0) ELSE 0 END) AS revenue,
          SUM(CASE WHEN "eventType" = 'ORDER_PAID' THEN COALESCE("commission", 0) ELSE 0 END) AS commission
        FROM "AffiliateTrafficEvent"
        WHERE "affiliateProfileId" = ${auth.affiliateProfileId}
          AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        )) as BucketRow[];

        const labels = rows.map((r) => {
          const t = new Date(r.day.getTime());
          const y = t.getUTCFullYear();
          const m = String(t.getUTCMonth() + 1).padStart(2, "0");
          const d = String(t.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        });

        const totals = rows.reduce(
          (acc, r) => {
            acc.clicks += Number(r.clicks);
            acc.orders += Number(r.paid);
            acc.revenue += Number(r.revenue ?? 0);
            acc.commission += Number(r.commission ?? 0);
            return acc;
          },
          { clicks: 0, orders: 0, revenue: 0, commission: 0 },
        );

        const series = rows.map((r, idx) => ({
          label: labels[idx]!,
          clicks: Number(r.clicks),
          orders: Number(r.paid),
          revenue: Number(r.revenue ?? 0),
          commission: Number(r.commission ?? 0),
        }));

        return {
          ok: true as const,
          range,
          type,
          labels,
          totals,
          buckets: series,
        };
      },
    });

    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được biểu đồ analytics." }, { status: 500 });
  }
}

