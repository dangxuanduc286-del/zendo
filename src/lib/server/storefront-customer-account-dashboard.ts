import "server-only";

import type { PrismaClient } from "@prisma/client";
import { resolveCustomerAffiliateProfile } from "@/lib/affiliate-customer-status";
import { resolveProductImage } from "@/lib/product-image";
import {
  getStorefrontCustomerAccountNotifications,
  type StorefrontCustomerAccountNotifications,
} from "@/lib/server/storefront-customer-account-notifications";
import { memoizeArgsPerRequest } from "@/lib/runtime/request-cache";
import { AFFILIATE_DB_QUERY_CONCURRENCY, runQueriesInChunks } from "@/lib/server/run-queries-in-chunks";

export type StorefrontCustomerAccountDashboardData = {
  displayName: string;
  avatarUrl: string;
  contactText: string;
  birthDate: string;
  gender: string;
  badge: "CTV" | "VIP" | "Thành viên";
  stats: {
    totalOrders: number;
    processingOrders: number;
    vouchers: number;
    rewardPoints: number;
    affiliateCommission: number;
    addresses: number;
  };
  addresses: Array<{
    id: string;
    receiverName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    detail: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  orders: Array<{
    id: string;
    code: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    itemCount: number;
    productNames: string[];
    /** Dòng đơn kèm ảnh (ưu tiên ảnh chính của product tại thời điểm load). */
    linePreviews: Array<{ productName: string; quantity: number; imageUrl: string }>;
  }>;
  vouchers: {
    active: StorefrontAccountVoucher[];
    used: StorefrontAccountVoucher[];
    expired: StorefrontAccountVoucher[];
  };
  notifications: StorefrontCustomerAccountNotifications;
  personalized: {
    wishlist: Array<{ id: string; name: string; slug: string }>;
    recentlyViewed: Array<{ id: string; name: string; slug: string }>;
    recommended: Array<{ id: string; name: string; slug: string }>;
  };
  affiliate: {
    hasProfile: boolean;
    isActive: boolean;
    refCode: string;
    referralUrl: string;
    totalClicks: number;
    referredOrders: number;
  };
  loyalty: {
    points: number;
    memberRank: string;
    lifetimeSpent: number;
    completedOrders: number;
    transactions: Array<{
      id: string;
      points: number;
      type: string;
      description: string;
      createdAt: string;
      orderCode: string | null;
    }>;
  };
};

export type StorefrontAccountVoucher = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  scope: "ORDER" | "SHIPPING";
  currency: "VND";
  discountValue: number;
  maxDiscountValue: number | null;
  minOrderValue: number | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  remainingUses: number | null;
  startAt: string;
  endAt: string;
  expiresAt: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED";
  availability: "available" | "used" | "expired" | "disabled" | "upcoming" | "unavailable";
  voucherType: string;
  freeShipping: boolean;
  appliesToProducts: string;
  appliesToCategories: string;
  appliesToUsers: string;
  specialConditions: string[];
  updatedAt: string;
};

type ParsedNotes = Record<string, unknown>;

function parseNotes(notes: string | null): ParsedNotes {
  const raw = (notes || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as ParsedNotes;
  } catch {
    return {};
  }
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type AffiliateDashboardMetrics = {
  totalClicks: number;
  referredOrders: number;
  affiliateCommission: number;
  rewardPoints: number;
};

async function loadAffiliateDashboardMetrics(
  db: PrismaClient,
  affiliateProfileId: string | null,
): Promise<AffiliateDashboardMetrics> {
  if (!affiliateProfileId) {
    return { totalClicks: 0, referredOrders: 0, affiliateCommission: 0, rewardPoints: 0 };
  }
  const [totalClicks, referredOrders, sumCommission, sumPoints] = await Promise.all([
    db.affiliateClick.count({ where: { affiliateProfileId } }),
    db.order.count({ where: { affiliateProfileId } }),
    db.affiliateCommission.aggregate({
      where: {
        affiliateProfileId,
        status: { in: ["PENDING", "WAITING_RELEASE", "AVAILABLE", "PAID"] },
      },
      _sum: { amount: true },
    }),
    db.rewardPointLedger.aggregate({
      where: { affiliateProfileId, status: { in: ["PENDING", "AVAILABLE"] } },
      _sum: { points: true },
    }),
  ]);
  return {
    totalClicks,
    referredOrders,
    affiliateCommission: Number(sumCommission._sum.amount ?? 0),
    rewardPoints: Number(sumPoints._sum.points ?? 0),
  };
}

async function getStorefrontCustomerAccountDashboardDataInternal(
  userId: string,
): Promise<StorefrontCustomerAccountDashboardData> {
  const { db } = await import("@/lib/db");
  const now = new Date();

  const customer = await db.customer.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      notes: true,
      loyaltyPoints: true,
      memberRank: true,
      lifetimeSpent: true,
      completedOrders: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          fullName: true,
          phone: true,
          city: true,
          district: true,
          ward: true,
          line1: true,
          line2: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!customer) {
    return {
      displayName: "",
      avatarUrl: "",
      contactText: "",
      birthDate: "",
      gender: "",
      badge: "Thành viên",
      stats: {
        totalOrders: 0,
        processingOrders: 0,
        vouchers: 0,
        rewardPoints: 0,
        affiliateCommission: 0,
        addresses: 0,
      },
      addresses: [],
      orders: [],
      vouchers: { active: [], used: [], expired: [] },
      notifications: { unread: 0, groups: { order: 0, promotion: 0, system: 0, commission: 0 }, items: [] },
      personalized: { wishlist: [], recentlyViewed: [], recommended: [] },
      affiliate: {
        hasProfile: false,
        isActive: false,
        refCode: "",
        referralUrl: "",
        totalClicks: 0,
        referredOrders: 0,
      },
      loyalty: {
        points: 0,
        memberRank: "BRONZE",
        lifetimeSpent: 0,
        completedOrders: 0,
        transactions: [],
      },
    };
  }

  const notes = parseNotes(customer.notes);
  const avatarUrl = pickString(notes.avatarUrl);
  const birthDate = pickString(notes.birthDate);
  const gender = pickString(notes.gender);
  const displayName =
    (customer.fullName || "").trim() || (customer.email || "").trim() || (customer.phone || "").trim();
  const contactText = (customer.email || "").trim() || (customer.phone || "").trim() || "";

  const affiliateProfile = await resolveCustomerAffiliateProfile(userId);
  const affiliateActive = affiliateProfile.active;
  const refCode = affiliateProfile.refCode || "";
  const referralUrl = refCode ? `/?ref=${encodeURIComponent(refCode)}` : "";
  const affiliateProfileId = affiliateProfile.profileId;

  const [
    totalOrders,
    processingOrders,
    recentOrders,
    activeCoupons,
    usedCoupons,
    expiredCoupons,
    addressCount,
    affiliateMetrics,
    loyaltyTransactions,
  ] = await runQueriesInChunks(
    [
      () => db.order.count({ where: { customerId: userId } }),
      () =>
        db.order.count({
          where: {
            customerId: userId,
            orderStatus: { in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING"] },
          },
        }),
      () =>
        db.order.findMany({
          where: { customerId: userId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            code: true,
            orderStatus: true,
            paymentStatus: true,
            totalAmount: true,
            createdAt: true,
            items: {
              orderBy: { createdAt: "asc" },
              take: 12,
              select: {
                productName: true,
                quantity: true,
                product: {
                  select: {
                    images: {
                      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                      take: 1,
                      select: { url: true, isPrimary: true, sortOrder: true, altText: true },
                    },
                  },
                },
              },
            },
          },
        }),
      () =>
        db.coupon.findMany({
          where: {
            status: "ACTIVE",
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            type: true,
            scope: true,
            value: true,
            maxDiscountAmount: true,
            minOrderAmount: true,
            usageLimit: true,
            usagePerCustomer: true,
            usedCount: true,
            startsAt: true,
            endsAt: true,
            status: true,
            updatedAt: true,
          },
        }),
      () =>
        db.coupon.findMany({
          where: {
            status: { in: ["ACTIVE", "EXPIRED", "DISABLED"] },
            orders: { some: { customerId: userId } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            type: true,
            scope: true,
            value: true,
            maxDiscountAmount: true,
            minOrderAmount: true,
            usageLimit: true,
            usagePerCustomer: true,
            usedCount: true,
            startsAt: true,
            endsAt: true,
            status: true,
            updatedAt: true,
          },
        }),
      () =>
        db.coupon.findMany({
          where: {
            OR: [{ status: "EXPIRED" }, { endsAt: { lte: now } }],
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            type: true,
            scope: true,
            value: true,
            maxDiscountAmount: true,
            minOrderAmount: true,
            usageLimit: true,
            usagePerCustomer: true,
            usedCount: true,
            startsAt: true,
            endsAt: true,
            status: true,
            updatedAt: true,
          },
        }),
      () => db.address.count({ where: { customerId: userId } }),
      () =>
        affiliateActive
          ? loadAffiliateDashboardMetrics(db, affiliateProfileId)
          : Promise.resolve({
              totalClicks: 0,
              referredOrders: 0,
              affiliateCommission: 0,
              rewardPoints: 0,
            }),
      () =>
        db.loyaltyTransaction.findMany({
          where: { customerId: userId },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            points: true,
            type: true,
            description: true,
            createdAt: true,
            order: { select: { code: true } },
          },
        }),
    ] as const,
    AFFILIATE_DB_QUERY_CONCURRENCY,
  );

  const rewardPoints = affiliateMetrics.rewardPoints;

  /** Thông báo + feed SSR (client vẫn poll qua `useCustomerNotificationsPoll`). */
  const notificationsPayload = await getStorefrontCustomerAccountNotifications(userId);

  const addrList = (customer.addresses ?? []).map((a) => {
    const detail = [a.line1, a.line2].filter(Boolean).join(", ");
    return {
      id: a.id,
      receiverName: a.fullName,
      phone: a.phone,
      province: a.city,
      district: a.district,
      ward: a.ward ?? "",
      detail,
      isDefault: a.isDefault,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  });

  const orders = recentOrders.map((o) => {
    const rawItems = Array.isArray(o.items) ? o.items : [];
    const linePreviews = rawItems.map((it) => {
      const productName = (it.productName || "Sản phẩm").trim() || "Sản phẩm";
      return {
        productName,
        quantity: Math.max(1, Math.floor(Number(it.quantity)) || 1),
        imageUrl: resolveProductImage(it.product?.images, productName).url,
      };
    });
    return {
      id: o.id,
      code: o.code,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount ?? 0),
      createdAt: o.createdAt.toISOString(),
      itemCount: rawItems.length,
      productNames: linePreviews.map((l) => l.productName).slice(0, 6),
      linePreviews: linePreviews.slice(0, 6),
    };
  });

  const toVoucher = (c: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: "PERCENT" | "FIXED_AMOUNT" | "FREE_SHIPPING";
    scope: "ORDER" | "SHIPPING";
    value: unknown;
    maxDiscountAmount: unknown;
    minOrderAmount: unknown;
    usageLimit: number | null;
    usagePerCustomer: number | null;
    usedCount: number;
    startsAt: Date | null;
    endsAt: Date | null;
    status: "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED";
    updatedAt: Date;
  }, availabilityOverride?: StorefrontAccountVoucher["availability"]): StorefrontAccountVoucher => {
    const remainingUses = c.usageLimit == null ? null : Math.max(0, c.usageLimit - c.usedCount);
    const availability = availabilityOverride ?? (c.status === "DISABLED"
      ? "disabled"
      : c.status === "EXPIRED" || (c.endsAt && c.endsAt <= now)
        ? "expired"
        : c.startsAt && c.startsAt > now
          ? "upcoming"
          : c.status === "ACTIVE" && (remainingUses == null || remainingUses > 0)
            ? "available"
            : "unavailable");
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      description: (c.description || "").trim(),
      discountType: c.type,
      scope: c.scope,
      currency: "VND",
      discountValue: Number(c.value),
      maxDiscountValue: c.maxDiscountAmount == null ? null : Number(c.maxDiscountAmount),
      minOrderValue: c.minOrderAmount == null ? null : Number(c.minOrderAmount),
      usageLimit: c.usageLimit,
      usagePerCustomer: c.usagePerCustomer,
      usedCount: c.usedCount,
      remainingUses,
      startAt: c.startsAt ? c.startsAt.toISOString() : "",
      endAt: c.endsAt ? c.endsAt.toISOString() : "",
      expiresAt: c.endsAt ? c.endsAt.toISOString() : "",
      status: c.status,
      availability,
      voucherType: c.scope === "SHIPPING" || c.type === "FREE_SHIPPING" ? "Vận chuyển" : "Đơn hàng",
      freeShipping: c.type === "FREE_SHIPPING" || c.scope === "SHIPPING",
      appliesToProducts: "Tất cả sản phẩm đủ điều kiện",
      appliesToCategories: "Tất cả danh mục đủ điều kiện",
      appliesToUsers: c.usagePerCustomer ? `Tối đa ${c.usagePerCustomer} lượt/khách` : "Tất cả khách hàng",
      specialConditions: [
        c.minOrderAmount != null ? `Đơn tối thiểu ${Number(c.minOrderAmount).toLocaleString("vi-VN")}đ` : "Không yêu cầu đơn tối thiểu",
        c.maxDiscountAmount != null ? `Giảm tối đa ${Number(c.maxDiscountAmount).toLocaleString("vi-VN")}đ` : "Không giới hạn giảm tối đa",
        c.usageLimit != null ? `Tổng giới hạn ${c.usageLimit.toLocaleString("vi-VN")} lượt` : "Không giới hạn tổng lượt dùng",
      ],
      updatedAt: c.updatedAt.toISOString(),
    };
  };

  const activeVoucherWallet = activeCoupons
    .map((coupon) => toVoucher(coupon))
    .sort((a, b) => new Date(b.updatedAt || b.startAt || 0).getTime() - new Date(a.updatedAt || a.startAt || 0).getTime());

  return {
    displayName,
    avatarUrl,
    contactText,
    birthDate,
    gender,
    badge: affiliateActive ? "CTV" : "Thành viên",
    stats: {
      totalOrders,
      processingOrders,
      vouchers: activeVoucherWallet.length,
      rewardPoints,
      affiliateCommission: affiliateMetrics.affiliateCommission,
      addresses: addressCount,
    },
    addresses: addrList,
    orders,
    vouchers: {
      active: activeVoucherWallet,
      used: usedCoupons.map((coupon) => toVoucher(coupon, "used")),
      expired: expiredCoupons.map((coupon) => toVoucher(coupon, "expired")),
    },
    notifications: notificationsPayload,
    personalized: { wishlist: [], recentlyViewed: [], recommended: [] },
    affiliate: {
      hasProfile: affiliateActive,
      isActive: affiliateActive,
      refCode,
      referralUrl,
      totalClicks: affiliateMetrics.totalClicks,
      referredOrders: affiliateMetrics.referredOrders,
    },
    loyalty: {
      points: customer.loyaltyPoints,
      memberRank: customer.memberRank || "BRONZE",
      lifetimeSpent: Number(customer.lifetimeSpent ?? 0),
      completedOrders: customer.completedOrders,
      transactions: loyaltyTransactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
        orderCode: t.order?.code ?? null,
      })),
    },
  };
}

export const getStorefrontCustomerAccountDashboardData = memoizeArgsPerRequest(
  getStorefrontCustomerAccountDashboardDataInternal,
);
