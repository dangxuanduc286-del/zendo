export const CART_STORAGE_KEY = "zendo_cart_items";
export const CART_UPDATED_EVENT = "zendo:cart-updated";
export const CART_COUPON_STORAGE_KEY = "zendo_cart_coupon";
/** Lưu mã ref (?ref=) gần nhất để gửi kèm checkout (chống tự giới thiệu server-side). */
export const AFFILIATE_REF_STORAGE_KEY = "zendo_affiliate_ref";

export interface GuestCartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  sku?: string;
  basePrice: number;
  salePrice?: number | null;
  quantity: number;
  stockQuantity?: number | null;
}

export function normalizeCartItem(input: unknown): GuestCartItem | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const productId = String(raw.productId ?? raw.id ?? "").trim();
  const id = String(raw.id ?? productId).trim();
  const slug = String(raw.slug ?? "").trim();
  const name = String(raw.name ?? "Sản phẩm").trim();
  const imageUrl = String(raw.imageUrl ?? "").trim();
  const basePrice = Number(raw.basePrice ?? 0);
  const salePrice =
    raw.salePrice == null || raw.salePrice === ""
      ? null
      : Number(raw.salePrice);
  const quantity = Math.max(1, Number(raw.quantity ?? 1));
  const stockQuantity =
    raw.stockQuantity == null || raw.stockQuantity === ""
      ? null
      : Number(raw.stockQuantity);

  if (!id || !productId || !slug || !Number.isFinite(basePrice) || basePrice < 0) {
    return null;
  }

  return {
    id,
    productId,
    slug,
    name,
    imageUrl,
    sku: raw.sku ? String(raw.sku) : undefined,
    basePrice,
    salePrice: salePrice != null && Number.isFinite(salePrice) ? salePrice : null,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    stockQuantity:
      stockQuantity != null && Number.isFinite(stockQuantity) ? stockQuantity : null,
  };
}

export function getUnitPrice(item: GuestCartItem): number {
  if (item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice) {
    return item.salePrice;
  }
  return item.basePrice;
}

export function calcSubtotal(items: GuestCartItem[]): number {
  return items.reduce((sum, item) => sum + getUnitPrice(item) * item.quantity, 0);
}
