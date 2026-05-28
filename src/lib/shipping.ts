export type ShippingRegion = "HANOI_INNER" | "NORTH" | "CENTRAL" | "SOUTH";
export type ShippingClass = "LIGHT" | "STANDARD" | "HEAVY" | "BULKY";

export interface ShippingAddressInput {
  provinceCode?: string | null;
  provinceName?: string | null;
}

export interface ShippingQuoteInput {
  shippingClass?: ShippingClass | null;
}

export interface ShippingQuote {
  provider: "internal";
  region: ShippingRegion;
  regionLabel: string;
  shippingClass: ShippingClass;
  shippingClassLabel: string;
  fee: number;
}

export interface ShippingPromotionTier {
  minOrderValue: number;
  discountAmount: number | "FREE";
  enabled: boolean;
}

export interface ShippingPromotionConfig {
  enabled: boolean;
  tiers: ShippingPromotionTier[];
}

export interface ShippingPromotionResult {
  tier: ShippingPromotionTier;
  discountAmount: number;
  freeShipping: boolean;
}

export interface ShippingPromotionProgress {
  tier: ShippingPromotionTier;
  amountNeeded: number;
  progress: number;
  label: string;
}

export interface ShippingProvider {
  getQuote(address: ShippingAddressInput, input?: ShippingQuoteInput): ShippingQuote | null;
}

export const SHIPPING_CLASS_OPTIONS: Array<{
  value: ShippingClass;
  label: string;
  description: string;
  examples: string;
}> = [
  {
    value: "LIGHT",
    label: "Nhẹ (<0.5kg)",
    description: "Phụ kiện nhỏ, dễ đóng gói.",
    examples: "Ví dụ: cáp sạc, ốp lưng, kính cường lực, adapter nhỏ.",
  },
  {
    value: "STANDARD",
    label: "Tiêu chuẩn (0.5kg - 2kg)",
    description: "Thiết bị và phụ kiện phổ biến.",
    examples: "Ví dụ: tai nghe, bàn phím, chuột, loa mini, router.",
  },
  {
    value: "HEAVY",
    label: "Nặng (2kg - 5kg)",
    description: "Sản phẩm điện tử có trọng lượng cao hơn.",
    examples: "Ví dụ: màn hình nhỏ, máy in mini, bộ thiết bị nhiều món.",
  },
  {
    value: "BULKY",
    label: "Cồng kềnh (>5kg)",
    description: "Hàng lớn cần đóng gói và xử lý riêng.",
    examples: "Ví dụ: màn hình lớn, ghế gaming, thiết bị cồng kềnh.",
  },
];

const SHIPPING_CLASS_RANK: Record<ShippingClass, number> = {
  LIGHT: 1,
  STANDARD: 2,
  HEAVY: 3,
  BULKY: 4,
};

const SHIPPING_RATE_TABLE: Record<ShippingClass, Record<ShippingRegion, number>> = {
  LIGHT: {
    HANOI_INNER: 20000,
    NORTH: 25000,
    CENTRAL: 35000,
    SOUTH: 45000,
  },
  STANDARD: {
    HANOI_INNER: 30000,
    NORTH: 40000,
    CENTRAL: 55000,
    SOUTH: 70000,
  },
  HEAVY: {
    HANOI_INNER: 45000,
    NORTH: 60000,
    CENTRAL: 85000,
    SOUTH: 110000,
  },
  BULKY: {
    HANOI_INNER: 80000,
    NORTH: 100000,
    CENTRAL: 140000,
    SOUTH: 180000,
  },
};

export const DEFAULT_SHIPPING_PROMOTION_CONFIG: ShippingPromotionConfig = {
  enabled: true,
  tiers: [
    { minOrderValue: 999000, discountAmount: 30000, enabled: true },
    { minOrderValue: 1499000, discountAmount: 50000, enabled: true },
    { minOrderValue: 2999000, discountAmount: "FREE", enabled: true },
  ],
};

const REGION_LABELS: Record<ShippingRegion, string> = {
  HANOI_INNER: "Nội thành Hà Nội",
  NORTH: "Miền Bắc",
  CENTRAL: "Miền Trung",
  SOUTH: "Miền Nam",
};

const SHIPPING_CLASS_LABELS: Record<ShippingClass, string> = SHIPPING_CLASS_OPTIONS.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<ShippingClass, string>,
);

const CENTRAL_PROVINCES = new Set([
  "thanh hoa",
  "nghe an",
  "ha tinh",
  "quang binh",
  "quang tri",
  "thua thien hue",
  "hue",
  "da nang",
  "quang nam",
  "quang ngai",
  "binh dinh",
  "phu yen",
  "khanh hoa",
  "ninh thuan",
  "binh thuan",
  "lam dong",
  "dak lak",
  "dak nong",
  "gia lai",
  "kon tum",
]);

const SOUTH_PROVINCES = new Set([
  "tp ho chi minh",
  "tp.hcm",
  "tphcm",
  "hcm",
  "ho chi minh",
  "sai gon",
  "binh duong",
  "dong nai",
  "ba ria vung tau",
  "tay ninh",
  "binh phuoc",
  "long an",
  "tien giang",
  "ben tre",
  "tra vinh",
  "vinh long",
  "dong thap",
  "an giang",
  "kien giang",
  "can tho",
  "hau giang",
  "soc trang",
  "bac lieu",
  "ca mau",
]);

function normalizeProvinceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp|tp\.)\s+/g, "")
    .trim();
}

export function resolveShippingRegion(address: ShippingAddressInput): ShippingRegion | null {
  const provinceName = normalizeProvinceName(address.provinceName ?? "");
  if (!provinceName) return null;
  if (provinceName === "ha noi" || provinceName === "hanoi") return "HANOI_INNER";
  if (CENTRAL_PROVINCES.has(provinceName)) return "CENTRAL";
  if (SOUTH_PROVINCES.has(provinceName)) return "SOUTH";
  return "NORTH";
}

export function normalizeShippingClass(value: unknown): ShippingClass {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "STANDARD" || normalized === "HEAVY" || normalized === "BULKY" || normalized === "LIGHT") {
    return normalized;
  }
  return "LIGHT";
}

export function resolveCartShippingClass(items: Array<{ shippingClass?: unknown }>): ShippingClass {
  return items.reduce<ShippingClass>((current, item) => {
    const next = normalizeShippingClass(item.shippingClass);
    return SHIPPING_CLASS_RANK[next] > SHIPPING_CLASS_RANK[current] ? next : current;
  }, "LIGHT");
}

export function getShippingRateRange(shippingClass: ShippingClass): { min: number; max: number } {
  const rates = Object.values(SHIPPING_RATE_TABLE[shippingClass]);
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
  };
}

export function normalizeShippingPromotionConfig(input?: Partial<ShippingPromotionConfig> | null): ShippingPromotionConfig {
  const source = input ?? DEFAULT_SHIPPING_PROMOTION_CONFIG;
  const fallbackTiers = DEFAULT_SHIPPING_PROMOTION_CONFIG.tiers;
  const tiers = (Array.isArray(source.tiers) && source.tiers.length ? source.tiers : fallbackTiers)
    .map((tier, index) => {
      const fallback = fallbackTiers[index] ?? fallbackTiers[fallbackTiers.length - 1];
      const discountAmount: ShippingPromotionTier["discountAmount"] =
        tier.discountAmount === "FREE" ? "FREE" : Math.max(0, Number(tier.discountAmount ?? fallback.discountAmount));
      return {
        minOrderValue: Math.max(0, Number(tier.minOrderValue ?? fallback.minOrderValue)),
        discountAmount,
        enabled: tier.enabled !== false,
      };
    })
    .sort((a, b) => a.minOrderValue - b.minOrderValue);

  return {
    enabled: source.enabled !== false,
    tiers,
  };
}

export function buildShippingPromotionConfig(input: {
  shippingPromoEnabled?: boolean;
  shippingPromoTier1Min?: number;
  shippingPromoTier1Discount?: number;
  shippingPromoTier2Min?: number;
  shippingPromoTier2Discount?: number;
  shippingPromoFreeMin?: number;
}): ShippingPromotionConfig {
  return normalizeShippingPromotionConfig({
    enabled: input.shippingPromoEnabled,
    tiers: [
      {
        minOrderValue: input.shippingPromoTier1Min ?? 999000,
        discountAmount: input.shippingPromoTier1Discount ?? 30000,
        enabled: true,
      },
      {
        minOrderValue: input.shippingPromoTier2Min ?? 1499000,
        discountAmount: input.shippingPromoTier2Discount ?? 50000,
        enabled: true,
      },
      {
        minOrderValue: input.shippingPromoFreeMin ?? 2999000,
        discountAmount: "FREE",
        enabled: true,
      },
    ],
  });
}

export function getShippingPromotionDiscount(
  subtotal: number,
  shippingFee: number,
  config: Partial<ShippingPromotionConfig> | null | undefined = DEFAULT_SHIPPING_PROMOTION_CONFIG,
): ShippingPromotionResult | null {
  const normalized = normalizeShippingPromotionConfig(config);
  if (!normalized.enabled || subtotal <= 0 || shippingFee <= 0) return null;
  const eligible = normalized.tiers
    .filter((tier) => tier.enabled && subtotal >= tier.minOrderValue)
    .sort((a, b) => b.minOrderValue - a.minOrderValue)[0];
  if (!eligible) return null;
  const rawDiscount = eligible.discountAmount === "FREE" ? shippingFee : Number(eligible.discountAmount);
  const discountAmount = Math.min(Math.max(0, rawDiscount), shippingFee);
  if (discountAmount <= 0) return null;
  return {
    tier: eligible,
    discountAmount,
    freeShipping: eligible.discountAmount === "FREE",
  };
}

export function getNextShippingPromotionProgress(
  subtotal: number,
  config: Partial<ShippingPromotionConfig> | null | undefined = DEFAULT_SHIPPING_PROMOTION_CONFIG,
): ShippingPromotionProgress | null {
  const normalized = normalizeShippingPromotionConfig(config);
  if (!normalized.enabled || subtotal <= 0) return null;
  const nextTier = normalized.tiers
    .filter((tier) => tier.enabled && tier.minOrderValue > subtotal)
    .sort((a, b) => a.minOrderValue - b.minOrderValue)[0];
  if (!nextTier) return null;
  const amountNeeded = nextTier.minOrderValue - subtotal;
  const label = nextTier.discountAmount === "FREE"
    ? "miễn phí vận chuyển"
    : `ưu đãi vận chuyển ${new Intl.NumberFormat("vi-VN").format(Number(nextTier.discountAmount))}đ`;
  return {
    tier: nextTier,
    amountNeeded,
    progress: Math.min(100, Math.max(0, (subtotal / nextTier.minOrderValue) * 100)),
    label,
  };
}

export class InternalShippingProvider implements ShippingProvider {
  getQuote(address: ShippingAddressInput, input: ShippingQuoteInput = {}): ShippingQuote | null {
    const region = resolveShippingRegion(address);
    if (!region) return null;
    const shippingClass = normalizeShippingClass(input.shippingClass);
    return {
      provider: "internal",
      region,
      regionLabel: REGION_LABELS[region],
      shippingClass,
      shippingClassLabel: SHIPPING_CLASS_LABELS[shippingClass],
      fee: SHIPPING_RATE_TABLE[shippingClass][region],
    };
  }
}

export const internalShippingProvider = new InternalShippingProvider();

export function getInternalShippingQuote(
  address: ShippingAddressInput,
  input: ShippingQuoteInput = {},
): ShippingQuote | null {
  return internalShippingProvider.getQuote(address, input);
}
