import type { KhoangThoiGianAnalytics } from "./date-range";
import { layDanhSachEventTheoKhoang } from "./queries-shared";
import { tinhTiLePhanTramAnalytics, tinhTrungBinhAnalytics } from "./metric-format";

export interface SoLieuBusinessAnalytics {
  /**
   * orders:
   * Tổng số đơn hàng được tạo thành công trong [start, end).
   */
  orders: number;
  /**
   * paid orders:
   * Tổng số đơn đã ghi nhận thanh toán thành công (PAID) trong [start, end).
   */
  paidOrders: number;
  /**
   * revenue:
   * Tổng doanh thu từ các đơn đã thanh toán trong [start, end).
   */
  revenue: number;
  /**
   * AOV (Average Order Value):
   * Giá trị đơn trung bình = revenue / paidOrders.
   */
  aov: number | null;
  /**
   * revenue per visit:
   * Doanh thu trên mỗi lượt truy cập = revenue / totalVisits.
   */
  revenuePerVisit: number | null;
  /**
   * conversion rate:
   * visit to order conversion = orders / totalVisits.
   */
  visitToOrderConversion: number | null;
  /**
   * conversion rate:
   * visit to paid conversion = paidOrders / totalVisits.
   */
  visitToPaidConversion: number | null;
}

function tongDoanhThuTuPaidOrderEvents(
  paidOrderRows: Awaited<ReturnType<typeof layDanhSachEventTheoKhoang>>,
): number {
  const orderIds = new Set<string>();
  for (const row of paidOrderRows) {
    if (row.orderId) orderIds.add(row.orderId);
  }
  return orderIds.size;
}

export async function truyVanBusinessAnalytics(
  khoang: KhoangThoiGianAnalytics,
  totalVisits: number,
): Promise<SoLieuBusinessAnalytics> {
  const [submitRows, paidRows] = await Promise.all([
    layDanhSachEventTheoKhoang("submit_order", khoang),
    layDanhSachEventTheoKhoang("paid_order", khoang),
  ]);

  const submitOrderIds = new Set<string>();
  for (const row of submitRows) {
    if (row.orderId) submitOrderIds.add(row.orderId);
  }

  const paidOrderIds = new Set<string>();
  for (const row of paidRows) {
    if (row.orderId) paidOrderIds.add(row.orderId);
  }

  // Lấy doanh thu tuyệt đối từ bảng Order theo danh sách orderId đã có sự kiện paid_order.
  let revenue = 0;
  if (paidOrderIds.size > 0 && process.env.DATABASE_URL) {
    const dbModule = await import("../db");
    const db = dbModule.db;
    const orders = await db.order.findMany({
      where: { id: { in: [...paidOrderIds] } },
      select: { totalAmount: true },
    });
    revenue = orders.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
  }

  const orders = submitOrderIds.size;
  const paidOrders = tongDoanhThuTuPaidOrderEvents(paidRows);

  return {
    orders,
    paidOrders,
    revenue,
    aov: tinhTrungBinhAnalytics(revenue, paidOrders),
    revenuePerVisit: tinhTrungBinhAnalytics(revenue, totalVisits),
    visitToOrderConversion: tinhTiLePhanTramAnalytics(orders, totalVisits),
    visitToPaidConversion: tinhTiLePhanTramAnalytics(paidOrders, totalVisits),
  };
}

