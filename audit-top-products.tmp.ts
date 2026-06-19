import { db } from "./src/lib/db";
import { resolveProductImage } from "./src/lib/product-image";
const paidOrderIdsRows = await db.order.findMany({ where: { OR: [{ paymentStatus: "PAID" }, { orderStatus: "COMPLETED" }] }, select: { id: true }, take: 5000 });
const paidOrderIds = paidOrderIdsRows.map((r) => r.id);
const topOrderItemsRows = paidOrderIds.length ? await db.orderItem.findMany({ where: { orderId: { in: paidOrderIds } }, select: { productId: true, productName: true, quantity: true, totalPrice: true }, take: 5000 }) : [];
const topByProduct = new Map<string, { productId: string | null; productName: string; quantitySold: number; revenue: number }>();
for (const item of topOrderItemsRows) {
  const key = item.productId ?? item.productName;
  const current = topByProduct.get(key) ?? { productId: item.productId, productName: item.productName, quantitySold: 0, revenue: 0 };
  current.quantitySold += Number(item.quantity ?? 0);
  current.revenue += Number(item.totalPrice ?? 0);
  topByProduct.set(key, current);
}
const topSorted = [...topByProduct.values()].sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue).slice(0, 8);
const topProductIds = topSorted.map((r) => r.productId).filter((id): id is string => Boolean(id));
const topProductDetailRows = topProductIds.length ? await db.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true, sku: true, stockQuantity: true, images: { select: { url: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 } } }) : [];
const topDetailMap = new Map(topProductDetailRows.map((row) => [row.id, row]));
console.log(JSON.stringify({ paidOrderIdsLength: paidOrderIds.length, topOrderItemsRowsLength: topOrderItemsRows.length, topProductDetailRowsLength: topProductDetailRows.length }, null, 2));
for (const row of topSorted.slice(0, 3)) {
  const detail = row.productId ? topDetailMap.get(row.productId) : null;
  const name = detail?.name || row.productName || "Sản phẩm không xác định";
  const image = resolveProductImage(detail?.images, name);
  console.log(JSON.stringify({ productId: row.productId ?? "", productName: name, images: detail?.images ?? null, imagesLength: detail?.images?.length ?? null, resolvedImage: image, finalImageUrl: image.url }, null, 2));
}
await db.$disconnect();
