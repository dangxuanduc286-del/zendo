export type ProductStockInput = {
  stockQuantity?: number | string | null;
  soldQuantity?: number | string | null;
  soldCount?: number | string | null;
};

function toFiniteNumber(value: number | string | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function getProductSoldQuantity(product: ProductStockInput): number {
  return Math.max(0, toFiniteNumber(product.soldQuantity ?? product.soldCount));
}

export function getProductStockQuantity(product: ProductStockInput): number {
  return toFiniteNumber(product.stockQuantity);
}

export function isProductOutOfStock(product: ProductStockInput): boolean {
  const stockQuantity = getProductStockQuantity(product);
  const soldQuantity = getProductSoldQuantity(product);

  return stockQuantity <= 0 || soldQuantity >= stockQuantity;
}

export function getProductStockLabel(product: ProductStockInput): "Còn hàng" | "Hết hàng" {
  return isProductOutOfStock(product) ? "Hết hàng" : "Còn hàng";
}
