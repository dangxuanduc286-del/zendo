import type { KhoangThoiGianAnalytics, KhoaPresetThoiGianAnalytics } from "./date-range";
import {
  layDanhSachEventTheoKhoang,
  type BanGhiEventAnalytics,
  getDbClientAnalytics,
} from "./queries-shared";
import {
  congNgayTheoMocVietNam,
  layThanhPhanNgayGioVietNam,
  taoMocUtcTuNgayGioVietNam,
} from "./timezone";

export type KieuBucketChartAnalytics = "ngay" | "thang";

export interface BucketChartAnalytics {
  key: string;
  nhan: string;
  batDau: Date;
  ketThuc: Date;
  visits: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  conversionRate: number | null;
}

export interface DuLieuChartAnalytics {
  bucketType: KieuBucketChartAnalytics;
  buckets: BucketChartAnalytics[];
  tongHop: {
    pageviewsInRange: number;
    chartBucketsSum: number;
    ordersCount: number;
    paidOrdersCount: number;
    revenueVnd: number;
  };
}

function chonKieuBucket(
  preset: KhoaPresetThoiGianAnalytics,
  isCustomRange: boolean,
): KieuBucketChartAnalytics {
  if (!isCustomRange && preset === "nam_nay") {
    return "thang";
  }
  return "ngay";
}

function taoKeyNgay(moc: Date): string {
  const { nam, thang, ngay } = layThanhPhanNgayGioVietNam(moc);
  return `${nam}-${String(thang).padStart(2, "0")}-${String(ngay).padStart(2, "0")}`;
}

function taoKeyThang(moc: Date): string {
  const { nam, thang } = layThanhPhanNgayGioVietNam(moc);
  return `${nam}-${String(thang).padStart(2, "0")}`;
}

function taoDanhSachBucketNgay(khoang: KhoangThoiGianAnalytics): BucketChartAnalytics[] {
  const buckets: BucketChartAnalytics[] = [];
  let current = khoang.batDau;
  while (current.getTime() < khoang.ketThuc.getTime()) {
    const next = congNgayTheoMocVietNam(current, 1);
    const { ngay, thang } = layThanhPhanNgayGioVietNam(current);
    buckets.push({
      key: taoKeyNgay(current),
      nhan: `${String(ngay).padStart(2, "0")}/${String(thang).padStart(2, "0")}`,
      batDau: current,
      ketThuc: next,
      visits: 0,
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      conversionRate: null,
    });
    current = next;
  }
  return buckets;
}

function congThangVietNam(moc: Date, soThang: number): Date {
  const { nam, thang } = layThanhPhanNgayGioVietNam(moc);
  const index = nam * 12 + (thang - 1) + soThang;
  const namMoi = Math.floor(index / 12);
  const thangMoi = (index % 12) + 1;
  return taoMocUtcTuNgayGioVietNam({ nam: namMoi, thang: thangMoi, ngay: 1 });
}

function taoDanhSachBucketThang(khoang: KhoangThoiGianAnalytics): BucketChartAnalytics[] {
  const startComp = layThanhPhanNgayGioVietNam(khoang.batDau);
  const endComp = layThanhPhanNgayGioVietNam(congNgayTheoMocVietNam(khoang.ketThuc, -1));
  let current = taoMocUtcTuNgayGioVietNam({ nam: startComp.nam, thang: startComp.thang, ngay: 1 });
  const endMonth = taoMocUtcTuNgayGioVietNam({ nam: endComp.nam, thang: endComp.thang, ngay: 1 });

  const buckets: BucketChartAnalytics[] = [];
  while (current.getTime() <= endMonth.getTime()) {
    const next = congThangVietNam(current, 1);
    const { thang } = layThanhPhanNgayGioVietNam(current);
    buckets.push({
      key: taoKeyThang(current),
      nhan: `Th${String(thang).padStart(2, "0")}`,
      batDau: current,
      ketThuc: next,
      visits: 0,
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      conversionRate: null,
    });
    current = next;
  }
  return buckets;
}

function taoMapBucketTheoKey(buckets: BucketChartAnalytics[]): Map<string, BucketChartAnalytics> {
  const map = new Map<string, BucketChartAnalytics>();
  buckets.forEach((bucket) => map.set(bucket.key, bucket));
  return map;
}

function layKeyBucketChoMoc(moc: Date, bucketType: KieuBucketChartAnalytics): string {
  return bucketType === "thang" ? taoKeyThang(moc) : taoKeyNgay(moc);
}

function taoMapOrderDauTien(rows: BanGhiEventAnalytics[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const row of rows) {
    if (!row.orderId) continue;
    const current = map.get(row.orderId);
    if (!current || row.createdAt.getTime() < current.getTime()) {
      map.set(row.orderId, row.createdAt);
    }
  }
  return map;
}

export async function truyVanChartAnalytics(
  khoang: KhoangThoiGianAnalytics,
  preset: KhoaPresetThoiGianAnalytics,
  isCustomRange: boolean,
): Promise<DuLieuChartAnalytics> {
  const bucketType = chonKieuBucket(preset, isCustomRange);
  const buckets = bucketType === "thang" ? taoDanhSachBucketThang(khoang) : taoDanhSachBucketNgay(khoang);
  const bucketMap = taoMapBucketTheoKey(buckets);

  const [pageViewRows, submitRows, paidRows] = await Promise.all([
    layDanhSachEventTheoKhoang("page_view", khoang),
    layDanhSachEventTheoKhoang("submit_order", khoang),
    layDanhSachEventTheoKhoang("paid_order", khoang),
  ]);

  for (const row of pageViewRows) {
    const key = layKeyBucketChoMoc(row.createdAt, bucketType);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.visits += 1;
  }

  const submitOrderFirstMap = taoMapOrderDauTien(submitRows);
  const paidOrderFirstMap = taoMapOrderDauTien(paidRows);

  for (const [, createdAt] of submitOrderFirstMap) {
    const key = layKeyBucketChoMoc(createdAt, bucketType);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.orders += 1;
  }

  const paidOrderIds = [...paidOrderFirstMap.keys()];
  const revenueByOrderId = new Map<string, number>();
  if (paidOrderIds.length) {
    const db = await getDbClientAnalytics();
    if (db) {
      const orders = await db.order.findMany({
        where: { id: { in: paidOrderIds } },
        select: { id: true, totalAmount: true },
      });
      for (const item of orders) {
        revenueByOrderId.set(item.id, Number(item.totalAmount ?? 0));
      }
    }
  }

  for (const [orderId, createdAt] of paidOrderFirstMap.entries()) {
    const key = layKeyBucketChoMoc(createdAt, bucketType);
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.paidOrders += 1;
    bucket.revenue += revenueByOrderId.get(orderId) ?? 0;
  }

  for (const bucket of buckets) {
    bucket.conversionRate = bucket.visits > 0 ? (bucket.paidOrders / bucket.visits) * 100 : null;
  }

  const pageviewsInRange = pageViewRows.length;
  const chartBucketsSum = buckets.reduce((sum, bucket) => sum + bucket.visits, 0);
  const ordersCount = submitOrderFirstMap.size;
  const paidOrdersCount = paidOrderFirstMap.size;
  const revenueVnd = buckets.reduce((sum, bucket) => sum + bucket.revenue, 0);

  return {
    bucketType,
    buckets,
    tongHop: {
      pageviewsInRange,
      chartBucketsSum,
      ordersCount,
      paidOrdersCount,
      revenueVnd,
    },
  };
}

