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

const DEFAULT_VOUCHER_CREATED_AT = "2026-05-27T00:00:00.000Z";
const DEFAULT_VOUCHER_ENDS_SOON_AT = "2026-06-02T23:59:59.000Z";

export const GUEST_COUPON_OPTIONS: GuestCouponOption[] = [
  {
    code: "SAVE20K",
    name: "Giảm trực tiếp 20K",
    type: "FIXED_AMOUNT",
    value: 20000,
    maxDiscountValue: null,
    minOrderValue: 299000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    recommended: true,
    description: "Ưu đãi nhỏ dễ dùng",
    conditionLabel: "Đơn tối thiểu 299.000đ",
  },
  {
    code: "SAVE30K",
    name: "Giảm trực tiếp 30K",
    type: "FIXED_AMOUNT",
    value: 30000,
    maxDiscountValue: null,
    minOrderValue: 499000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    recommended: true,
    description: "Ưu đãi phổ biến",
    conditionLabel: "Đơn tối thiểu 499.000đ",
  },
  {
    code: "SAVE50K",
    name: "Giảm trực tiếp 50K",
    type: "FIXED_AMOUNT",
    value: 50000,
    maxDiscountValue: null,
    minOrderValue: 799000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    endsAt: DEFAULT_VOUCHER_ENDS_SOON_AT,
    expiresSoon: true,
    description: "Giảm 50.000đ cho đơn giá trị tốt",
    conditionLabel: "Đơn tối thiểu 799.000đ",
  },
  {
    code: "SAVE80K",
    name: "Giảm trực tiếp 80K",
    type: "FIXED_AMOUNT",
    value: 80000,
    maxDiscountValue: null,
    minOrderValue: 1499000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    endsAt: DEFAULT_VOUCHER_ENDS_SOON_AT,
    expiresSoon: true,
    description: "Ưu đãi cho đơn hàng giá trị cao",
    conditionLabel: "Đơn tối thiểu 1.499.000đ",
  },
  {
    code: "SAVE100K",
    name: "Ưu đãi điện tử 100K",
    type: "FIXED_AMOUNT",
    value: 100000,
    maxDiscountValue: null,
    minOrderValue: 1999000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    description: "Voucher bậc thang cho nhóm điện tử",
    conditionLabel: "Đơn tối thiểu 1.999.000đ",
  },
  {
    code: "SAVE150K",
    name: "Ưu đãi điện tử 150K",
    type: "FIXED_AMOUNT",
    value: 150000,
    maxDiscountValue: null,
    minOrderValue: 2999000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    description: "Voucher bậc thang cho nhóm điện tử",
    conditionLabel: "Đơn tối thiểu 2.999.000đ",
  },
  {
    code: "SAVE200K",
    name: "Ưu đãi điện tử 200K",
    type: "FIXED_AMOUNT",
    value: 200000,
    maxDiscountValue: null,
    minOrderValue: 4999000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    description: "Voucher bậc thang cho nhóm điện tử",
    conditionLabel: "Đơn tối thiểu 4.999.000đ",
  },
  {
    code: "WELCOME5",
    name: "Giảm 5% đơn hàng",
    type: "PERCENT",
    value: 5,
    maxDiscountValue: 30000,
    minOrderValue: 299000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    recommended: true,
    newCustomerOnly: true,
    description: "Ưu đãi phần trăm an toàn",
    conditionLabel: "Đơn tối thiểu 299.000đ",
  },
  {
    code: "WELCOME10",
    name: "Giảm 10% đơn hàng",
    type: "PERCENT",
    value: 10,
    maxDiscountValue: 100000,
    minOrderValue: 500000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    endsAt: DEFAULT_VOUCHER_ENDS_SOON_AT,
    expiresSoon: true,
    newCustomerOnly: true,
    description: "Ưu đãi khách hàng mới",
    conditionLabel: "Đơn tối thiểu 500.000đ",
  },
  {
    code: "FREESHIP20",
    name: "Ưu đãi vận chuyển 20K",
    type: "FREE_SHIPPING",
    value: 20000,
    maxDiscountValue: 20000,
    minOrderValue: 199000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    recommended: true,
    description: "Hỗ trợ phí vận chuyển",
    conditionLabel: "Đơn tối thiểu 199.000đ",
  },
  {
    code: "FREESHIP30",
    name: "Ưu đãi vận chuyển 30K",
    type: "FREE_SHIPPING",
    value: 30000,
    maxDiscountValue: 30000,
    minOrderValue: 399000,
    createdAt: DEFAULT_VOUCHER_CREATED_AT,
    endsAt: DEFAULT_VOUCHER_ENDS_SOON_AT,
    expiresSoon: true,
    description: "Hỗ trợ phí vận chuyển",
    conditionLabel: "Đơn tối thiểu 399.000đ",
  },
];

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
  options: { maxGap?: number } = {},
): VoucherMilestone | null {
  const maxGap = options.maxGap ?? 2000000;
  const candidates = GUEST_COUPON_OPTIONS
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
  options: { includeShipping?: boolean } = {},
): CouponResult | null {
  const candidates = GUEST_COUPON_OPTIONS
    .filter((coupon) => options.includeShipping || coupon.type !== "FREE_SHIPPING")
    .map((coupon) => computeGuestCoupon(coupon.code, subtotal))
    .filter((coupon): coupon is CouponResult => Boolean(coupon && coupon.amount > 0))
    .sort((a, b) => b.amount - a.amount);

  return candidates[0] ?? null;
}

export function computeGuestCoupon(code: string, subtotal: number): CouponResult | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized || subtotal <= 0) return null;

  const coupon = GUEST_COUPON_OPTIONS.find((item) => item.code === normalized);
  if (!coupon) return null;
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) return null;
  return { code: normalized, amount: estimateGuestCouponSavings(coupon, subtotal), type: coupon.type };
}
