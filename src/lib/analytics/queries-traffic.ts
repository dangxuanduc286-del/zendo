import type { KhoangThoiGianAnalytics } from "./date-range";
import {
  layDanhSachEventTheoDenMoc,
  layDanhSachEventTheoKhoang,
  taoIdentityKhachThamQuan,
  type BanGhiEventAnalytics,
} from "./queries-shared";

export interface DongTopAnalytics {
  key: string;
  count: number;
}

export interface SoLieuTrafficAnalytics {
  /**
   * total visits:
   * Tổng số lượt truy cập (page_view) trong khoảng thời gian [start, end).
   */
  totalVisits: number;
  /**
   * unique visitors:
   * Số khách truy cập duy nhất theo visitorKey/sessionKey trong [start, end).
   */
  uniqueVisitors: number;
  /**
   * returning visitors:
   * Số khách có truy cập trước khoảng hiện tại và quay lại trong [start, end).
   */
  returningVisitors: number;
  topLandingPages: DongTopAnalytics[];
  topPages: DongTopAnalytics[];
  referrerBreakdown: DongTopAnalytics[];
  deviceBreakdown: DongTopAnalytics[];
}

function thongKeTop(
  values: string[],
  limit = 10,
): DongTopAnalytics[] {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function layIdentitySet(rows: BanGhiEventAnalytics[]): Set<string> {
  const result = new Set<string>();
  for (const row of rows) {
    const id = taoIdentityKhachThamQuan(row);
    if (id) result.add(id);
  }
  return result;
}

export async function truyVanTrafficAnalytics(
  khoang: KhoangThoiGianAnalytics,
): Promise<SoLieuTrafficAnalytics> {
  const currentRows = await layDanhSachEventTheoKhoang("page_view", khoang);
  const allRowsUntilEnd = await layDanhSachEventTheoDenMoc("page_view", khoang.ketThuc);

  const currentIdentity = layIdentitySet(currentRows);
  const previousIdentity = layIdentitySet(
    allRowsUntilEnd.filter((row) => row.createdAt < khoang.batDau),
  );
  let returningVisitors = 0;
  currentIdentity.forEach((id) => {
    if (previousIdentity.has(id)) returningVisitors += 1;
  });

  return {
    totalVisits: currentRows.length,
    uniqueVisitors: currentIdentity.size,
    returningVisitors,
    topLandingPages: thongKeTop(
      currentRows.map((row) => row.landingPath ?? row.pathname ?? "/"),
      20,
    ),
    topPages: thongKeTop(currentRows.map((row) => row.pathname || "/"), 20),
    referrerBreakdown: thongKeTop(
      currentRows.map((row) => row.referrer ?? "direct"),
      20,
    ),
    deviceBreakdown: thongKeTop(
      currentRows.map((row) => row.deviceType ?? "unknown"),
      10,
    ),
  };
}

