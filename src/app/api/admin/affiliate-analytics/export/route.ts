import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rangeStart } from "@/lib/affiliate-analytics";
import { getAdminTopAffiliates } from "@/lib/admin-affiliate-analytics";
import { scanAffiliateFraudSignals } from "@/lib/affiliate-fraud-detection";
import { parseAffiliateTrafficFilters } from "@/lib/affiliate-traffic-filters";
import {
  getAffiliateLandingAnalytics,
  getAffiliateTopLinks,
  getAffiliateTopProductsEnhanced,
  getAffiliateTrafficSources,
} from "@/lib/affiliate-traffic-analytics";
import {
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
  applyAdminAffiliateAnalyticsRateLimit,
  adminAffiliateRateLimitRetryAfter,
  parseAdminOptionalAffiliateId,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const typeSchema = z.enum([
  "affiliates",
  "traffic",
  "conversions",
  "fraud",
  "top-links",
  "top-products",
  "landing",
  "sources",
]);
const formatSchema = z.enum(["csv", "excel"]);

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
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:export",
    windowMs: 30_000,
    max: 8,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn xuất file quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const type = typeSchema.safeParse(searchParams.get("type") ?? undefined).success
    ? typeSchema.parse(searchParams.get("type") ?? undefined)
    : "affiliates";
  const format = formatSchema.safeParse(searchParams.get("format") ?? undefined).success
    ? formatSchema.parse(searchParams.get("format") ?? undefined)
    : "csv";

  const since = rangeStart(range);
  const ext = format === "excel" ? "xls" : "csv";
  const affiliateProfileId = parseAdminOptionalAffiliateId(searchParams);
  const filters = parseAffiliateTrafficFilters(searchParams);

  try {
    if (type === "top-links") {
      const rows = await getAffiliateTopLinks({
        db,
        affiliateProfileId,
        range,
        filters,
        take: 2000,
        skip: 0,
      });
      const header = ["pathname", "clicks", "visitors", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.pathname, String(r.clicks), String(r.visitors), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `admin-top-links-${range}.${ext}`, csv, format });
    }

    if (type === "top-products") {
      if (!affiliateProfileId) {
        return NextResponse.json(
          { ok: false, message: "Thêm affiliateId vào URL để xuất top sản phẩm theo CTV." },
          { status: 400 },
        );
      }
      const rows = await getAffiliateTopProductsEnhanced({
        db,
        affiliateProfileId,
        range,
        filters,
        take: 500,
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
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `admin-top-products-${range}.${ext}`, csv, format });
    }

    if (type === "landing") {
      const rows = await getAffiliateLandingAnalytics({
        db,
        affiliateProfileId,
        range,
        filters,
        take: 2000,
        skip: 0,
      });
      const header = ["pathname", "visits", "clicks", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.pathname, String(r.visits), String(r.clicks), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `admin-landing-${range}.${ext}`, csv, format });
    }

    if (type === "sources") {
      const rows = await getAffiliateTrafficSources({ db, affiliateProfileId, range, filters });
      const header = ["source", "clicks", "visitors", "orders", "revenue", "commission", "conversionRate"];
      const lines = rows.map((r) =>
        [r.source, String(r.clicks), String(r.visitors), String(r.orders), String(r.revenue), String(r.commission), String(r.conversionRate)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `admin-sources-${range}.${ext}`, csv, format });
    }

    if (type === "affiliates") {
      const { rows } = await getAdminTopAffiliates({
        db,
        range,
        page: 1,
        pageSize: 500,
        sort: "clicks",
        dir: "desc",
        q: "",
        status: "ALL",
        online: "ALL",
      });
      const header = [
        "affiliateProfileId",
        "refCode",
        "displayName",
        "status",
        "online",
        "clicks",
        "paidOrders",
        "revenue",
        "commission",
        "conversionRate",
        "EPC",
        "RPM",
      ];
      const lines = rows.map((r) =>
        [
          r.affiliateProfileId,
          r.refCode,
          r.displayName ?? "",
          r.status,
          r.online ? "yes" : "no",
          String(r.clicks),
          String(r.paidOrders),
          String(r.revenue),
          String(r.commission),
          String(r.conversionRate),
          String(r.EPC),
          String(r.RPM),
        ]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `affiliate-affiliates-${range}.${ext}`, csv, format });
    }

    if (type === "traffic") {
      const rows = await db.affiliateTrafficEvent.findMany({
        where: { createdAt: { gte: since }, eventType: "AFFILIATE_CLICK" },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: {
          id: true,
          createdAt: true,
          affiliateProfileId: true,
          sessionId: true,
          pathname: true,
          country: true,
          device: true,
        },
      });
      const header = ["id", "createdAt", "affiliateProfileId", "sessionId", "pathname", "country", "device"];
      const lines = rows.map((r) =>
        [r.id, r.createdAt.toISOString(), r.affiliateProfileId, r.sessionId ?? "", r.pathname ?? "", r.country ?? "", r.device ?? ""]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `affiliate-traffic-${range}.${ext}`, csv, format });
    }

    if (type === "conversions") {
      const rows = await db.affiliateTrafficEvent.findMany({
        where: { createdAt: { gte: since }, eventType: "ORDER_PAID" },
        orderBy: { createdAt: "desc" },
        take: 2000,
        select: {
          id: true,
          createdAt: true,
          affiliateProfileId: true,
          orderId: true,
          revenue: true,
          commission: true,
          pathname: true,
        },
      });
      const header = ["id", "createdAt", "affiliateProfileId", "orderId", "revenue", "commission", "pathname"];
      const lines = rows.map((r) =>
        [
          r.id,
          r.createdAt.toISOString(),
          r.affiliateProfileId,
          r.orderId ?? "",
          String(Number(r.revenue ?? 0)),
          String(Number(r.commission ?? 0)),
          r.pathname ?? "",
        ]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return csvResponse({ filename: `affiliate-conversions-${range}.${ext}`, csv, format });
    }

    const scan = await scanAffiliateFraudSignals({
      db,
      since,
      maxAffiliates: 200,
      maxSessions: 200,
      maxIps: 200,
    });
    const header = ["kind", "id", "severity", "detail1", "detail2", "detail3"];
    const lines: string[] = [];
    for (const a of scan.affiliates) {
      lines.push(
        ["affiliate", a.affiliateProfileId, a.severity, a.refCode, a.displayName ?? "", a.signals.join(" | ")]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
    }
    for (const s of scan.suspiciousSessions) {
      lines.push(
        ["session", s.sessionId, s.severity, s.affiliateProfileId, s.refCode, String(s.clickCount)]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
    }
    for (const i of scan.suspiciousIps) {
      lines.push(
        ["ip", i.ip, i.severity, String(i.clickCount), String(i.affiliateProfileCount), ""]
          .map((c) => toCsvCell(String(c)))
          .join(","),
      );
    }
    const csv = [header.join(","), ...lines].join("\n");
    return csvResponse({ filename: `affiliate-fraud-${range}.${ext}`, csv, format });
  } catch {
    return NextResponse.json({ ok: false, message: "Không xuất được file." }, { status: 500 });
  }
}
