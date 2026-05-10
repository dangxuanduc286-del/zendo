import type { KhoangThoiGianAnalytics } from "./date-range";
import { layDanhSachEventTheoKhoang } from "./queries-shared";
import { tinhTiLePhanTramAnalytics } from "./metric-format";

export interface SoLieuFunnelAnalytics {
  productViews: number;
  addToCart: number;
  beginCheckout: number;
  submitOrder: number;
  paidOrder: number;
  tiLeProductViewSangAddToCart: number | null;
  tiLeAddToCartSangBeginCheckout: number | null;
  tiLeBeginCheckoutSangSubmitOrder: number | null;
  tiLeSubmitOrderSangPaidOrder: number | null;
  topProducts: Array<{ productId: string; productName: string; count: number }>;
}

function demUniqueOrder(rows: Awaited<ReturnType<typeof layDanhSachEventTheoKhoang>>): number {
  const ids = new Set<string>();
  rows.forEach((row) => {
    if (row.orderId) ids.add(row.orderId);
  });
  return ids.size;
}

export async function truyVanFunnelAnalytics(
  khoang: KhoangThoiGianAnalytics,
): Promise<SoLieuFunnelAnalytics> {
  const [productViewRows, addToCartRows, beginCheckoutRows, submitOrderRows, paidOrderRows] =
    await Promise.all([
      layDanhSachEventTheoKhoang("product_view", khoang),
      layDanhSachEventTheoKhoang("add_to_cart", khoang),
      layDanhSachEventTheoKhoang("begin_checkout", khoang),
      layDanhSachEventTheoKhoang("submit_order", khoang),
      layDanhSachEventTheoKhoang("paid_order", khoang),
    ]);

  const productViews = productViewRows.length;
  const addToCart = addToCartRows.length;
  const beginCheckout = beginCheckoutRows.length;
  const submitOrder = demUniqueOrder(submitOrderRows);
  const paidOrder = demUniqueOrder(paidOrderRows);
  const productCountMap = new Map<string, number>();
  for (const row of productViewRows) {
    if (!row.productId) continue;
    productCountMap.set(row.productId, (productCountMap.get(row.productId) ?? 0) + 1);
  }

  const topProductRows = [...productCountMap.entries()]
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let topProducts: Array<{ productId: string; productName: string; count: number }> = [];
  if (topProductRows.length && process.env.DATABASE_URL) {
    const dbModule = await import("../db");
    const db = dbModule.db;
    const products = await db.product.findMany({
      where: { id: { in: topProductRows.map((row) => row.productId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(products.map((item) => [item.id, item.name]));
    topProducts = topProductRows.map((row) => ({
      productId: row.productId,
      productName: nameMap.get(row.productId) ?? row.productId,
      count: row.count,
    }));
  }

  return {
    productViews,
    addToCart,
    beginCheckout,
    submitOrder,
    paidOrder,
    tiLeProductViewSangAddToCart: tinhTiLePhanTramAnalytics(addToCart, productViews),
    tiLeAddToCartSangBeginCheckout: tinhTiLePhanTramAnalytics(beginCheckout, addToCart),
    tiLeBeginCheckoutSangSubmitOrder: tinhTiLePhanTramAnalytics(submitOrder, beginCheckout),
    tiLeSubmitOrderSangPaidOrder: tinhTiLePhanTramAnalytics(paidOrder, submitOrder),
    topProducts,
  };
}

