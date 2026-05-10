import { comparePeriods, type PeriodComparison, type TrendDirection } from "./compare";
import {
  congNgayTheoMocVietNam,
  layMocDauNamNayVietNam,
  layMocDauNgayHomNayVietNam,
  layMocDauNgayKeTiepVietNam,
  layMocDauThangNayVietNam,
  layThanhPhanNgayGioVietNam,
  taoMocUtcTuNgayGioVietNam,
} from "./timezone";

type DeviceType = "desktop" | "mobile" | "tablet";
type ReferrerType = "direct" | "google" | "facebook" | "zalo" | "other";

export interface AggregatedVisitBucket {
  key: string;
  label: string;
  visits: number;
}

export interface TopVisitedPageItem {
  pathname: string;
  visits: number;
  percentShare: number;
  trend: TrendDirection;
}

export interface RecentVisitItem {
  id: string;
  pathname: string;
  referrer: string | null;
  visitedAt: Date;
  deviceType: string | null;
  userAgent: string | null;
  visitorKey: string | null;
  sessionKey: string | null;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface ReferrerBreakdown {
  direct: number;
  google: number;
  facebook: number;
  zalo: number;
  other: number;
}

export interface VisitDateBounds {
  firstVisitedAt: Date | null;
  lastVisitedAt: Date | null;
}

export interface VisitOverview {
  totalVisits: number;
  uniqueVisitors: number;
  returningVisitors: number;
  topLandingPages: Array<{ pathname: string; visits: number; percentShare: number }>;
}

type VisitRow = {
  pathname: string;
  referrer: string | null;
  visitedAt: Date;
  deviceType: string | null;
  userAgent?: string | null;
  visitorKey: string | null;
  sessionKey: string | null;
};

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function isPageVisitTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  return maybe.code === "P2021" || (typeof maybe.message === "string" && maybe.message.includes("PageVisit"));
}

function logPageVisitTableMissing(operation: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[analytics] PageVisit table missing in ${operation}, fallback to empty result.`);
}

function safeRange(start: Date, end: Date): { start: Date; end: Date } {
  if (start.getTime() < end.getTime()) return { start, end };
  return { start: end, end: start };
}

function startOfYearFrom(date: Date): Date {
  const { nam } = layThanhPhanNgayGioVietNam(date);
  return taoMocUtcTuNgayGioVietNam({ nam, thang: 1, ngay: 1 });
}

function toDayKey(date: Date): string {
  const { nam, thang, ngay } = layThanhPhanNgayGioVietNam(date);
  return `${nam}-${String(thang).padStart(2, "0")}-${String(ngay).padStart(2, "0")}`;
}

function toMonthKey(date: Date): string {
  const { nam, thang } = layThanhPhanNgayGioVietNam(date);
  return `${nam}-${String(thang).padStart(2, "0")}`;
}

function toYearKey(date: Date): string {
  const { nam } = layThanhPhanNgayGioVietNam(date);
  return String(nam);
}

async function countVisits(start: Date, end: Date): Promise<number> {
  const db = await getDbClient();
  if (!db) return 0;
  try {
    return await db.pageVisit.count({ where: { visitedAt: { gte: start, lt: end } } });
  } catch (error) {
    if (isPageVisitTableMissingError(error)) {
      logPageVisitTableMissing("countVisits");
      return 0;
    }
    throw error;
  }
}

async function fetchVisitRows(start: Date, end: Date): Promise<VisitRow[]> {
  const db = await getDbClient();
  if (!db) return [];
  try {
    return await db.pageVisit.findMany({
      where: { visitedAt: { gte: start, lt: end } },
      select: {
        pathname: true,
        referrer: true,
        visitedAt: true,
        deviceType: true,
        userAgent: true,
        visitorKey: true,
        sessionKey: true,
      },
      orderBy: { visitedAt: "asc" },
    });
  } catch (error) {
    if (isPageVisitTableMissingError(error)) {
      logPageVisitTableMissing("fetchVisitRows");
      return [];
    }
    throw error;
  }
}

function aggregateByKey(
  rows: Array<{ visitedAt: Date }>,
  keyBuilder: (date: Date) => string,
): AggregatedVisitBucket[] {
  if (!rows.length) return [];
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyBuilder(row.visitedAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visits]) => ({ key, label: key, visits }));
}

function normalizeReferrerBucket(referrer: string | null): ReferrerType {
  const value = (referrer ?? "").trim().toLowerCase();
  if (!value) return "direct";
  if (value.includes("google.")) return "google";
  if (value.includes("facebook.") || value.includes("fb.com")) return "facebook";
  if (value.includes("zalo.")) return "zalo";
  return "other";
}

function normalizeDevice(deviceType: string | null): DeviceType {
  if (deviceType === "mobile" || deviceType === "tablet" || deviceType === "desktop") return deviceType;
  return "desktop";
}

function getPreviousRange(start: Date, end: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - durationMs), end: new Date(start.getTime()) };
}

export async function getTodayVisits(referenceDate = new Date()): Promise<number> {
  const start = layMocDauNgayHomNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return countVisits(start, end);
}

export async function getLast7DaysVisits(referenceDate = new Date()): Promise<number> {
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  const start = congNgayTheoMocVietNam(end, -7);
  return countVisits(start, end);
}

export async function getCurrentMonthVisits(referenceDate = new Date()): Promise<number> {
  const start = layMocDauThangNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return countVisits(start, end);
}

export async function getCurrentYearVisits(referenceDate = new Date()): Promise<number> {
  const start = layMocDauNamNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return countVisits(start, end);
}

export async function aggregateVisitsByDay(start: Date, end: Date): Promise<AggregatedVisitBucket[]> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  return aggregateByKey(rows, toDayKey);
}

export async function aggregateVisitsByMonth(start: Date, end: Date): Promise<AggregatedVisitBucket[]> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  return aggregateByKey(rows, toMonthKey);
}

export async function aggregateVisitsByYear(start: Date, end: Date): Promise<AggregatedVisitBucket[]> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  return aggregateByKey(rows, toYearKey);
}

export async function getTopVisitedPages(
  start: Date,
  end: Date,
  limit = 10,
): Promise<TopVisitedPageItem[]> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  if (!rows.length) return [];
  const total = rows.length;
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.pathname, (counts.get(row.pathname) ?? 0) + 1));

  const previousRange = getPreviousRange(range.start, range.end);
  const previousRows = await fetchVisitRows(previousRange.start, previousRange.end);
  const previousCounts = new Map<string, number>();
  previousRows.forEach((row) => previousCounts.set(row.pathname, (previousCounts.get(row.pathname) ?? 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([pathname, visits]) => {
      const previousTotal = previousCounts.get(pathname) ?? 0;
      const compared = comparePeriods(visits, previousTotal);
      return {
        pathname,
        visits,
        percentShare: total > 0 ? (visits / total) * 100 : 0,
        trend: compared.trend,
      };
    });
}

export async function getRecentVisits(limit = 20): Promise<RecentVisitItem[]> {
  const db = await getDbClient();
  if (!db) return [];
  try {
    const rows = await db.pageVisit.findMany({
      orderBy: { visitedAt: "desc" },
      take: Math.max(1, limit),
      select: {
        id: true,
        pathname: true,
        referrer: true,
        visitedAt: true,
        deviceType: true,
        userAgent: true,
        visitorKey: true,
        sessionKey: true,
      },
    });
    return rows;
  } catch (error) {
    if (isPageVisitTableMissingError(error)) {
      logPageVisitTableMissing("getRecentVisits");
      return [];
    }
    throw error;
  }
}

export async function getDeviceBreakdown(start: Date, end: Date): Promise<DeviceBreakdown> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  const result: DeviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
  rows.forEach((row) => {
    const key = normalizeDevice(row.deviceType);
    result[key] += 1;
  });
  return result;
}

export async function getReferrerBreakdown(start: Date, end: Date): Promise<ReferrerBreakdown> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  const result: ReferrerBreakdown = { direct: 0, google: 0, facebook: 0, zalo: 0, other: 0 };
  rows.forEach((row) => {
    const key = normalizeReferrerBucket(row.referrer);
    result[key] += 1;
  });
  return result;
}

export async function compareVisitsByRange(start: Date, end: Date): Promise<PeriodComparison> {
  const range = safeRange(start, end);
  const currentTotal = await countVisits(range.start, range.end);
  const previous = getPreviousRange(range.start, range.end);
  const previousTotal = await countVisits(previous.start, previous.end);
  return comparePeriods(currentTotal, previousTotal);
}

export async function compareToday(referenceDate = new Date()): Promise<PeriodComparison> {
  const start = layMocDauNgayHomNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return compareVisitsByRange(start, end);
}

export async function compareLast7Days(referenceDate = new Date()): Promise<PeriodComparison> {
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  const start = congNgayTheoMocVietNam(end, -7);
  return compareVisitsByRange(start, end);
}

export async function compareCurrentMonth(referenceDate = new Date()): Promise<PeriodComparison> {
  const start = layMocDauThangNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return compareVisitsByRange(start, end);
}

export async function compareCurrentYear(referenceDate = new Date()): Promise<PeriodComparison> {
  const start = layMocDauNamNayVietNam(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return compareVisitsByRange(start, end);
}

export async function aggregateCurrentYearByMonth(referenceDate = new Date()): Promise<AggregatedVisitBucket[]> {
  const start = startOfYearFrom(referenceDate);
  const end = layMocDauNgayKeTiepVietNam(referenceDate);
  return aggregateVisitsByMonth(start, end);
}

export async function getVisitDateBounds(): Promise<VisitDateBounds> {
  const db = await getDbClient();
  if (!db) return { firstVisitedAt: null, lastVisitedAt: null };
  try {
    const [first, last] = await Promise.all([
      db.pageVisit.findFirst({ orderBy: { visitedAt: "asc" }, select: { visitedAt: true } }),
      db.pageVisit.findFirst({ orderBy: { visitedAt: "desc" }, select: { visitedAt: true } }),
    ]);
    return {
      firstVisitedAt: first?.visitedAt ?? null,
      lastVisitedAt: last?.visitedAt ?? null,
    };
  } catch (error) {
    if (isPageVisitTableMissingError(error)) {
      logPageVisitTableMissing("getVisitDateBounds");
      return { firstVisitedAt: null, lastVisitedAt: null };
    }
    throw error;
  }
}

export async function getVisitOverview(start: Date, end: Date): Promise<VisitOverview> {
  const range = safeRange(start, end);
  const rows = await fetchVisitRows(range.start, range.end);
  if (!rows.length) {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      returningVisitors: 0,
      topLandingPages: [],
    };
  }

  const visitorCounts = new Map<string, number>();
  const landingByVisitor = new Map<string, string>();
  const landingCounts = new Map<string, number>();

  rows.forEach((row, index) => {
    const visitorId = row.visitorKey?.trim() || row.sessionKey?.trim() || `anon_${index}`;
    visitorCounts.set(visitorId, (visitorCounts.get(visitorId) ?? 0) + 1);
    if (!landingByVisitor.has(visitorId)) {
      landingByVisitor.set(visitorId, row.pathname);
      landingCounts.set(row.pathname, (landingCounts.get(row.pathname) ?? 0) + 1);
    }
  });

  const uniqueVisitors = visitorCounts.size;
  const returningVisitors = [...visitorCounts.values()].filter((count) => count > 1).length;
  const topLandingPages = [...landingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pathname, visits]) => ({
      pathname,
      visits,
      percentShare: uniqueVisitors > 0 ? (visits / uniqueVisitors) * 100 : 0,
    }));

  return {
    totalVisits: rows.length,
    uniqueVisitors,
    returningVisitors,
    topLandingPages,
  };
}
