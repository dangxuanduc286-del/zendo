import type { Prisma } from "@prisma/client";
import { comparePeriods, type PeriodComparison } from "../analytics/compare";
import {
  congNgayTheoMocVietNam,
  layMocDauNgayHomNayVietNam,
  layMocDauNgayKeTiepVietNam,
  layMocDauNamNayVietNam,
  layMocDauThangNayVietNam,
  layThanhPhanNgayGioVietNam,
  taoMocUtcTuNgayGioVietNam,
} from "../analytics/timezone";
import { chuanHoaPathname } from "../analytics/source";
import { xacDinhLoaiThietBiTuUserAgent } from "../analytics/device-type";
import { normalizeAnalyticsEventName } from "../analytics/event-contract";
import { getDbClientAnalytics } from "../analytics/queries-shared";
import { getWebsiteSettings } from "../settings";

type Preset = "today" | "7d" | "30d" | "month" | "year";
type DeviceFilter = "all" | "desktop" | "mobile" | "tablet";

const ENTITY_ANALYTICS_EVENT = "ANALYTICS_EVENT";

export interface AnalyticsFiltersInput {
  range?: string;
  from?: string;
  to?: string;
  pathname?: string;
  device?: string;
}

export interface AnalyticsRange {
  preset: Preset;
  start: Date;
  end: Date;
}

export type AnalyticsTrendV2 = "up" | "down" | "neutral";

export interface AnalyticsKpiMetricV2 {
  value: number;
  previousValue: number;
  diff: number;
  percentChange: number | null;
  trend: AnalyticsTrendV2;
}

export interface AdminAnalyticsSettingsStateV2 {
  siteName: string;
  timezone: string;
  currency: string;
  analyticsEnabled: boolean;
  trackingEnabled: boolean;
  remarketingEventsEnabled: boolean;
  affiliateEnabled: boolean;
  ga4Enabled: boolean;
  ga4MeasurementId: string | null;
  metaPixelEnabled: boolean;
  metaPixelId: string | null;
  tiktokPixelEnabled: boolean;
  tiktokPixelId: string | null;
  zaloPixelEnabled: boolean;
  zaloPixelId: string | null;
}

export interface AdminAnalyticsDataQualityV2 {
  totalCard: number;
  chartTotal: number;
  rawCount: number;
  isMatched: boolean;
  badgeLabel: string;
}

export interface AdminAnalyticsChartPointV2 {
  key: string;
  label: string;
  value: number;
}

export interface AdminAnalyticsChartDataV2 {
  visitsByDay: AdminAnalyticsChartPointV2[];
  ordersByDay: AdminAnalyticsChartPointV2[];
  revenueByDay: AdminAnalyticsChartPointV2[];
  visitsByMonth: AdminAnalyticsChartPointV2[];
  visitsByYear: AdminAnalyticsChartPointV2[];
  submitOrderEventsByDay: AdminAnalyticsChartPointV2[];
  conversionByDay: AdminAnalyticsChartPointV2[];
}

export interface AdminAnalyticsFunnelStepV2 {
  key: string;
  label: string;
  value: number;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
}

export interface AdminAnalyticsFunnelV2 {
  pageviews: AdminAnalyticsFunnelStepV2;
  productViews: AdminAnalyticsFunnelStepV2;
  addToCart: AdminAnalyticsFunnelStepV2;
  beginCheckout: AdminAnalyticsFunnelStepV2;
  submitOrder: AdminAnalyticsFunnelStepV2;
  paidOrder: AdminAnalyticsFunnelStepV2;
  paidRevenue: AdminAnalyticsFunnelStepV2;
  strongestDropOffStep: string | null;
}

export interface AdminAnalyticsAbandonmentV2 {
  addToCartWithoutCheckout: number;
  checkoutWithoutSubmit: number;
  submitWithoutPaid: number;
}

export interface AdminAnalyticsBreakdownRowV2 {
  key: string;
  label: string;
  visits: number;
  share: number;
}

export interface AdminAnalyticsBreakdownV2 {
  sourceBreakdown: AdminAnalyticsBreakdownRowV2[];
  deviceBreakdown: AdminAnalyticsBreakdownRowV2[];
  browserBreakdown: AdminAnalyticsBreakdownRowV2[];
}

export interface AdminAnalyticsRecentVisitV2 {
  time: string;
  pathname: string;
  referrer: string | null;
  source: string;
  device: string;
  browser: string;
  os: string;
  userAgentShort: string;
  visitorKey?: string | null;
  sessionKey?: string | null;
}

export interface AdminAnalyticsTopTablesV2 {
  topPages: Array<{ pathname: string; visits: number; share: number; trend: PeriodComparison["trend"] }>;
  topLandingPages: Array<{ pathname: string; visits: number; share: number }>;
  topReferrersByOrdersRevenue: Array<{ key: string; label: string; orders: number; revenue: number }>;
  topProductsByOrdersRevenue: Array<{
    productId: string;
    productName: string;
    productSlug: string | null;
    orders: number;
    revenue: number;
    views: number;
    addToCart: number;
  }>;
  topPagesByConversion: Array<{ pathname: string; visits: number; conversions: number; paid: number | null; revenue: number | null; rate: number | null }>;
  topLandingByConversion: Array<{ pathname: string; visits: number; conversions: number; paid: number | null; revenue: number | null; rate: number | null }>;
}

export interface AdminAnalyticsBusinessOverviewV2 {
  orders: AnalyticsKpiMetricV2;
  paidOrders: AnalyticsKpiMetricV2;
  paidRevenue: AnalyticsKpiMetricV2;
  averageOrderValue: AnalyticsKpiMetricV2;
  conversionRate: AnalyticsKpiMetricV2;
  paidConversionRate: AnalyticsKpiMetricV2;
  revenuePerVisit: AnalyticsKpiMetricV2;
  pageViewEvents: AnalyticsKpiMetricV2;
  productViewEvents: AnalyticsKpiMetricV2;
  addToCartEvents: AnalyticsKpiMetricV2;
  beginCheckoutEvents: AnalyticsKpiMetricV2;
  submitOrderEvents: AnalyticsKpiMetricV2;
  paidOrderEvents: AnalyticsKpiMetricV2;
}

export interface AdminAnalyticsTrafficOverviewV2 {
  today: AnalyticsKpiMetricV2;
  sevenDays: AnalyticsKpiMetricV2;
  thirtyDays: AnalyticsKpiMetricV2;
  thisMonth: AnalyticsKpiMetricV2;
  thisYear: AnalyticsKpiMetricV2;
  currentPageviews: AnalyticsKpiMetricV2;
  uniqueVisitors: AnalyticsKpiMetricV2;
  returningVisitors: AnalyticsKpiMetricV2;
  topLanding: AnalyticsKpiMetricV2;
}

export interface AdminAnalyticsDashboardV2 {
  range: AnalyticsRange;
  filters: { pathname: string; device: DeviceFilter };
  updatedAtIso: string;
  settingsState: AdminAnalyticsSettingsStateV2;
  dataQuality: AdminAnalyticsDataQualityV2;
  trafficOverview: AdminAnalyticsTrafficOverviewV2;
  businessOverview: AdminAnalyticsBusinessOverviewV2;
  chartData: AdminAnalyticsChartDataV2;
  funnel: AdminAnalyticsFunnelV2;
  abandonment: AdminAnalyticsAbandonmentV2;
  breakdown: AdminAnalyticsBreakdownV2;
  topTables: AdminAnalyticsTopTablesV2;
  recentVisits: AdminAnalyticsRecentVisitV2[];
}

export interface AdminAnalyticsDashboardData {
  range: AnalyticsRange;
  filters: { pathname: string; device: DeviceFilter };
  updatedAtIso: string;
  tracking: { enabled: boolean; analyticsEnabled: boolean; statusLabel: string };
  meta: { siteName: string; timezone: string; currency: string };
  health: { totalVisits: number; chartSum: number; rawPageviews: number; mismatch: number };
  kpis: {
    totalVisits: number;
    uniqueVisitors: number;
    returningVisitors: number;
    productViews: number;
    addToCart: number;
    beginCheckout: number;
    orderCreated: number;
    paidOrders: number;
    revenue: number;
    conversionRate: number | null;
    aov: number | null;
  };
  compare: {
    visits: PeriodComparison;
    orders: PeriodComparison;
    paidOrders: PeriodComparison;
    revenue: PeriodComparison;
  };
  funnel: { visit: number; productView: number; addToCart: number; beginCheckout: number; orderCreated: number; paidOrder: number };
  funnelDropoff: Array<{ from: string; to: string; dropCount: number; dropRate: number | null }>;
  funnelStrongestDrop: string | null;
  trendByDay: Array<{ key: string; label: string; visits: number; orders: number; revenue: number }>;
  referrerBreakdown: Array<{ key: string; visits: number; share: number }>;
  deviceBreakdown: Array<{ key: string; visits: number; share: number }>;
  browserBreakdown: Array<{ key: string; visits: number; share: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    productSlug: string | null;
    views: number;
    addToCart: number;
    orders: number;
    revenue: number;
  }>;
  topPages: Array<{ pathname: string; visits: number; share: number; trend: PeriodComparison["trend"] }>;
  topReferrers: Array<{ referrer: string; visits: number; share: number }>;
  topLandingPages: Array<{ pathname: string; visits: number; share: number }>;
  recentVisits: Array<{
    visitedAt: Date;
    pathname: string;
    referrer: string | null;
    deviceType: string | null;
    userAgent: string | null;
    visitorKey: string | null;
    sessionKey: string | null;
  }>;
}

function toPreset(value?: string): Preset {
  return value === "today" || value === "7d" || value === "30d" || value === "month" || value === "year" ? value : "7d";
}

function toDevice(value?: string): DeviceFilter {
  return value === "desktop" || value === "mobile" || value === "tablet" ? value : "all";
}

function parseDateInput(value?: string): Date | null {
  if (!value) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!matched) return null;
  return taoMocUtcTuNgayGioVietNam({ nam: Number(matched[1]), thang: Number(matched[2]), ngay: Number(matched[3]) });
}

function computeRange(input: AnalyticsFiltersInput): AnalyticsRange {
  const now = new Date();
  const preset = toPreset(input.range);
  const end = layMocDauNgayKeTiepVietNam(now);
  const dayOffset = preset === "today" ? -1 : preset === "30d" ? -30 : -7;
  let start = congNgayTheoMocVietNam(end, dayOffset);
  if (preset === "month") {
    const c = layThanhPhanNgayGioVietNam(now);
    start = taoMocUtcTuNgayGioVietNam({ nam: c.nam, thang: c.thang, ngay: 1 });
  }
  if (preset === "year") {
    const c = layThanhPhanNgayGioVietNam(now);
    start = taoMocUtcTuNgayGioVietNam({ nam: c.nam, thang: 1, ngay: 1 });
  }
  const from = parseDateInput(input.from);
  const to = parseDateInput(input.to);
  if (from && to) {
    const endExclusive = congNgayTheoMocVietNam(to, 1);
    if (from.getTime() < endExclusive.getTime()) return { preset, start: from, end: endExclusive };
  }
  return { preset, start, end };
}

function previousExclusiveRange(start: Date, end: Date): { start: Date; end: Date } {
  const ms = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - ms), end: start };
}

function buildKpiMetric(current: number, previous: number): AnalyticsKpiMetricV2 {
  const value = Number.isFinite(current) ? current : 0;
  const previousValue = Number.isFinite(previous) ? previous : 0;
  const diff = value - previousValue;
  let trend: AnalyticsTrendV2 = "neutral";
  if (diff > 0) trend = "up";
  else if (diff < 0) trend = "down";
  const percentChange = previousValue === 0 ? null : (diff / previousValue) * 100;
  return { value, previousValue, diff, percentChange, trend };
}

function kpiMetricToPeriodComparison(k: AnalyticsKpiMetricV2): PeriodComparison {
  const trend = k.trend === "up" ? "up" : k.trend === "down" ? "down" : "flat";
  const pct =
    k.percentChange == null
      ? k.previousValue === 0 && k.value === 0
        ? 0
        : k.previousValue === 0
          ? 100
          : 0
      : k.percentChange;
  return {
    currentTotal: k.value,
    previousTotal: k.previousValue,
    difference: k.diff,
    percentChange: pct,
    trend,
  };
}

function formatDayLabelVi(isoKey: string): string {
  const [y, m, d] = isoKey.split("-").map(Number);
  if (!y || !m || !d) return isoKey;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function dayKeyInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const STATIC_EXT = /\.(png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf|eot|pdf|zip)(\?|$)/i;

function isNoisePathname(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (!p || p === "/") return false;
  if (p.startsWith("/admin")) return true;
  if (p.startsWith("/api")) return true;
  if (p.startsWith("/_next")) return true;
  if (p.includes("favicon")) return true;
  if (p.includes("wp-login") || p.includes("wordpress")) return true;
  if (p.includes("_rsc")) return true;
  if (STATIC_EXT.test(p)) return true;
  return false;
}

function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|discord|lighthouse|pagespeed|headless|phantom|python-requests|curl\/|wget|httpie|go-http|java\/|okhttp)/i.test(
    u,
  );
}

function isAdminTraffic(pathname: string, ua: string | null | undefined): boolean {
  if (pathname.toLowerCase().startsWith("/admin")) return true;
  if (!ua) return false;
  return /admin|postman|insomnia|apachebench/i.test(ua);
}

type PageVisitRow = {
  pathname: string;
  referrer: string | null;
  visitedAt: Date;
  userAgent: string | null;
  deviceType: string | null;
  visitorKey: string | null;
  sessionKey: string | null;
  ip: string | null;
};

function visitIdentity(v: PageVisitRow): string {
  if (v.visitorKey?.trim()) return `v:${v.visitorKey.trim()}`;
  if (v.sessionKey?.trim()) return `s:${v.sessionKey.trim()}`;
  const ip = v.ip?.trim() ?? "";
  const ua = (v.userAgent ?? "").slice(0, 80);
  return `a:${ip}|${ua}`;
}

function filterVisitRow(
  row: PageVisitRow,
  pathnameFilter: string,
  deviceFilter: DeviceFilter,
): PageVisitRow | null {
  const pathname = chuanHoaPathname(row.pathname);
  if (pathnameFilter && !pathname.toLowerCase().includes(pathnameFilter)) return null;
  if (isNoisePathname(pathname)) return null;
  if (isBotUserAgent(row.userAgent)) return null;
  if (isAdminTraffic(pathname, row.userAgent)) return null;
  const device = (row.deviceType ?? xacDinhLoaiThietBiTuUserAgent(row.userAgent)).toLowerCase();
  if (deviceFilter !== "all" && device !== deviceFilter) return null;
  return { ...row, pathname };
}

function dedupePageVisits(rows: PageVisitRow[], windowMs: number): PageVisitRow[] {
  if (windowMs <= 0) return rows;
  const sorted = [...rows].sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime());
  const out: PageVisitRow[] = [];
  const last = new Map<string, number>();
  for (const row of sorted) {
    const key = `${visitIdentity(row)}|${row.pathname}`;
    const t = row.visitedAt.getTime();
    const prev = last.get(key);
    if (prev != null && t - prev < windowMs) continue;
    last.set(key, t);
    out.push(row);
  }
  return out;
}

type SourceBucket = "direct" | "google" | "facebook" | "tiktok" | "zalo" | "affiliate" | "other";

const SOURCE_LABELS: Record<SourceBucket, string> = {
  direct: "Direct",
  google: "Google",
  facebook: "Facebook",
  tiktok: "TikTok",
  zalo: "Zalo",
  affiliate: "Affiliate/CTV",
  other: "Other",
};

function classifySourceBucket(referrer: string | null, pathname: string): SourceBucket {
  const path = pathname.toLowerCase();
  if (/[?&](utm_source|ref|affiliate|aff)=/i.test(path) || /affiliate|ctv|collab/i.test(path)) return "affiliate";
  if (!referrer?.trim()) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (!host) return "direct";
  if (host.includes("google.") || host === "google.com") return "google";
  if (host.includes("facebook.") || host.includes("fb.") || host.includes("instagram.com")) return "facebook";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("zalo.me") || host.includes("zalo.")) return "zalo";
  return "other";
}

type DeviceBucket = "desktop" | "mobile" | "tablet" | "unknown";

const DEVICE_LABELS: Record<DeviceBucket, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Unknown",
};

function classifyDeviceBucket(deviceType: string | null, ua: string | null): DeviceBucket {
  const raw = (deviceType ?? xacDinhLoaiThietBiTuUserAgent(ua)).toLowerCase();
  if (raw === "mobile") return "mobile";
  if (raw === "tablet") return "tablet";
  if (raw === "desktop") return "desktop";
  return "unknown";
}

type BrowserBucket = "chrome" | "safari" | "edge" | "firefox" | "coccoc" | "other";

const BROWSER_LABELS: Record<BrowserBucket, string> = {
  chrome: "Chrome",
  safari: "Safari",
  edge: "Edge",
  firefox: "Firefox",
  coccoc: "Cốc Cốc",
  other: "Other",
};

function classifyBrowserBucket(ua: string | null): BrowserBucket {
  if (!ua) return "other";
  const u = ua.toLowerCase();
  if (u.includes("coc_coc") || u.includes("coccoc")) return "coccoc";
  if (u.includes("edg/") || u.includes("edge/")) return "edge";
  if (u.includes("chrome") && !u.includes("edg")) return "chrome";
  if (u.includes("firefox")) return "firefox";
  if (u.includes("safari") && !u.includes("chrome")) return "safari";
  return "other";
}

function classifyOsShort(ua: string | null): string {
  if (!ua) return "-";
  const u = ua.toLowerCase();
  if (u.includes("windows")) return "Windows";
  if (u.includes("android")) return "Android";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("mac os")) return u.includes("iphone") ? "iOS" : u.includes("ipad") ? "iPadOS" : "macOS";
  if (u.includes("linux")) return "Linux";
  return "Khác";
}

function shortenUserAgent(value: string | null, max = 52): string {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, " ").trim();
  const firstChunk = compact.split(") ")[0];
  const normalized = firstChunk.includes("(") ? `${firstChunk})` : firstChunk;
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function docMeta(meta: Prisma.JsonValue | null, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

type AuditRow = { id: string; action: string; createdAt: Date; metadata: Prisma.JsonValue | null };

function parseEventAction(action: string): string | null {
  if (!action.startsWith("event:")) return null;
  const raw = action.slice("event:".length);
  const normalized = normalizeAnalyticsEventName(raw);
  return normalized ?? (raw === "order_created" ? "submit_order" : null);
}

function paidOrderWhere(): Prisma.OrderWhereInput {
    return {
    AND: [
      {
        OR: [{ paymentStatus: "PAID" }, { orderStatus: "COMPLETED" }],
      },
      {
        NOT: {
          OR: [{ orderStatus: { in: ["CANCELED", "REFUNDED"] } }, { paymentStatus: "REFUNDED" }],
        },
      },
    ],
  };
}

function countVisitsInRange(
  rows: PageVisitRow[],
  start: Date,
  end: Date,
  pathnameFilter: string,
  deviceFilter: DeviceFilter,
  dedupe: boolean,
): number {
  let n = 0;
  const list = dedupe ? dedupePageVisits(rows, 5000) : rows;
  for (const row of list) {
    if (row.visitedAt < start || row.visitedAt >= end) continue;
    if (filterVisitRow(row, pathnameFilter, deviceFilter) == null) continue;
    n += 1;
  }
  return n;
}

function visitsForTopLanding(rows: PageVisitRow[], start: Date, end: Date, pathnameFilter: string, deviceFilter: DeviceFilter): { topPath: string; count: number } {
  const counts = new Map<string, number>();
  const filtered = dedupePageVisits(rows, 5000);
  for (const row of filtered) {
    if (row.visitedAt < start || row.visitedAt >= end) continue;
    const f = filterVisitRow(row, pathnameFilter, deviceFilter);
    if (!f) continue;
    counts.set(f.pathname, (counts.get(f.pathname) ?? 0) + 1);
  }
  let topPath = "/";
  let count = 0;
  for (const [k, v] of counts) {
    if (v > count) {
      count = v;
      topPath = k;
    }
  }
  return { topPath, count };
}

async function loadPageVisitsUnion(
  db: NonNullable<Awaited<ReturnType<typeof getDbClientAnalytics>>>,
  unionStart: Date,
  unionEnd: Date,
): Promise<{ rows: PageVisitRow[]; rawCount: number }> {
  try {
    const rawCount = await db.pageVisit.count({
      where: { visitedAt: { gte: unionStart, lt: unionEnd } },
    });
    const rows = await db.pageVisit.findMany({
      where: { visitedAt: { gte: unionStart, lt: unionEnd } },
      select: {
        pathname: true,
        referrer: true,
        visitedAt: true,
        userAgent: true,
        deviceType: true,
        visitorKey: true,
        sessionKey: true,
        ip: true,
      },
      orderBy: { visitedAt: "asc" },
    });
    return { rows: rows as PageVisitRow[], rawCount };
  } catch {
    return { rows: [], rawCount: 0 };
  }
}

async function loadAuditUnion(
  db: NonNullable<Awaited<ReturnType<typeof getDbClientAnalytics>>>,
  unionStart: Date,
  unionEnd: Date,
): Promise<AuditRow[]> {
  try {
    return (await db.auditLog.findMany({
    where: {
        entity: ENTITY_ANALYTICS_EVENT,
        createdAt: { gte: unionStart, lt: unionEnd },
    },
      select: { id: true, action: true, createdAt: true, metadata: true },
    orderBy: { createdAt: "asc" },
    })) as AuditRow[];
  } catch {
    return [];
  }
}

function countEventsInRange(
  audits: AuditRow[],
  eventName: string,
  start: Date,
  end: Date,
): number {
  let n = 0;
  for (const row of audits) {
    if (row.createdAt < start || row.createdAt >= end) continue;
    const ev = parseEventAction(row.action);
    if (ev === eventName) n += 1;
  }
  return n;
}

function distinctOrderIdsInRange(audits: AuditRow[], eventName: string, start: Date, end: Date): Set<string> {
  const set = new Set<string>();
  for (const row of audits) {
    if (row.createdAt < start || row.createdAt >= end) continue;
    if (parseEventAction(row.action) !== eventName) continue;
    const oid = docMeta(row.metadata, "orderId");
    if (oid) set.add(oid);
  }
  return set;
}

function aggregateDayMap(
  rows: PageVisitRow[],
  start: Date,
  end: Date,
  pathnameFilter: string,
  deviceFilter: DeviceFilter,
  timeZone: string,
): Map<string, number> {
  const map = new Map<string, number>();
  const deduped = dedupePageVisits(rows, 5000);
  for (const row of deduped) {
    if (row.visitedAt < start || row.visitedAt >= end) continue;
    const f = filterVisitRow(row, pathnameFilter, deviceFilter);
    if (!f) continue;
    const key = dayKeyInTz(f.visitedAt, timeZone);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function fillChartFromDayMap(
  map: Map<string, number>,
  start: Date,
  end: Date,
  timeZone: string,
): AdminAnalyticsChartPointV2[] {
  const out: AdminAnalyticsChartPointV2[] = [];
  const cur = new Date(start.getTime());
  const endMs = end.getTime();
  while (cur.getTime() < endMs) {
    const key = dayKeyInTz(cur, timeZone);
    out.push({ key, label: formatDayLabelVi(key), value: map.get(key) ?? 0 });
    cur.setTime(cur.getTime() + 86400000);
  }
  return out;
}

async function aggregateOrdersForRange(
  db: NonNullable<Awaited<ReturnType<typeof getDbClientAnalytics>>>,
  start: Date,
  end: Date,
): Promise<{ orders: number; paidOrders: number; revenue: number }> {
  try {
    const [orders, paidAgg] = await Promise.all([
      db.order.count({
        where: {
          createdAt: { gte: start, lt: end },
          NOT: { orderStatus: { in: ["CANCELED", "REFUNDED"] } },
        },
      }),
      db.order.aggregate({
        where: {
          createdAt: { gte: start, lt: end },
          ...paidOrderWhere(),
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);
    const paidOrders = paidAgg._count._all;
    const revenue = Number(paidAgg._sum.totalAmount ?? 0);
    return { orders, paidOrders, revenue };
  } catch {
    return { orders: 0, paidOrders: 0, revenue: 0 };
  }
}

function ordersByDayFromDb(
  orders: Array<{ createdAt: Date; totalAmount: unknown }>,
  paidFilter: (o: { createdAt: Date; totalAmount: unknown }) => boolean,
  start: Date,
  end: Date,
  timeZone: string,
  mode: "count" | "revenue",
): AdminAnalyticsChartPointV2[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (o.createdAt < start || o.createdAt >= end) continue;
    if (!paidFilter(o as never)) continue;
    const key = dayKeyInTz(o.createdAt, timeZone);
    const add = mode === "count" ? 1 : Number(o.totalAmount ?? 0);
    map.set(key, (map.get(key) ?? 0) + add);
  }
  return fillChartFromDayMap(map, start, end, timeZone);
}

function ytdComparableRange(now: Date): { cur: { start: Date; end: Date }; prev: { start: Date; end: Date } } {
  const end = layMocDauNgayKeTiepVietNam(now);
  const curStart = layMocDauNamNayVietNam(now);
  const elapsedMs = Math.min(now.getTime(), end.getTime()) - curStart.getTime();
  const prevYearStart = congNgayTheoMocVietNam(curStart, -365);
  const prevEnd = new Date(prevYearStart.getTime() + elapsedMs);
  return { cur: { start: curStart, end }, prev: { start: prevYearStart, end: prevEnd } };
}

function monthPreviousCalendarRange(now: Date): { cur: { start: Date; end: Date }; prev: { start: Date; end: Date } } {
  const end = layMocDauNgayKeTiepVietNam(now);
  const curStart = layMocDauThangNayVietNam(now);
  const c = layThanhPhanNgayGioVietNam(now);
  const prevMonth = c.thang <= 1 ? { nam: c.nam - 1, thang: 12 } : { nam: c.nam, thang: c.thang - 1 };
  const prevStart = taoMocUtcTuNgayGioVietNam({ nam: prevMonth.nam, thang: prevMonth.thang, ngay: 1 });
  const prevEnd = curStart;
  return { cur: { start: curStart, end }, prev: { start: prevStart, end: prevEnd } };
}

function rollingRange(endExclusive: Date, days: number): { start: Date; end: Date } {
  return { start: congNgayTheoMocVietNam(endExclusive, -days), end: endExclusive };
}

function buildFunnelStep(
  key: string,
  label: string,
  value: number,
  prevValue: number,
): AdminAnalyticsFunnelStepV2 {
  const conversionFromPrevious =
    prevValue === 0 ? (value === 0 ? 100 : null) : Math.min(100, (value / prevValue) * 100);
  const dropOffFromPrevious =
    conversionFromPrevious == null ? null : Math.max(0, 100 - conversionFromPrevious);
  return { key, label, value, conversionFromPrevious, dropOffFromPrevious };
}

function buildFunnelV2(args: {
  pageviews: number;
  productViews: number;
  addToCart: number;
  beginCheckout: number;
  submitOrder: number;
  paidOrder: number;
  paidRevenue: number;
}): AdminAnalyticsFunnelV2 {
  const steps = [
    buildFunnelStep("pageviews", "Lượt xem trang", args.pageviews, args.pageviews),
    buildFunnelStep("productViews", "Xem sản phẩm", args.productViews, args.pageviews),
    buildFunnelStep("addToCart", "Thêm vào giỏ", args.addToCart, args.productViews),
    buildFunnelStep("beginCheckout", "Bắt đầu thanh toán", args.beginCheckout, args.addToCart),
    buildFunnelStep("submitOrder", "Gửi đơn hàng", args.submitOrder, args.beginCheckout),
    buildFunnelStep("paidOrder", "Đơn đã thanh toán", args.paidOrder, args.submitOrder),
    buildFunnelStep("paidRevenue", "Doanh thu đã thanh toán (VNĐ)", args.paidRevenue, args.paidOrder),
  ];
  const stepObjs = [
    steps[1],
    steps[2],
    steps[3],
    steps[4],
    steps[5],
    steps[6],
  ];
  let strongest: string | null = null;
  let maxDrop = -1;
  for (const s of stepObjs) {
    const d = s.dropOffFromPrevious ?? 0;
    if (d > maxDrop) {
      maxDrop = d;
      strongest = s.key;
    }
  }
  return {
    pageviews: steps[0],
    productViews: steps[1],
    addToCart: steps[2],
    beginCheckout: steps[3],
    submitOrder: steps[4],
    paidOrder: steps[5],
    paidRevenue: steps[6],
    strongestDropOffStep: strongest,
  };
}

function shareBreakdown(map: Map<string, { label: string; visits: number }>, total: number): AdminAnalyticsBreakdownRowV2[] {
  const rows: AdminAnalyticsBreakdownRowV2[] = [];
  for (const [key, { label, visits }] of map) {
    rows.push({ key, label, visits, share: total > 0 ? (visits / total) * 100 : 0 });
  }
  return rows.sort((a, b) => b.visits - a.visits);
}

function sumRevenueFromOrderSet(orderIds: Set<string> | undefined, revenueByOrderId: Map<string, number>): number {
  if (!orderIds || orderIds.size === 0) return 0;
  let total = 0;
  for (const id of orderIds) {
    total += revenueByOrderId.get(id) ?? 0;
  }
  return total;
}

async function buildAdminAnalyticsDashboardV2Core(input: AnalyticsFiltersInput): Promise<AdminAnalyticsDashboardV2> {
  const settings = await getWebsiteSettings();
  const range = computeRange(input);
  const pathnameFilter = (input.pathname ?? "").trim().toLowerCase();
  const deviceFilter = toDevice(input.device);
  const timeZone = settings.timezone || "Asia/Ho_Chi_Minh";
  const now = new Date();
  const endExclusive = layMocDauNgayKeTiepVietNam(now);

  const prevMain = previousExclusiveRange(range.start, range.end);

  const todayStart = layMocDauNgayHomNayVietNam(now);
  const todayEnd = endExclusive;
  const yStart = congNgayTheoMocVietNam(todayStart, -1);
  const yEnd = todayStart;

  const r7 = rollingRange(endExclusive, 7);
  const p7 = rollingRange(r7.start, 7);
  const r30 = rollingRange(endExclusive, 30);
  const p30 = rollingRange(r30.start, 30);
  const monthRanges = monthPreviousCalendarRange(now);
  const yearRanges = ytdComparableRange(now);

  const unionStart = new Date(
    Math.min(
      range.start.getTime(),
      prevMain.start.getTime(),
      yStart.getTime(),
      p7.start.getTime(),
      p30.start.getTime(),
      monthRanges.prev.start.getTime(),
      yearRanges.prev.start.getTime(),
    ),
  );
  const unionEnd = new Date(
    Math.max(
      range.end.getTime(),
      prevMain.end.getTime(),
      todayEnd.getTime(),
      r7.end.getTime(),
      r30.end.getTime(),
      monthRanges.cur.end.getTime(),
      yearRanges.cur.end.getTime(),
    ),
  );

  const db = await getDbClientAnalytics();
  const [{ rows: visitRows, rawCount }, auditRows, ordersInUnion] = await Promise.all([
    db ? loadPageVisitsUnion(db, unionStart, unionEnd) : Promise.resolve({ rows: [], rawCount: 0 }),
    db ? loadAuditUnion(db, unionStart, unionEnd) : Promise.resolve([]),
    db
      ? db.order
          .findMany({
            where: { createdAt: { gte: unionStart, lt: unionEnd } },
            select: { id: true, createdAt: true, totalAmount: true, paymentStatus: true, orderStatus: true, affiliateProfileId: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const isPaidOrderRow = (o: {
    paymentStatus: string;
    orderStatus: string;
  }): boolean => {
    const paidLike =
      o.paymentStatus === "PAID" ||
      o.orderStatus === "COMPLETED";
    const bad = o.orderStatus === "CANCELED" || o.orderStatus === "REFUNDED" || o.paymentStatus === "REFUNDED";
    return paidLike && !bad;
  };

  const visitFilteredMain = visitRows.filter((r) => filterVisitRow(r, pathnameFilter, deviceFilter));
  const dedupedMain = dedupePageVisits(visitFilteredMain, 5000);
  const currentPageviews = dedupedMain.filter((r) => r.visitedAt >= range.start && r.visitedAt < range.end).length;
  const prevPageviews = dedupedMain.filter((r) => r.visitedAt >= prevMain.start && r.visitedAt < prevMain.end).length;

  const uniqueSet = new Set<string>();
  for (const r of dedupedMain) {
    if (r.visitedAt < range.start || r.visitedAt >= range.end) continue;
    uniqueSet.add(visitIdentity(r));
  }
  const uniqueVisitors = uniqueSet.size;

  const prevUniqueSet = new Set<string>();
  for (const r of dedupedMain) {
    if (r.visitedAt < prevMain.start || r.visitedAt >= prevMain.end) continue;
    prevUniqueSet.add(visitIdentity(r));
  }
  const prevUniqueVisitors = prevUniqueSet.size;

  let returningVisitors = 0;
  if (db && uniqueSet.size) {
    try {
      const vk = [...uniqueSet]
        .filter((k) => k.startsWith("v:"))
        .map((k) => k.slice(2))
        .filter(Boolean);
      const sk = [...uniqueSet]
        .filter((k) => k.startsWith("s:"))
        .map((k) => k.slice(2))
        .filter(Boolean);
      const orClause: Prisma.PageVisitWhereInput[] = [];
      if (vk.length) orClause.push({ visitorKey: { in: vk } });
      if (sk.length) orClause.push({ sessionKey: { in: sk } });
      if (orClause.length) {
        const prior = await db.pageVisit.findMany({
          where: {
            visitedAt: { gte: congNgayTheoMocVietNam(range.start, -180), lt: range.start },
            OR: orClause,
          },
          select: { visitorKey: true, sessionKey: true },
          take: 5000,
        });
        const priorId = new Set<string>();
        for (const p of prior) {
          priorId.add(visitIdentity(p as PageVisitRow));
        }
        for (const id of uniqueSet) {
          if (priorId.has(id)) returningVisitors += 1;
        }
      }
    } catch {
      returningVisitors = 0;
    }
  }

  const prevReturningApprox = Math.max(0, Math.round(returningVisitors * (prevUniqueVisitors / Math.max(uniqueVisitors, 1))));

  const kToday = buildKpiMetric(
    countVisitsInRange(visitRows, todayStart, todayEnd, pathnameFilter, deviceFilter, true),
    countVisitsInRange(visitRows, yStart, yEnd, pathnameFilter, deviceFilter, true),
  );
  const k7 = buildKpiMetric(
    countVisitsInRange(visitRows, r7.start, r7.end, pathnameFilter, deviceFilter, true),
    countVisitsInRange(visitRows, p7.start, p7.end, pathnameFilter, deviceFilter, true),
  );
  const k30 = buildKpiMetric(
    countVisitsInRange(visitRows, r30.start, r30.end, pathnameFilter, deviceFilter, true),
    countVisitsInRange(visitRows, p30.start, p30.end, pathnameFilter, deviceFilter, true),
  );
  const kMonth = buildKpiMetric(
    countVisitsInRange(visitRows, monthRanges.cur.start, monthRanges.cur.end, pathnameFilter, deviceFilter, true),
    countVisitsInRange(visitRows, monthRanges.prev.start, monthRanges.prev.end, pathnameFilter, deviceFilter, true),
  );
  const kYear = buildKpiMetric(
    countVisitsInRange(visitRows, yearRanges.cur.start, yearRanges.cur.end, pathnameFilter, deviceFilter, true),
    countVisitsInRange(visitRows, yearRanges.prev.start, yearRanges.prev.end, pathnameFilter, deviceFilter, true),
  );

  const topCur = visitsForTopLanding(visitRows, range.start, range.end, pathnameFilter, deviceFilter);
  const topPrev = topCur.topPath
    ? countVisitsInRange(
        visitRows.filter((r) => chuanHoaPathname(r.pathname) === topCur.topPath),
        prevMain.start,
        prevMain.end,
        "",
        deviceFilter,
        true,
      )
    : 0;
  const kTopLanding = buildKpiMetric(topCur.count, topPrev);

  const kCurrentPv = buildKpiMetric(currentPageviews, prevPageviews);
  const kUnique = buildKpiMetric(uniqueVisitors, prevUniqueVisitors);
  const kReturn = buildKpiMetric(returningVisitors, prevReturningApprox);

  const curBiz = db
    ? await aggregateOrdersForRange(db, range.start, range.end)
    : { orders: 0, paidOrders: 0, revenue: 0 };
  const prevBiz = db
    ? await aggregateOrdersForRange(db, prevMain.start, prevMain.end)
    : { orders: 0, paidOrders: 0, revenue: 0 };

  const pageViewEv = countEventsInRange(auditRows, "page_view", range.start, range.end);
  const prevPageViewEv = countEventsInRange(auditRows, "page_view", prevMain.start, prevMain.end);
  const productViewEv = countEventsInRange(auditRows, "product_view", range.start, range.end);
  const prevProductViewEv = countEventsInRange(auditRows, "product_view", prevMain.start, prevMain.end);
  const addCartEv = countEventsInRange(auditRows, "add_to_cart", range.start, range.end);
  const prevAddCartEv = countEventsInRange(auditRows, "add_to_cart", prevMain.start, prevMain.end);
  const beginChEv = countEventsInRange(auditRows, "begin_checkout", range.start, range.end);
  const prevBeginChEv = countEventsInRange(auditRows, "begin_checkout", prevMain.start, prevMain.end);
  const submitEv = countEventsInRange(auditRows, "submit_order", range.start, range.end);
  const prevSubmitEv = countEventsInRange(auditRows, "submit_order", prevMain.start, prevMain.end);
  const paidEv = countEventsInRange(auditRows, "paid_order", range.start, range.end);
  const prevPaidEv = countEventsInRange(auditRows, "paid_order", prevMain.start, prevMain.end);

  const submitUnique = distinctOrderIdsInRange(auditRows, "submit_order", range.start, range.end).size;
  const prevSubmitUnique = distinctOrderIdsInRange(auditRows, "submit_order", prevMain.start, prevMain.end).size;
  const paidUnique = distinctOrderIdsInRange(auditRows, "paid_order", range.start, range.end).size;

  const aovCur = curBiz.paidOrders > 0 ? curBiz.revenue / curBiz.paidOrders : 0;
  const aovPrev = prevBiz.paidOrders > 0 ? prevBiz.revenue / prevBiz.paidOrders : 0;
  const convCur = currentPageviews > 0 ? (submitUnique / currentPageviews) * 100 : 0;
  const convPrev = prevPageviews > 0 ? (prevSubmitUnique / prevPageviews) * 100 : 0;
  const paidConvCur = currentPageviews > 0 ? (curBiz.paidOrders / currentPageviews) * 100 : 0;
  const paidConvPrev = prevPageviews > 0 ? (prevBiz.paidOrders / prevPageviews) * 100 : 0;
  const rpvCur = currentPageviews > 0 ? curBiz.revenue / currentPageviews : 0;
  const rpvPrev = prevPageviews > 0 ? prevBiz.revenue / prevPageviews : 0;

  const dayMap = aggregateDayMap(visitRows, range.start, range.end, pathnameFilter, deviceFilter, timeZone);
  const visitsByDay = fillChartFromDayMap(dayMap, range.start, range.end, timeZone);
  const chartTotal = visitsByDay.reduce((s, x) => s + x.value, 0);

  const ordersPaidList = ordersInUnion.filter(isPaidOrderRow);
  const ordersAllList = ordersInUnion.filter(
    (o) => o.orderStatus !== "CANCELED" && o.orderStatus !== "REFUNDED",
  );

  const ordersByDay = ordersByDayFromDb(
    ordersAllList as never,
    () => true,
    range.start,
    range.end,
    timeZone,
    "count",
  );
  const revenueByDay = ordersByDayFromDb(
    ordersPaidList as never,
    () => true,
    range.start,
    range.end,
    timeZone,
    "revenue",
  );
  const submitByDayMap = new Map<string, number>();
  for (const row of auditRows) {
    if (row.createdAt < range.start || row.createdAt >= range.end) continue;
    if (parseEventAction(row.action) !== "submit_order") continue;
    const k = dayKeyInTz(row.createdAt, timeZone);
    submitByDayMap.set(k, (submitByDayMap.get(k) ?? 0) + 1);
  }
  const submitOrderEventsByDay = fillChartFromDayMap(submitByDayMap, range.start, range.end, timeZone);

  const conversionByDay: AdminAnalyticsChartPointV2[] = visitsByDay.map((v, i) => {
    const visits = v.value;
    const subs = submitOrderEventsByDay[i]?.value ?? 0;
    const rate = visits > 0 ? (subs / visits) * 100 : null;
    return { key: v.key, label: v.label, value: rate == null ? 0 : Math.round(rate * 100) / 100 };
  });

  const monthMap = new Map<string, number>();
  const yearMap = new Map<string, number>();
  for (const row of dedupePageVisits(visitRows.filter((r) => filterVisitRow(r, pathnameFilter, deviceFilter)), 5000)) {
    if (row.visitedAt < range.start || row.visitedAt >= range.end) continue;
    const ym = `${dayKeyInTz(row.visitedAt, timeZone).slice(0, 7)}`;
    const yk = dayKeyInTz(row.visitedAt, timeZone).slice(0, 4);
    monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1);
    yearMap.set(yk, (yearMap.get(yk) ?? 0) + 1);
  }
  const visitsByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: key, value }));
  const visitsByYear = [...yearMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: key, value }));

  const funnel = buildFunnelV2({
    pageviews: currentPageviews,
    productViews: productViewEv,
    addToCart: addCartEv,
    beginCheckout: beginChEv,
    submitOrder: submitEv,
    paidOrder: paidEv,
    paidRevenue: curBiz.revenue,
  });

  const abandonment: AdminAnalyticsAbandonmentV2 = {
    addToCartWithoutCheckout: Math.max(0, addCartEv - beginChEv),
    checkoutWithoutSubmit: Math.max(0, beginChEv - submitEv),
    submitWithoutPaid: Math.max(0, submitUnique - paidUnique),
  };

  const sourceMap = new Map<SourceBucket, { label: string; visits: number }>();
  const deviceMap = new Map<DeviceBucket, { label: string; visits: number }>();
  const browserMap = new Map<BrowserBucket, { label: string; visits: number }>();
  let breakdownTotal = 0;
  for (const row of dedupedMain) {
    if (row.visitedAt < range.start || row.visitedAt >= range.end) continue;
    const sb = classifySourceBucket(row.referrer, row.pathname);
    const dbk = classifyDeviceBucket(row.deviceType, row.userAgent);
    const bb = classifyBrowserBucket(row.userAgent);
    breakdownTotal += 1;
    sourceMap.set(sb, { label: SOURCE_LABELS[sb], visits: (sourceMap.get(sb)?.visits ?? 0) + 1 });
    deviceMap.set(dbk, { label: DEVICE_LABELS[dbk], visits: (deviceMap.get(dbk)?.visits ?? 0) + 1 });
    browserMap.set(bb, { label: BROWSER_LABELS[bb], visits: (browserMap.get(bb)?.visits ?? 0) + 1 });
  }
  const breakdown: AdminAnalyticsBreakdownV2 = {
    sourceBreakdown: shareBreakdown(sourceMap as never, breakdownTotal),
    deviceBreakdown: shareBreakdown(deviceMap as never, breakdownTotal),
    browserBreakdown: shareBreakdown(browserMap as never, breakdownTotal),
  };

  const pathCounts = new Map<string, number>();
  for (const row of dedupedMain) {
    if (row.visitedAt < range.start || row.visitedAt >= range.end) continue;
    pathCounts.set(row.pathname, (pathCounts.get(row.pathname) ?? 0) + 1);
  }
  const topPagesEntries = [...pathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topPages: AdminAnalyticsTopTablesV2["topPages"] = topPagesEntries.map(([pathname, visits]) => {
    const prevVis =
      dedupePageVisits(
        visitRows.filter((r) => {
          const f = filterVisitRow(r, pathnameFilter, deviceFilter);
          return f && f.pathname === pathname;
        }),
        5000,
      ).filter((r) => r.visitedAt >= prevMain.start && r.visitedAt < prevMain.end).length;
    const cmp = comparePeriods(visits, prevVis);
    return { pathname, visits, share: currentPageviews > 0 ? (visits / currentPageviews) * 100 : 0, trend: cmp.trend };
  });

  const landingCounts = new Map<string, number>();
  const bySession = new Map<string, PageVisitRow[]>();
  for (const row of dedupedMain) {
    if (row.visitedAt < range.start || row.visitedAt >= range.end) continue;
    const sk = row.sessionKey?.trim() || visitIdentity(row);
    const list = bySession.get(sk) ?? [];
    list.push(row);
    bySession.set(sk, list);
  }
  for (const [, list] of bySession) {
    list.sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime());
    const first = list[0];
    if (first) {
      const lp = chuanHoaPathname(first.pathname);
      landingCounts.set(lp, (landingCounts.get(lp) ?? 0) + 1);
    }
  }
  const topLandingPages = [...landingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pathname, visits]) => ({
      pathname,
      visits,
      share: currentPageviews > 0 ? (visits / currentPageviews) * 100 : 0,
    }));

  const paidOrderMetaByOrderId = new Map<string, Prisma.JsonValue | null>();
  for (const a of auditRows) {
    if (a.createdAt < range.start || a.createdAt >= range.end) continue;
    if (parseEventAction(a.action) !== "paid_order") continue;
    const oid = docMeta(a.metadata, "orderId");
    if (oid) paidOrderMetaByOrderId.set(oid, a.metadata);
  }
  const referrerOrderRevenue = new Map<string, { orders: Set<string>; revenue: number }>();
  for (const o of ordersPaidList) {
    if (o.createdAt < range.start || o.createdAt >= range.end) continue;
    const meta = paidOrderMetaByOrderId.get(o.id) ?? null;
    const ref = docMeta(meta, "referrer");
    const bucket = o.affiliateProfileId ? "affiliate" : classifySourceBucket(ref, "/");
    const key = bucket;
    const cur = referrerOrderRevenue.get(key) ?? { orders: new Set<string>(), revenue: 0 };
    cur.orders.add(o.id);
    cur.revenue += Number(o.totalAmount ?? 0);
    referrerOrderRevenue.set(key, cur);
  }
  const topReferrersByOrdersRevenue = [...referrerOrderRevenue.entries()]
    .map(([key, v]) => ({
      key,
      label: key === "affiliate" ? "Affiliate/CTV" : (SOURCE_LABELS[key as SourceBucket] ?? "Other"),
      orders: v.orders.size,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const productViewsByProduct = new Map<string, number>();
  const addCartByProduct = new Map<string, number>();
  for (const row of auditRows) {
    if (row.createdAt < range.start || row.createdAt >= range.end) continue;
    const ev = parseEventAction(row.action);
    const pid = docMeta(row.metadata, "productId");
    if (!pid) continue;
    if (ev === "product_view") productViewsByProduct.set(pid, (productViewsByProduct.get(pid) ?? 0) + 1);
    if (ev === "add_to_cart") addCartByProduct.set(pid, (addCartByProduct.get(pid) ?? 0) + 1);
  }

  let topProductsByOrdersRevenue: AdminAnalyticsTopTablesV2["topProductsByOrdersRevenue"] = [];
  if (db) {
    try {
      const grouped = await db.orderItem.groupBy({
        by: ["productId"],
      where: {
          productId: { not: null },
        order: {
            is: {
          createdAt: { gte: range.start, lt: range.end },
              ...paidOrderWhere(),
            },
          },
        },
        _sum: { totalPrice: true },
        _count: { _all: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 10,
      });
      const ids = grouped.map((g) => g.productId).filter(Boolean) as string[];
      const products = ids.length
        ? await db.product.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, slug: true },
          })
        : [];
      const pmap = new Map(products.map((p) => [p.id, p]));
      topProductsByOrdersRevenue = grouped.map((g) => {
        const p = g.productId ? pmap.get(g.productId) : undefined;
        const pid = g.productId ?? "";
        return {
          productId: pid,
          productName: p?.name ?? "—",
          productSlug: p?.slug ?? null,
          orders: g._count._all,
          revenue: Number(g._sum.totalPrice ?? 0),
          views: productViewsByProduct.get(pid) ?? 0,
          addToCart: addCartByProduct.get(pid) ?? 0,
        };
      });
    } catch {
      topProductsByOrdersRevenue = [];
    }
  }

  const submitsByPath = new Map<string, number>();
  for (const row of auditRows) {
    if (row.createdAt < range.start || row.createdAt >= range.end) continue;
    if (parseEventAction(row.action) !== "submit_order") continue;
    const path = chuanHoaPathname(docMeta(row.metadata, "pathname") ?? "/");
    submitsByPath.set(path, (submitsByPath.get(path) ?? 0) + 1);
  }
  const topPagesByConversion = [...pathCounts.entries()]
    .map(([pathname, visits]) => {
      const conversions = submitsByPath.get(pathname) ?? 0;
      const rate = visits > 0 ? (conversions / visits) * 100 : null;
      return { pathname, visits, conversions, rate };
    })
    .filter((x) => x.visits >= 3)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 10);

  const submitsByLanding = new Map<string, number>();
  for (const row of auditRows) {
    if (row.createdAt < range.start || row.createdAt >= range.end) continue;
    if (parseEventAction(row.action) !== "submit_order") continue;
    const meta = row.metadata as Record<string, unknown> | null;
    const land =
      (meta && typeof meta.landingPath === "string" && meta.landingPath.trim()
        ? chuanHoaPathname(meta.landingPath)
        : null) ?? chuanHoaPathname(docMeta(row.metadata, "pathname") ?? "/");
    submitsByLanding.set(land, (submitsByLanding.get(land) ?? 0) + 1);
  }
  const topLandingByConversion = [...landingCounts.entries()]
    .map(([pathname, visits]) => {
      const conversions = submitsByLanding.get(pathname) ?? 0;
      const rate = visits > 0 ? (conversions / visits) * 100 : null;
      return { pathname, visits, conversions, rate };
    })
    .filter((x) => x.visits >= 3)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, 10);

  const orderRevenueById = new Map<string, number>();
  for (const order of ordersPaidList) {
    orderRevenueById.set(order.id, Number(order.totalAmount ?? 0));
  }
  const paidOrderIdsByPath = new Map<string, Set<string>>();
  const paidOrderIdsByLanding = new Map<string, Set<string>>();
  let hasPaidPathAttribution = false;
  let hasPaidLandingAttribution = false;
  for (const row of auditRows) {
    if (row.createdAt < range.start || row.createdAt >= range.end) continue;
    if (parseEventAction(row.action) !== "paid_order") continue;
    const orderId = docMeta(row.metadata, "orderId");
    if (!orderId || !orderRevenueById.has(orderId)) continue;
    const path = chuanHoaPathname(docMeta(row.metadata, "pathname") ?? "/");
    if (path) {
      hasPaidPathAttribution = true;
      const current = paidOrderIdsByPath.get(path) ?? new Set<string>();
      current.add(orderId);
      paidOrderIdsByPath.set(path, current);
    }
    const meta = row.metadata as Record<string, unknown> | null;
    const landing =
      (meta && typeof meta.landingPath === "string" && meta.landingPath.trim()
        ? chuanHoaPathname(meta.landingPath)
        : null) ?? path;
    if (landing) {
      hasPaidLandingAttribution = true;
      const current = paidOrderIdsByLanding.get(landing) ?? new Set<string>();
      current.add(orderId);
      paidOrderIdsByLanding.set(landing, current);
    }
  }
  // TODO(analytics): if paid_order metadata loses pathname/landing attribution,
  // keep paid/revenue as null instead of inferring from unreliable joins.
  const topPagesByConversionWithPaid = topPagesByConversion.map((row) => {
    const paidSet = paidOrderIdsByPath.get(row.pathname);
    return {
      ...row,
      paid: hasPaidPathAttribution ? (paidSet?.size ?? 0) : null,
      revenue: hasPaidPathAttribution ? sumRevenueFromOrderSet(paidSet, orderRevenueById) : null,
    };
  });
  const topLandingByConversionWithPaid = topLandingByConversion.map((row) => {
    const paidSet = paidOrderIdsByLanding.get(row.pathname);
    return {
      ...row,
      paid: hasPaidLandingAttribution ? (paidSet?.size ?? 0) : null,
      revenue: hasPaidLandingAttribution ? sumRevenueFromOrderSet(paidSet, orderRevenueById) : null,
    };
  });

  let recentRows: PageVisitRow[] = [];
  if (db) {
    try {
      recentRows = (await db.pageVisit.findMany({
        where: {},
        orderBy: { visitedAt: "desc" },
        take: 50,
        select: {
          pathname: true,
          referrer: true,
          visitedAt: true,
          userAgent: true,
          deviceType: true,
          visitorKey: true,
          sessionKey: true,
          ip: true,
        },
      })) as PageVisitRow[];
    } catch {
      recentRows = [];
    }
  }
  const recentVisits: AdminAnalyticsRecentVisitV2[] = recentRows
    .filter((r) => filterVisitRow(r, "", "all"))
    .slice(0, 50)
    .map((r) => ({
      time: r.visitedAt.toISOString(),
      pathname: chuanHoaPathname(r.pathname),
      referrer: r.referrer,
      source: SOURCE_LABELS[classifySourceBucket(r.referrer, chuanHoaPathname(r.pathname))],
      device: DEVICE_LABELS[classifyDeviceBucket(r.deviceType, r.userAgent)],
      browser: BROWSER_LABELS[classifyBrowserBucket(r.userAgent)],
      os: classifyOsShort(r.userAgent),
      userAgentShort: shortenUserAgent(r.userAgent, 120),
      visitorKey: r.visitorKey,
      sessionKey: r.sessionKey,
    }));

  const mismatch = chartTotal - currentPageviews;
  const dataQuality: AdminAnalyticsDataQualityV2 = {
    totalCard: currentPageviews,
    chartTotal,
    rawCount,
    isMatched: Math.abs(mismatch) <= 2,
    badgeLabel: Math.abs(mismatch) <= 2 ? "Khớp" : "Kiểm tra lọc / dedupe",
  };

  const settingsState: AdminAnalyticsSettingsStateV2 = {
    siteName: settings.siteName || "Zendo.vn",
    timezone: settings.timezone || "Asia/Ho_Chi_Minh",
    currency: settings.currency || "VND",
    analyticsEnabled: settings.analyticsEnabled,
    trackingEnabled: settings.trackingEnabled,
    remarketingEventsEnabled: settings.remarketingEventsEnabled,
    affiliateEnabled: settings.affiliateEnabled,
    ga4Enabled: Boolean(settings.ga4ScriptEnabled && settings.ga4MeasurementId?.trim()),
    ga4MeasurementId: settings.ga4MeasurementId?.trim() || null,
    metaPixelEnabled: Boolean(settings.metaPixelScriptEnabled && settings.metaPixelId?.trim()),
    metaPixelId: settings.metaPixelId?.trim() || null,
    tiktokPixelEnabled: Boolean(settings.tiktokPixelEnabled && settings.tiktokPixelId?.trim()),
    tiktokPixelId: settings.tiktokPixelId?.trim() || null,
    zaloPixelEnabled: Boolean(settings.zaloPixelEnabled && settings.zaloPixelId?.trim()),
    zaloPixelId: settings.zaloPixelId?.trim() || null,
  };

  const v2: AdminAnalyticsDashboardV2 = {
    range,
    filters: { pathname: pathnameFilter, device: deviceFilter },
    updatedAtIso: new Date().toISOString(),
    settingsState,
    dataQuality,
    trafficOverview: {
      today: kToday,
      sevenDays: k7,
      thirtyDays: k30,
      thisMonth: kMonth,
      thisYear: kYear,
      currentPageviews: kCurrentPv,
      uniqueVisitors: kUnique,
      returningVisitors: kReturn,
      topLanding: kTopLanding,
    },
    businessOverview: {
      orders: buildKpiMetric(curBiz.orders, prevBiz.orders),
      paidOrders: buildKpiMetric(curBiz.paidOrders, prevBiz.paidOrders),
      paidRevenue: buildKpiMetric(curBiz.revenue, prevBiz.revenue),
      averageOrderValue: buildKpiMetric(aovCur, aovPrev),
      conversionRate: buildKpiMetric(convCur, convPrev),
      paidConversionRate: buildKpiMetric(paidConvCur, paidConvPrev),
      revenuePerVisit: buildKpiMetric(rpvCur, rpvPrev),
      pageViewEvents: buildKpiMetric(pageViewEv, prevPageViewEv),
      productViewEvents: buildKpiMetric(productViewEv, prevProductViewEv),
      addToCartEvents: buildKpiMetric(addCartEv, prevAddCartEv),
      beginCheckoutEvents: buildKpiMetric(beginChEv, prevBeginChEv),
      submitOrderEvents: buildKpiMetric(submitEv, prevSubmitEv),
      paidOrderEvents: buildKpiMetric(paidEv, prevPaidEv),
    },
    chartData: {
      visitsByDay,
      ordersByDay,
      revenueByDay,
      visitsByMonth,
      visitsByYear,
      submitOrderEventsByDay,
      conversionByDay,
    },
    funnel,
    abandonment,
    breakdown,
    topTables: {
      topPages,
      topLandingPages,
      topReferrersByOrdersRevenue,
      topProductsByOrdersRevenue,
      topPagesByConversion: topPagesByConversionWithPaid,
      topLandingByConversion: topLandingByConversionWithPaid,
    },
    recentVisits,
  };

  return v2;
}

function mapV2ToLegacy(v2: AdminAnalyticsDashboardV2, topProductsLegacy: AdminAnalyticsDashboardData["topProducts"]): AdminAnalyticsDashboardData {
  const funnelDropoff: AdminAnalyticsDashboardData["funnelDropoff"] = [];
  const order = ["pageviews", "productViews", "addToCart", "beginCheckout", "submitOrder", "paidOrder"] as const;
  const labels: Record<string, string> = {
    pageviews: "Visit",
    productViews: "Product View",
    addToCart: "Add To Cart",
    beginCheckout: "Begin Checkout",
    submitOrder: "Submit Order",
    paidOrder: "Paid Order",
  };
  const f = v2.funnel;
  const steps = [f.pageviews, f.productViews, f.addToCart, f.beginCheckout, f.submitOrder, f.paidOrder];
  for (let i = 0; i < steps.length - 1; i++) {
    const from = labels[order[i]];
    const to = labels[order[i + 1]];
    const dropCount = Math.max(0, steps[i].value - steps[i + 1].value);
    const dropRate = steps[i].value === 0 ? null : (dropCount / steps[i].value) * 100;
    funnelDropoff.push({ from, to, dropCount, dropRate });
  }
  let funnelStrongestDrop: string | null = null;
  const strongestKey = v2.funnel.strongestDropOffStep;
  if (strongestKey) {
    const idx = order.indexOf(strongestKey as (typeof order)[number]);
    if (idx >= 0 && idx < order.length - 1) {
      funnelStrongestDrop = `${labels[order[idx]]} → ${labels[order[idx + 1]]}`;
    }
  }

  return {
    range: v2.range,
    filters: v2.filters,
    updatedAtIso: v2.updatedAtIso,
    tracking: {
      enabled: v2.settingsState.trackingEnabled,
      analyticsEnabled: v2.settingsState.analyticsEnabled,
      statusLabel:
        v2.settingsState.trackingEnabled && v2.settingsState.analyticsEnabled ? "dang_bat" : "dang_tat",
    },
    meta: {
      siteName: v2.settingsState.siteName,
      timezone: v2.settingsState.timezone,
      currency: v2.settingsState.currency,
    },
    health: {
      totalVisits: v2.dataQuality.totalCard,
      chartSum: v2.dataQuality.chartTotal,
      rawPageviews: v2.dataQuality.rawCount,
      mismatch: v2.dataQuality.chartTotal - v2.dataQuality.totalCard,
    },
    kpis: {
      totalVisits: v2.trafficOverview.currentPageviews.value,
      uniqueVisitors: v2.trafficOverview.uniqueVisitors.value,
      returningVisitors: v2.trafficOverview.returningVisitors.value,
      productViews: v2.businessOverview.productViewEvents.value,
      addToCart: v2.businessOverview.addToCartEvents.value,
      beginCheckout: v2.businessOverview.beginCheckoutEvents.value,
      orderCreated: v2.businessOverview.submitOrderEvents.value,
      paidOrders: v2.businessOverview.paidOrders.value,
      revenue: v2.businessOverview.paidRevenue.value,
      conversionRate: v2.trafficOverview.currentPageviews.value > 0 ? (v2.funnel.submitOrder.value / v2.trafficOverview.currentPageviews.value) * 100 : null,
      aov:
        v2.businessOverview.paidOrders.value > 0
          ? v2.businessOverview.paidRevenue.value / v2.businessOverview.paidOrders.value
          : null,
    },
    compare: {
      visits: kpiMetricToPeriodComparison(v2.trafficOverview.currentPageviews),
      orders: kpiMetricToPeriodComparison(v2.businessOverview.orders),
      paidOrders: kpiMetricToPeriodComparison(v2.businessOverview.paidOrders),
      revenue: kpiMetricToPeriodComparison(v2.businessOverview.paidRevenue),
    },
    funnel: {
      visit: v2.funnel.pageviews.value,
      productView: v2.funnel.productViews.value,
      addToCart: v2.funnel.addToCart.value,
      beginCheckout: v2.funnel.beginCheckout.value,
      orderCreated: v2.funnel.submitOrder.value,
      paidOrder: v2.funnel.paidOrder.value,
    },
    funnelDropoff,
    funnelStrongestDrop,
    trendByDay: v2.chartData.visitsByDay.map((d, i) => ({
      key: d.key,
      label: d.label,
      visits: d.value,
      orders: v2.chartData.ordersByDay[i]?.value ?? 0,
      revenue: Math.round(v2.chartData.revenueByDay[i]?.value ?? 0),
    })),
    referrerBreakdown: v2.breakdown.sourceBreakdown.map((r) => ({ key: r.label, visits: r.visits, share: r.share })),
    deviceBreakdown: v2.breakdown.deviceBreakdown.map((r) => ({ key: r.label, visits: r.visits, share: r.share })),
    browserBreakdown: v2.breakdown.browserBreakdown.map((r) => ({ key: r.label, visits: r.visits, share: r.share })),
    topProducts: topProductsLegacy,
    topPages: v2.topTables.topPages,
    topReferrers: v2.breakdown.sourceBreakdown.map((r) => ({ referrer: r.label, visits: r.visits, share: r.share })),
    topLandingPages: v2.topTables.topLandingPages,
    recentVisits: v2.recentVisits.map((r) => ({
      visitedAt: new Date(r.time),
      pathname: r.pathname,
      referrer: r.referrer,
      deviceType: r.device,
      userAgent: r.userAgentShort,
      visitorKey: r.visitorKey ?? null,
      sessionKey: r.sessionKey ?? null,
    })),
  };
}

export async function getAdminAnalyticsDashboard(input: AnalyticsFiltersInput): Promise<AdminAnalyticsDashboardV2> {
  return buildAdminAnalyticsDashboardV2Core(input);
}

export async function buildAdminAnalyticsDashboard(input: AnalyticsFiltersInput): Promise<AdminAnalyticsDashboardData> {
  const v2 = await buildAdminAnalyticsDashboardV2Core(input);
  const topProducts = v2.topTables.topProductsByOrdersRevenue.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    productSlug: p.productSlug,
    views: p.views,
    addToCart: p.addToCart,
    orders: p.orders,
    revenue: p.revenue,
  }));
  return mapV2ToLegacy(v2, topProducts);
}

export async function getAnalyticsCsvRows(
  input: AnalyticsFiltersInput,
): Promise<
  Array<{
    visitedAt: string;
    pathname: string;
    referrer: string;
    deviceType: string;
    userAgent: string;
    visitorKey: string;
    sessionKey: string;
  }>
> {
  const v2 = await getAdminAnalyticsDashboard(input);
  return v2.recentVisits.map((row) => ({
    visitedAt: row.time,
    pathname: row.pathname,
    referrer: row.referrer ?? "",
    deviceType: row.device,
    userAgent: row.userAgentShort,
    visitorKey: row.visitorKey ?? "",
    sessionKey: row.sessionKey ?? "",
  }));
}

export function isAllowedAnalyticsExportRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}
