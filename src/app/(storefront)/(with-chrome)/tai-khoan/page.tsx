import "server-only";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CustomerAccountDashboard from "../../../../components/storefront/customer-account-dashboard";
import CustomerAuthCard from "../../../../components/storefront/customer-auth-card";
import { authOptions } from "../../../../lib/auth";
import { StorefrontAccountShell } from "../../../../components/storefront/storefront-account-shell";
import { getStorefrontSettings } from "../../../../lib/storefront-settings";
import { resolveCustomerAffiliateProfile } from "../../../../lib/affiliate-customer-status";
import { listPolicyHubCardsForAccount } from "../../../../lib/site-policy-queries";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản | Zendo.vn",
  description:
    "Đăng nhập hoặc tạo tài khoản Zendo.vn để theo dõi đơn hàng, lưu giỏ hàng và nhận ưu đãi mua sắm.",
  alternates: {
    canonical: "https://zendo.vn/tai-khoan",
  },
  robots: {
    index: false,
    follow: false,
  },
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

async function getCustomerDashboardData(userId: string): Promise<{
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
  }>;
  vouchers: {
    active: Array<{ code: string; name: string; description: string; expiresAt: string }>;
    used: Array<{ code: string; name: string; description: string; expiresAt: string }>;
    expired: Array<{ code: string; name: string; description: string; expiresAt: string }>;
  };
  notifications: {
    unread: number;
    groups: { order: number; promotion: number; system: number; commission: number };
    items: Array<{
      id: string;
      category: "order" | "promotion" | "system" | "commission";
      title: string;
      body: string;
      read: boolean;
      createdAt: string;
      actionHref: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
  };
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
}> {
  const { db } = await import("../../../../lib/db");
  const now = new Date();

  const customer = await db.customer.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      notes: true,
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
    };
  }

  const notes = parseNotes(customer.notes);
  const avatarUrl = pickString(notes.avatarUrl);
  const birthDate = pickString(notes.birthDate);
  const gender = pickString(notes.gender);
  const displayName = (customer.fullName || "").trim() || (customer.email || "").trim() || (customer.phone || "").trim();
  const contactText = (customer.email || "").trim() || (customer.phone || "").trim() || "";

  const affiliateProfile = await resolveCustomerAffiliateProfile(userId);
  const affiliateActive = affiliateProfile.active;
  const refCode = affiliateProfile.refCode || "";
  const referralUrl = refCode ? `/?ref=${encodeURIComponent(refCode)}` : "";

  const [
    totalOrders,
    processingOrders,
    recentOrders,
    activeCoupons,
    usedCoupons,
    expiredCoupons,
    addressCount,
    affiliateAgg,
    rewardPoints,
  ] = await Promise.all([
    db.order.count({ where: { customerId: userId } }),
    db.order.count({
      where: {
        customerId: userId,
        orderStatus: { in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING"] },
      },
    }),
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
        items: { select: { productName: true } },
      },
    }),
    db.coupon.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { code: true, name: true, description: true, endsAt: true },
    }),
    db.coupon.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRED", "DISABLED"] },
        orders: { some: { customerId: userId } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { code: true, name: true, description: true, endsAt: true },
    }),
    db.coupon.findMany({
      where: {
        OR: [{ status: "EXPIRED" }, { endsAt: { lte: now } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { code: true, name: true, description: true, endsAt: true },
    }),
    db.address.count({ where: { customerId: userId } }),
    affiliateActive
      ? (async () => {
          const row = await db.affiliateProfile.findFirst({
            where: { customerId: userId, status: "ACTIVE" },
            select: { id: true },
          });
          if (!row?.id) return { totalClicks: 0, referredOrders: 0, affiliateCommission: 0 };
          const [totalClicks, referredOrders, sumCommission] = await Promise.all([
            db.affiliateClick.count({ where: { affiliateProfileId: row.id } }),
            db.order.count({ where: { affiliateProfileId: row.id } }),
            db.affiliateCommission.aggregate({
              where: { affiliateProfileId: row.id, status: { in: ["PENDING", "APPROVED", "PAID"] } },
              _sum: { amount: true },
            }),
          ]);
          return {
            totalClicks,
            referredOrders,
            affiliateCommission: Number(sumCommission._sum.amount ?? 0),
          };
        })()
      : Promise.resolve({ totalClicks: 0, referredOrders: 0, affiliateCommission: 0 }),
    affiliateActive
      ? (async () => {
          const row = await db.affiliateProfile.findFirst({
            where: { customerId: userId, status: "ACTIVE" },
            select: { id: true },
          });
          if (!row?.id) return 0;
          const sum = await db.rewardPointLedger.aggregate({
            where: { affiliateProfileId: row.id, status: { in: ["PENDING", "AVAILABLE"] } },
            _sum: { points: true },
          });
          return Number(sum._sum.points ?? 0);
        })()
      : Promise.resolve(0),
  ]);

  const notificationsPayload = await (async () => {
    const [unreadTotal, unreadByCategory, notifRows] = await Promise.all([
      db.customerAccountNotification.count({ where: { customerId: userId, readAt: null } }),
      db.customerAccountNotification.groupBy({
        by: ["category"],
        where: { customerId: userId, readAt: null },
        _count: { _all: true },
      }),
      db.customerAccountNotification.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: {
          id: true,
          category: true,
          title: true,
          body: true,
          actionHref: true,
          readAt: true,
          createdAt: true,
          metadata: true,
        },
      }),
    ]);
    const groups = { order: 0, promotion: 0, system: 0, commission: 0 };
    for (const row of unreadByCategory) {
      const n = row._count._all;
      if (row.category === "ORDER") groups.order += n;
      else if (row.category === "PROMOTION") groups.promotion += n;
      else if (row.category === "COMMISSION") groups.commission += n;
      else groups.system += n;
    }
    return {
      unread: unreadTotal,
      groups,
      items: notifRows.map((r) => ({
        id: r.id,
        category:
          r.category === "ORDER"
            ? ("order" as const)
            : r.category === "PROMOTION"
              ? ("promotion" as const)
              : r.category === "COMMISSION"
                ? ("commission" as const)
                : ("system" as const),
        title: r.title,
        body: r.body,
        read: r.readAt != null,
        createdAt: r.createdAt.toISOString(),
        actionHref: r.actionHref,
        metadata:
          r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
            ? (r.metadata as Record<string, unknown>)
            : null,
      })),
    };
  })();

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

  const orders = recentOrders.map((o) => ({
    id: o.id,
    code: o.code,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    totalAmount: Number(o.totalAmount ?? 0),
    createdAt: o.createdAt.toISOString(),
    itemCount: Array.isArray(o.items) ? o.items.length : 0,
    productNames: Array.isArray(o.items) ? o.items.map((it) => it.productName).filter(Boolean).slice(0, 6) : [],
  }));

  const toVoucher = (c: { code: string; name: string; description: string | null; endsAt: Date | null }) => ({
    code: c.code,
    name: c.name,
    description: (c.description || "").trim(),
    expiresAt: c.endsAt ? c.endsAt.toISOString() : "",
  });

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
      vouchers: activeCoupons.length,
      rewardPoints,
      affiliateCommission: affiliateAgg.affiliateCommission,
      addresses: addressCount,
    },
    addresses: addrList,
    orders,
    vouchers: {
      active: activeCoupons.map(toVoucher),
      used: usedCoupons.map(toVoucher),
      expired: expiredCoupons.map(toVoucher),
    },
    notifications: notificationsPayload,
    personalized: { wishlist: [], recentlyViewed: [], recommended: [] },
    affiliate: {
      hasProfile: affiliateActive,
      isActive: affiliateActive,
      refCode,
      referralUrl,
      totalClicks: affiliateAgg.totalClicks,
      referredOrders: affiliateAgg.referredOrders,
    },
  };
}

export default async function StoreAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; authError?: string; tab?: string; sub?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const params = (await searchParams) ?? {};
  const callbackUrl = params.callbackUrl ?? "/tai-khoan";
  const authError = params.authError ?? "";
  const initialAccountTab = typeof params.tab === "string" ? params.tab.trim() : "";
  const initialAffiliateSubTab = typeof params.sub === "string" ? params.sub.trim() : "";
  const storefrontSettings = await getStorefrontSettings();
  const accountSettings = storefrontSettings.website.customerAccountSettings;
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  const isAdmin =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "CONTENT_MANAGER" ||
    session?.user?.role === "ADMIN";
  if (!session?.user?.id) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <CustomerAuthCard callbackUrl={callbackUrl} googleEnabled={googleEnabled} authError={authError} />
        </div>
      </main>
    );
  }

  if (isAdmin) {
    redirect("/");
  }

  const dashboardData = await getCustomerDashboardData(String(session.user.id));
  const policyHubCards = await listPolicyHubCardsForAccount(dashboardData.affiliate.isActive);
  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#F8FAFC] px-4 py-5 sm:px-4 sm:py-6 lg:px-6">
      <StorefrontAccountShell>
        <CustomerAccountDashboard
          accountSettings={accountSettings}
          data={dashboardData}
          policyHubCards={policyHubCards}
          initialAccountTab={initialAccountTab}
          initialAffiliateSubTab={initialAffiliateSubTab}
          affiliateCommissionTab={storefrontSettings.website.affiliateCommissionTab}
          affiliateProgramEnabled={storefrontSettings.website.affiliateEnabled}
        />
      </StorefrontAccountShell>
    </main>
  );
}
