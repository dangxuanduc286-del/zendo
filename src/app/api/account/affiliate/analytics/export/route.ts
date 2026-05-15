import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAffiliateConversionFunnel, rangeStart } from "@/lib/affiliate-analytics";
import {
  assertAffiliateCampaignOwned,
  getAffiliateCampaignConversionFunnel,
  getAffiliateCampaignStatsByCampaign,
  getAffiliateCampaignTimeline,
} from "@/lib/affiliate-campaign-analytics";
import { getAffiliateGrowthInsightsPack } from "@/lib/affiliate-growth-insights";
import { getAffiliateLandingGrowthRows } from "@/lib/affiliate-landing-growth";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import { getAffiliateRevenueInsights } from "@/lib/affiliate-revenue-insights";
import { getAffiliateShortLinkStats } from "@/lib/affiliate-short-link-stats";
import {
  getAffiliateLandingAnalytics,
  getAffiliateTopLinks,
  getAffiliateTopProductsEnhanced,
  getAffiliateTrafficSources,
} from "@/lib/affiliate-traffic-analytics";
import { checkAffiliateExportThrottle } from "@/lib/affiliate-export-throttle";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const typeSchema = z.enum([
  "traffic",
  "conversions",
  "top-links",
  "top-products",
  "landing",
  "sources",
  "short-links",
  "revenue-insights",
  "campaign-summary",
  "campaign-detail",
  "funnel-report",
  "landing-growth",
  "growth-insights",
]);
const formatSchema = z.enum(["csv", "excel"]);
const campaignIdSchema = z.string().min(16).max(40);

function toCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function csvResponse(args: { filename: string; csv: string; format: z.infer<typeof formatSchema> }): NextResponse {
  const isExcel = args.format === "excel";
  const body = isExcel ? `\uFEFF${args.csv}` : args.csv;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": isExcel ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${args.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const maxPerHour = Math.min(120, Math.max(4, Number(process.env.AFFILIATE_EXPORT_MAX_PER_HOUR ?? "24")));
  const exTh = await checkAffiliateExportThrottle({ affiliateProfileId: auth.affiliateProfileId, maxPerHour });
  if (exTh.ok === false) {
    return NextResponse.json(
      { ok: false, message: "Bạn đã đạt giới hạn xuất file theo giờ. Thử lại sau." },
      { status: 429, headers: { "Retry-After": String(exTh.retryAfterSec) } },
    );
  }

  const rl = await applyAnalyticsRateLimit({ key: `ex:${auth.customerId}`, windowMs: 30_000, max: 8 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn xuất file quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const type = typeSchema.safeParse(searchParams.get("type") ?? undefined).success
    ? typeSchema.parse(searchParams.get("type") ?? undefined)
    : "traffic";
  const format = formatSchema.safeParse(searchParams.get("format") ?? undefined).success
    ? formatSchema.parse(searchParams.get("format") ?? undefined)
    : "csv";
  const filters = parseAffiliateTrafficFilters(searchParams);
  const since = rangeStart(range);
  const ext = format === "excel" ? "xls" : "csv";
  const campaignIdRaw = searchParams.get("campaignId")?.trim() ?? "";
  const campaignId = campaignIdSchema.safeParse(campaignIdRaw).success ? campaignIdSchema.parse(campaignIdRaw) : null;

  try {
    if (type === "traffic") {
      const rows = await db.affiliateTrafficEvent.findMany({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          createdAt: { gte: since },
          eventType: "AFFILIATE_CLICK",
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: {
          id: true,
          createdAt: true,
          sessionId: true,
          pathname: true,
          referrer: true,
          device: true,
          country: true,
        },
      });
      const header = ["id", "createdAt", "sessionId", "pathname", "referrer", "device", "country"];
      const lines = rows.map((r) =>
        [r.id, r.createdAt.toISOString(), r.sessionId ?? "", r.pathname ?? "", r.referrer ?? "", r.device ?? "", r.country ?? ""]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-traffic-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "conversions") {
      const rows = await db.affiliateTrafficEvent.findMany({
        where: {
          affiliateProfileId: auth.affiliateProfileId,
          createdAt: { gte: since },
          eventType: "ORDER_PAID",
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: {
          id: true,
          createdAt: true,
          orderId: true,
          revenue: true,
          commission: true,
          pathname: true,
        },
      });
      const header = ["id", "createdAt", "orderId", "revenue", "commission", "pathname"];
      const lines = rows.map((r) =>
        [r.id, r.createdAt.toISOString(), r.orderId ?? "", String(Number(r.revenue ?? 0)), String(Number(r.commission ?? 0)), r.pathname ?? ""]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-conversions-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "top-links") {
      const rows = await getAffiliateTopLinks({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
        filters,
        take: 500,
        skip: 0,
      });
      const header = ["pathname", "clicks", "visitors", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.pathname, String(r.clicks), String(r.visitors), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-top-links-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "top-products") {
      const rows = await getAffiliateTopProductsEnhanced({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
        filters,
        take: 200,
        sort: "clicks",
      });
      const header = ["productId", "productName", "clicks", "visitors", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [
          r.productId,
          r.productName,
          String(r.clicks),
          String(r.visitors),
          String(r.paidOrders),
          String(r.revenue),
          String(r.commission),
          String(r.conversionRate),
        ]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-top-products-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "landing") {
      const rows = await getAffiliateLandingAnalytics({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
        filters,
        take: 500,
        skip: 0,
      });
      const header = ["pathname", "visits", "clicks", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.pathname, String(r.visits), String(r.clicks), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-landing-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "short-links") {
      const rows = await getAffiliateShortLinkStats({ db, affiliateProfileId: auth.affiliateProfileId, range });
      const header = ["slug", "label", "targetPathname", "active", "clicks", "visitors", "orders", "revenue", "commission", "utmSource"];
      const lines = rows.map((r) =>
        [
          r.slug ?? "",
          r.label ?? "",
          r.targetPathname,
          r.isActive ? "1" : "0",
          String(r.clicks),
          String(r.visitors),
          String(r.orders),
          String(r.revenue),
          String(r.commission),
          r.topSource ?? "",
        ]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-short-links-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "revenue-insights") {
      const ins = await getAffiliateRevenueInsights({ db, affiliateProfileId: auth.affiliateProfileId, range });
      const header = ["metric", "value"];
      const lines = [
        ["strongestDay", ins.strongestDayLabel ?? ""],
        ["bestSource", ins.bestSourceLabel ?? ""],
        ["trendingProduct", ins.trendingProductName ?? ""],
        ["topLanding", ins.topLandingPath ?? ""],
      ].map((pair) => pair.map((c) => toCsvCell(String(c))).join(","));
      return csvResponse({ filename: `ctv-revenue-insights-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "sources") {
      const rows = await getAffiliateTrafficSources({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
        filters,
      });
      const header = ["source", "clicks", "visitors", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.source, String(r.clicks), String(r.visitors), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-sources-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "campaign-summary") {
      const [campaignRows, stats] = await Promise.all([
        db.affiliateCampaign.findMany({
          where: { affiliateProfileId: auth.affiliateProfileId },
          orderBy: { updatedAt: "desc" },
          take: 120,
          select: {
            id: true,
            name: true,
            utmSource: true,
            defaultSubid: true,
            isActive: true,
            archivedAt: true,
            createdAt: true,
          },
        }),
        getAffiliateCampaignStatsByCampaign({ db, affiliateProfileId: auth.affiliateProfileId, range }),
      ]);
      const header = [
        "campaignId",
        "name",
        "utmSource",
        "defaultSubid",
        "isActive",
        "archived",
        "createdAt",
        "clicks",
        "visitors",
        "orders",
        "revenue",
        "commission",
        "conversionRate",
        "epc",
      ];
      const lines = campaignRows.map((c) => {
        const s = stats.get(c.id);
        const clicks = s?.clicks ?? 0;
        const orders = s?.orders ?? 0;
        const revenue = s?.revenue ?? 0;
        const commission = s?.commission ?? 0;
        const visitors = s?.visitors ?? 0;
        const conv = clicks > 0 ? orders / clicks : 0;
        const epc = clicks > 0 ? commission / clicks : 0;
        return [
          c.id,
          c.name,
          c.utmSource ?? "",
          c.defaultSubid ?? "",
          c.isActive ? "1" : "0",
          c.archivedAt ? "1" : "0",
          c.createdAt.toISOString(),
          String(clicks),
          String(visitors),
          String(orders),
          String(revenue),
          String(commission),
          String(conv),
          String(epc),
        ]
          .map((cell) => toCsvCell(String(cell)))
          .join(",");
      });
      return csvResponse({ filename: `ctv-campaigns-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "campaign-detail") {
      if (!campaignId) {
        return NextResponse.json({ ok: false, message: "Thiếu campaignId." }, { status: 400 });
      }
      const owned = await assertAffiliateCampaignOwned({ db, affiliateProfileId: auth.affiliateProfileId, campaignId });
      if (!owned) {
        return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
      }
      const [statsMap, timeline, funnel] = await Promise.all([
        getAffiliateCampaignStatsByCampaign({ db, affiliateProfileId: auth.affiliateProfileId, range }),
        getAffiliateCampaignTimeline({ db, affiliateProfileId: auth.affiliateProfileId, campaignId, range }),
        getAffiliateCampaignConversionFunnel({ db, affiliateProfileId: auth.affiliateProfileId, campaignId, range }),
      ]);
      const s = statsMap.get(campaignId);
      const summaryHeader = ["metric", "value"];
      const summaryLines = [
        ["campaignName", owned.name],
        ["clicks", String(s?.clicks ?? 0)],
        ["visitors", String(s?.visitors ?? 0)],
        ["orders", String(s?.orders ?? 0)],
        ["revenue", String(s?.revenue ?? 0)],
        ["commission", String(s?.commission ?? 0)],
      ].map((pair) => pair.map((c) => toCsvCell(String(c))).join(","));
      const tlHeader = ["label", "clicks", "orders", "revenue", "commission", "conversionRate"];
      const tlLines = timeline.map((b) =>
        [b.label, String(b.clicks), String(b.orders), String(b.revenue), String(b.commission), String(b.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const fnHeader = ["step", "count", "dropoff", "conversionPct"];
      const fnLines = funnel.map((row) =>
        [row.step, String(row.count), String(row.dropoff), String(row.conversionPct)].map((c) => toCsvCell(String(c))).join(","),
      );
      const csv = [
        "# summary",
        summaryHeader.join(","),
        ...summaryLines,
        "",
        "# timeline",
        tlHeader.join(","),
        ...tlLines,
        "",
        "# funnel",
        fnHeader.join(","),
        ...fnLines,
      ].join("\n");
      return csvResponse({ filename: `ctv-campaign-${campaignId}-${range}.${ext}`, csv, format });
    }

    if (type === "funnel-report") {
      if (campaignId) {
        const owned = await assertAffiliateCampaignOwned({ db, affiliateProfileId: auth.affiliateProfileId, campaignId });
        if (!owned) {
          return NextResponse.json({ ok: false, message: "Không tìm thấy." }, { status: 404 });
        }
        const funnel = await getAffiliateCampaignConversionFunnel({
          db,
          affiliateProfileId: auth.affiliateProfileId,
          campaignId,
          range,
        });
        const header = ["scope", "step", "count", "dropoff", "conversionPct"];
        const lines = funnel.map((row) =>
          ["campaign", row.step, String(row.count), String(row.dropoff), String(row.conversionPct)]
            .map((c) => toCsvCell(String(c)))
            .join(","),
        );
        return csvResponse({ filename: `ctv-funnel-campaign-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
      }
      const funnel = await getAffiliateConversionFunnel({ db, affiliateProfileId: auth.affiliateProfileId, range });
      const header = ["scope", "step", "count", "dropoff", "conversionPct"];
      const lines = funnel.map((row) =>
        ["profile", row.step, String(row.count), String(row.dropoff), String(row.conversionPct)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-funnel-profile-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "landing-growth") {
      const rows = await getAffiliateLandingGrowthRows({
        db,
        affiliateProfileId: auth.affiliateProfileId,
        range,
        filters,
        take: 80,
      });
      const header = ["pathname", "visits", "clicks", "orders", "revenue", "commission", "conversionRate", "epc", "topSource"];
      const lines = rows.map((r) =>
        [
          r.pathname,
          String(r.visits),
          String(r.clicks),
          String(r.orders),
          String(r.revenue),
          String(r.commission),
          String(r.conversionRate),
          String(r.epc),
          r.topSource ?? "",
        ]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      return csvResponse({ filename: `ctv-landing-growth-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    if (type === "growth-insights") {
      const ins = await getAffiliateGrowthInsightsPack({ db, affiliateProfileId: auth.affiliateProfileId, range });
      const header = ["metric", "value"];
      const lines = [
        ["bestSource", ins.bestSource ?? ""],
        ["bestCampaignId", ins.bestCampaign?.id ?? ""],
        ["bestCampaignName", ins.bestCampaign?.name ?? ""],
        ["bestCampaignCommission", String(ins.bestCampaign?.commission ?? "")],
        ["bestLandingPath", ins.bestLanding?.pathname ?? ""],
        ["bestLandingEpc", String(ins.bestLanding?.epc ?? "")],
        ["bestLandingTopSource", ins.bestLanding?.topSource ?? ""],
        ["strongestHour", ins.strongestHourLabel ?? ""],
        ["trendingProduct", ins.trendingProductName ?? ""],
      ].map((pair) => pair.map((c) => toCsvCell(String(c))).join(","));
      return csvResponse({ filename: `ctv-growth-insights-${range}.${ext}`, csv: [header.join(","), ...lines].join("\n"), format });
    }

    return NextResponse.json({ ok: false, message: "Loại export không hỗ trợ." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "Không xuất được file." }, { status: 500 });
  }
}
