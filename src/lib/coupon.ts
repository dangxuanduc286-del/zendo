export interface CouponResult {
  code: string;
  amount: number;
}

export const GUEST_COUPON_CODES = ["WELCOME10", "SAVE50K", "FREESHIP30K"] as const;

export function computeGuestCoupon(code: string, subtotal: number): CouponResult | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized || subtotal <= 0) return null;

  if (normalized === "WELCOME10") {
    return { code: normalized, amount: Math.floor(subtotal * 0.1) };
  }

  if (normalized === "SAVE50K") {
    return { code: normalized, amount: Math.min(50000, subtotal) };
  }

  if (normalized === "FREESHIP30K") {
    return { code: normalized, amount: Math.min(30000, subtotal) };
  }

  return null;
}
