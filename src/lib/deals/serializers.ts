import type { ProductCardData } from "../../components/storefront/product-card";
import type { DealsSectionConfig } from "../settings";
import type { DealCoupon } from "./resolve-vouchers";

function isDate(v: unknown): v is Date {
  return v instanceof Date;
}

function isDecimalLike(v: unknown): v is { toNumber: () => number } {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.toNumber === "function";
}

export function serializeDecimalToNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "bigint") return Number(v);
  if (isDecimalLike(v)) {
    try {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function serializeDateToIso(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (isDate(v)) return v.toISOString();
  return null;
}

export type SerializedDealCoupon = Omit<DealCoupon, "value" | "maxDiscountAmount" | "minOrderAmount" | "startsAt" | "endsAt"> & {
  value: number | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

export function serializeCoupon(coupon: DealCoupon): SerializedDealCoupon {
  return {
    id: String(coupon.id || ""),
    code: String(coupon.code || ""),
    name: String(coupon.name || ""),
    description: coupon.description ?? null,
    type: String(coupon.type || ""),
    value: serializeDecimalToNumber(coupon.value),
    maxDiscountAmount: serializeDecimalToNumber(coupon.maxDiscountAmount),
    minOrderAmount: serializeDecimalToNumber(coupon.minOrderAmount),
    startsAt: serializeDateToIso(coupon.startsAt),
    endsAt: serializeDateToIso(coupon.endsAt),
    status: String(coupon.status || ""),
  };
}

export function serializeProduct(product: ProductCardData): ProductCardData {
  // ProductCardData is already plain; return shallow copy to guarantee no prototype surprises.
  return {
    ...product,
    basePrice: Number(product.basePrice),
    salePrice: product.salePrice == null ? null : Number(product.salePrice),
    soldCount: Number(product.soldCount ?? 0),
  };
}

export function serializeDealsSection(section: DealsSectionConfig): DealsSectionConfig {
  // DealsSectionConfig is plain JSON config; return shallow copy.
  return { ...section };
}

