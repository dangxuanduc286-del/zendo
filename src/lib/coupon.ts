export interface CouponResult {
  code: string;
  amount: number;
  type: GuestCouponOption["type"];
}

export interface GuestCouponOption {
  code: string;
  name: string;
  type: "PERCENT" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  maxDiscountValue?: number | null;
  minOrderValue?: number | null;
  createdAt?: string;
  endsAt?: string;
  expiresSoon?: boolean;
  recommended?: boolean;
  newCustomerOnly?: boolean;
  description: string;
  conditionLabel: string;
}

export interface VoucherMilestone {
  coupon: GuestCouponOption;
  amountNeeded: number;
  estimatedSavings: number;
}

function isWithinDays(dateValue: string | undefined, days: number, now = new Date()): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return false;
  const diffMs = now.getTime() - date.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

function isEndingWithinDays(dateValue: string | undefined, days: number, now = new Date()): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return false;
  const diffMs = date.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export function estimateGuestCouponSavings(coupon: GuestCouponOption, subtotal: number): number {
  if (coupon.type === "PERCENT") {
    const rawAmount = Math.floor((subtotal * coupon.value) / 100);
    const cappedAmount = coupon.maxDiscountValue ? Math.min(rawAmount, coupon.maxDiscountValue) : rawAmount;
    return Math.min(cappedAmount, subtotal);
  }
  return Math.min(coupon.value, subtotal);
}

export function getGuestCouponBadges(
  coupon: GuestCouponOption,
  options: { isBest?: boolean; now?: Date } = {},
): string[] {
  const badges: string[] = [];
  const now = options.now ?? new Date();
  if (options.isBest) badges.push("🔥 Tiết kiệm tốt nhất");
  if (coupon.type === "FREE_SHIPPING") badges.push("🚚 Freeship");
  if (isWithinDays(coupon.createdAt, 7, now) || coupon.recommended) badges.push("⭐ Phổ biến");
  if (coupon.expiresSoon || isEndingWithinDays(coupon.endsAt, 7, now)) badges.push("⏰ Sắp hết hạn");
  if (coupon.newCustomerOnly || coupon.code.startsWith("WELCOME")) badges.push("🎁 Khách mới");
  if (coupon.value >= 100000 || (coupon.maxDiscountValue ?? 0) >= 100000) badges.push("💎 Ưu đãi lớn");
  return badges;
}

export function findNextVoucherMilestone(
  subtotal: number,
  coupons: GuestCouponOption[],
  options: { maxGap?: number } = {},
): VoucherMilestone | null {
  const maxGap = options.maxGap ?? 2000000;
  const candidates = coupons
    .filter((coupon) => coupon.minOrderValue && coupon.minOrderValue > subtotal)
    .map((coupon) => {
      const amountNeeded = Math.max(0, (coupon.minOrderValue ?? 0) - subtotal);
      return {
        coupon,
        amountNeeded,
        estimatedSavings: estimateGuestCouponSavings(coupon, coupon.minOrderValue ?? subtotal),
      };
    })
    .filter((item) => item.amountNeeded > 0 && item.amountNeeded <= maxGap)
    .sort((a, b) => a.amountNeeded - b.amountNeeded || b.estimatedSavings - a.estimatedSavings);

  return candidates[0] ?? null;
}

export function findBestGuestCoupon(
  subtotal: number,
  coupons: GuestCouponOption[],
  options: { includeShipping?: boolean } = {},
): CouponResult | null {
  const candidates = coupons
    .filter((coupon) => options.includeShipping || coupon.type !== "FREE_SHIPPING")
    .map((coupon) => computeGuestCoupon(coupon.code, subtotal, coupons))
    .filter((coupon): coupon is CouponResult => Boolean(coupon && coupon.amount > 0))
    .sort((a, b) => b.amount - a.amount);

  return candidates[0] ?? null;
}

export function computeGuestCoupon(code: string, subtotal: number, coupons: GuestCouponOption[]): CouponResult | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized || subtotal <= 0) return null;

  const coupon = coupons.find((item) => item.code === normalized);
  if (!coupon) return null;
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) return null;
  return { code: normalized, amount: estimateGuestCouponSavings(coupon, subtotal), type: coupon.type };
}
