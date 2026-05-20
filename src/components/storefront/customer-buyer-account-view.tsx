"use client";

import Link from "next/link";
import { clampNextImageQuality } from "../../lib/next-image-quality";
import MediaImage from "../shared/media-image";
import {
  BadgeCheck,
  Camera,
  Crown,
  Gem,
  Loader2,
  Medal,
  Package,
  Sparkles,
  TicketPercent,
  Trash2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AFFILIATE_DASH_SUB_TAB_KEYS } from "../../lib/affiliate-account-dashboard-model";
import type { AffiliateSubTab } from "../../lib/affiliate-account-dashboard-model";
import type { AffiliateCommissionTabSettings } from "../../lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "../../lib/settings";
import { resolveCtvAccountTab } from "../../lib/account-tab-navigation";
import { useStorefrontAccountTabBootstrap } from "../../lib/use-storefront-account-tab-bootstrap";
import { useCustomerNotificationsPoll } from "../../lib/use-customer-notifications-poll";
import { useStorefrontSupportUnreadTotal } from "../../lib/use-storefront-support-unread-total";
import { useSupportChatStore } from "../../stores/supportChatStore";
import AccountMobileMenuDrawer, { type AccountMobileNavItem } from "./account-mobile-menu-drawer";
import {
  getDistrictsByProvince,
  getProvinces,
  getWardsByDistrict,
  normalizeAddressKeyword,
} from "../../lib/vietnam-addresses";
import type { PolicyHubCard } from "../../lib/site-policy-public";
import { PurchaseHistoryOrderThumb } from "./purchase-history-order-thumb";
import { AccountTabKeepAlive } from "./account-tab-keep-alive";
import { prefetchStorefrontAccountTabsIdle } from "../../lib/account-tab-prefetch";

const PurchaseHistoryPanel = dynamic(() => import("./purchase-history-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateProductRefActions = dynamic(() => import("./affiliate-product-ref-actions"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});

const accountTabPanelFallback = (): JSX.Element => (
  <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm" aria-hidden>
    <div className="h-4 w-1/3 max-w-[200px] animate-pulse rounded bg-slate-200" />
    <div className="mt-4 h-3 w-full max-w-xl animate-pulse rounded bg-slate-100" />
  </div>
);

const ChangePasswordForm = dynamic(() => import("../auth/change-password-form"), {
  loading: accountTabPanelFallback,
});
const AccountNotificationsSection = dynamic(
  () => import("./account-notifications-section").then((m) => ({ default: m.AccountNotificationsSection })),
  { loading: accountTabPanelFallback },
);
const AccountPolicyHubPanel = dynamic(() => import("./account-policy-hub-panel"), {
  loading: accountTabPanelFallback,
});
const AffiliateAccountDashboardTab = dynamic(
  () => import("./affiliate/affiliate-account-dashboard-tab").then((m) => ({ default: m.AffiliateAccountDashboardTab })),
  { loading: accountTabPanelFallback, ssr: false },
);

type DashboardStats = {
  totalOrders: number;
  processingOrders: number;
  vouchers: number;
  rewardPoints: number;
  affiliateCommission: number;
  addresses: number;
};

type DashboardData = {
  displayName: string;
  avatarUrl: string;
  contactText: string;
  birthDate: string;
  gender: string;
  badge: "CTV" | "VIP" | "Thành viên";
  stats: DashboardStats;
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
    linePreviews: Array<{ productName: string; quantity: number; imageUrl: string }>;
  }>;
  vouchers: {
    active: Array<{ code: string; name: string; description: string; expiresAt: string }>;
    used: Array<{ code: string; name: string; description: string; expiresAt: string }>;
    expired: Array<{ code: string; name: string; description: string; expiresAt: string }>;
  };
  notifications: {
    unread: number;
    groups: {
      order: number;
      promotion: number;
      system: number;
      commission: number;
    };
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

type TabKey =
  | "overview"
  | "orders"
  | "purchaseHistory"
  | "tracking"
  | "notifications"
  | "coupons"
  | "profile"
  | "addresses"
  | "wishlist"
  | "policyHub"
  | "affiliate"
  | "security";

type AccountNavItem =
  | { kind: "tab"; label: string; tab: TabKey; enabled: boolean }
  | { kind: "support"; label: string; enabled: boolean };

const MENU_BASE_CLASS =
  "rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#EFF6FF] lg:flex lg:h-11 lg:items-center lg:justify-between lg:rounded-2xl lg:px-4 lg:text-sm lg:font-medium lg:transition-all";

/** Mobile: full-bleed, ít khung lồng — desktop giữ nguyên qua lg:. */
const MOBILE_PANEL_FLAT =
  "max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:border-t max-lg:border-[#E2E8F0]/90 max-lg:shadow-none max-lg:bg-white max-lg:px-3 max-lg:py-3.5 max-lg:sm:px-3.5 max-lg:sm:py-4";
const MOBILE_HERO_SHELL =
  "max-lg:rounded-none max-lg:border-0 max-lg:shadow-none max-lg:bg-white max-lg:p-0 max-lg:sm:p-0";
const MOBILE_HERO_BLOCK =
  "max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-slate-200/80 max-lg:shadow-none max-lg:bg-white max-lg:p-4 max-lg:sm:p-4";
const MOBILE_PROMO_BLOCK =
  "max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-slate-200/80 max-lg:shadow-none max-lg:bg-white max-lg:p-4 max-lg:gap-3 max-lg:sm:gap-3";
const MOBILE_OVERVIEW_TILE =
  "max-lg:rounded-lg max-lg:border-0 max-lg:bg-slate-50 max-lg:p-2.5 max-lg:shadow-none max-lg:hover:bg-slate-50 max-lg:hover:shadow-none";
const TAB_PANEL_CLASS = `w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 ${MOBILE_PANEL_FLAT}`;

function mapOrderTimeline(status: string): {
  finalLabel: string;
  steps: Array<{ key: string; label: string; active: boolean; done: boolean }>;
} {
  const normalized = status.toUpperCase();
  if (normalized === "CANCELED") {
    return {
      finalLabel: "Đã hủy",
      steps: [
        { key: "placed", label: "Đã đặt hàng", active: false, done: true },
        { key: "cancelled", label: "Đã hủy", active: true, done: true },
      ],
    };
  }
  const stageMap: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PROCESSING: 1,
    SHIPPING: 2,
    DELIVERED: 3,
    COMPLETED: 3,
    REFUNDED: 3,
  };
  const stage = stageMap[normalized] ?? 0;
  const labels = ["Đã đặt hàng", "Đã xác nhận", "Đang giao", "Hoàn thành"];
  return {
    finalLabel: labels[Math.min(stage, labels.length - 1)],
    steps: labels.map((label, index) => ({
      key: `${index}-${label}`,
      label,
      active: index === stage,
      done: index <= stage,
    })),
  };
}

function normalizeOrderStatus(status: string): "pending" | "processing" | "shipping" | "completed" | "cancelled" | "unknown" {
  const normalized = status.toUpperCase();
  if (normalized === "PENDING") return "pending";
  if (normalized === "CONFIRMED" || normalized === "PROCESSING") return "processing";
  if (normalized === "SHIPPING" || normalized === "SHIPPED" || normalized === "DELIVERING") return "shipping";
  if (normalized === "DELIVERED" || normalized === "COMPLETED" || normalized === "PAID" || normalized === "REFUNDED")
    return "completed";
  if (normalized === "CANCELED" || normalized === "CANCELLED" || normalized === "FAILED") return "cancelled";
  return "unknown";
}

function getOrderStatusUi(status: string): { label: string; badgeClass: string; note: string } {
  const grouped = normalizeOrderStatus(status);
  if (grouped === "pending") {
    return {
      label: "Chờ xác nhận",
      badgeClass: "bg-amber-50 text-amber-700",
      note: "Đơn hàng đang chờ xác nhận.",
    };
  }
  if (grouped === "processing") {
    return {
      label: "Đang xử lý",
      badgeClass: "bg-blue-50 text-blue-700",
      note: "Đơn hàng đang được xử lý.",
    };
  }
  if (grouped === "shipping") {
    return {
      label: "Đang giao",
      badgeClass: "bg-sky-50 text-sky-700",
      note: "Đơn hàng đang được vận chuyển.",
    };
  }
  if (grouped === "completed") {
    return {
      label: "Giao hàng thành công",
      badgeClass: "bg-emerald-50 text-emerald-700",
      note: "Đánh giá sản phẩm để nhận ưu đãi nếu có.",
    };
  }
  if (grouped === "cancelled") {
    return {
      label: "Đã hủy",
      badgeClass: "bg-rose-50 text-rose-700",
      note: "Đơn hàng đã bị hủy.",
    };
  }
  return {
    label: "Đang cập nhật",
    badgeClass: "bg-zinc-100 text-zinc-700",
    note: "Trạng thái đơn hàng đang được cập nhật.",
  };
}

const LOYALTY_TIERS = [
  { label: "Đồng", min: 0, next: 200, Icon: Medal },
  { label: "Bạc", min: 200, next: 1000, Icon: Medal },
  { label: "Vàng", min: 1000, next: 5000, Icon: Crown },
  { label: "Kim cương", min: 5000, next: null as number | null, Icon: Gem },
] as const;

const LOYALTY_TIER_BENEFITS: readonly (readonly string[])[] = [
  ["Voucher & ưu đãi theo chương trình", "Tích điểm theo trạng thái thanh toán trên đơn (thẻ/ví ngay; COD/CK khi shop xác nhận)"],
  ["Ưu đãi riêng cho hạng Bạc", "Miễn phí ship cho đơn đủ điều kiện"],
  ["Ưu tiên hỗ trợ", "Tham gia flash sale sớm hơn"],
  ["Ưu đãi VIP", "Tích điểm & quyền lợi ưu tiên"],
] as const;

function computeLoyaltyUi(points: number): {
  tierIndex: number;
  tierLabel: string;
  progress: number;
  pointsLine: string;
  subline: string;
  showBar: boolean;
} {
  let tierIndex = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].min) {
      tierIndex = i;
      break;
    }
  }
  const t = LOYALTY_TIERS[tierIndex];
  const next = t.next;
  if (next == null) {
    return {
      tierIndex,
      tierLabel: t.label,
      progress: 1,
      pointsLine: `${points.toLocaleString("vi-VN")} điểm`,
      subline: "Bạn đang ở hạng thành viên cao nhất.",
      showBar: false,
    };
  }
  const span = next - t.min;
  const progress = span > 0 ? Math.min(1, Math.max(0, (points - t.min) / span)) : 1;
  const remain = Math.max(0, next - points);
  const nextLabel = tierIndex < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[tierIndex + 1].label : "";
  return {
    tierIndex,
    tierLabel: t.label,
    progress,
    pointsLine: `${points.toLocaleString("vi-VN")} / ${next.toLocaleString("vi-VN")} điểm`,
    subline: `Còn ${remain.toLocaleString("vi-VN")} điểm để lên ${nextLabel}`,
    showBar: true,
  };
}

const ACCOUNT_TAB_KEYS = new Set<TabKey>([
  "overview",
  "orders",
  "purchaseHistory",
  "tracking",
  "notifications",
  "coupons",
  "profile",
  "addresses",
  "wishlist",
  "policyHub",
  "affiliate",
  "security",
]);

/** Khách & CTV được phép mua (`affiliateCanBuy`): đầy đủ tab mua hàng + affiliate như cũ. */
export default function CustomerBuyerAccountView({
  accountSettings,
  data,
  policyHubCards,
  initialAccountTab,
  initialAffiliateSubTab,
  affiliateCommissionTab,
  affiliateProgramEnabled,
}: {
  accountSettings: CustomerAccountSettings;
  data: DashboardData;
  policyHubCards: PolicyHubCard[];
  initialAccountTab?: string;
  initialAffiliateSubTab?: string;
  affiliateCommissionTab: AffiliateCommissionTabSettings;
  affiliateProgramEnabled: boolean;
}): JSX.Element {
  type AddressItem = DashboardData["addresses"][number];
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightOrderCode = (searchParams.get("highlightOrder") ?? "").trim();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const isCtvAffiliate = data.affiliate.isActive;
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (isCtvAffiliate) {
      const resolved = resolveCtvAccountTab(initialAccountTab ?? "", initialAffiliateSubTab ?? "");
      return ACCOUNT_TAB_KEYS.has(resolved.tab as TabKey) ? (resolved.tab as TabKey) : "overview";
    }
    const raw = (initialAccountTab ?? "").trim();
    const fromUrl = raw === "support" ? "policyHub" : raw;
    if (fromUrl && ACCOUNT_TAB_KEYS.has(fromUrl as TabKey)) {
      return fromUrl as TabKey;
    }
    return "overview";
  });
  const [activeSubTab, setActiveSubTab] = useState<AffiliateSubTab>("overview");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [couponFilter, setCouponFilter] = useState<"active" | "used" | "expired">("active");
  const [avatarUrl, setAvatarUrl] = useState(data.avatarUrl || "");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [profileName, setProfileName] = useState(data.displayName || "");
  const [profileContact, setProfileContact] = useState(data.contactText || "");
  const [profileBirthDate, setProfileBirthDate] = useState(data.birthDate || "");
  const [profileGender, setProfileGender] = useState(data.gender || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [addressList, setAddressList] = useState<AddressItem[]>(data.addresses || []);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressEditingId, setAddressEditingId] = useState("");
  const [addressReceiverName, setAddressReceiverName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressWard, setAddressWard] = useState("");
  const [addressProvinceCode, setAddressProvinceCode] = useState("");
  const [addressDistrictCode, setAddressDistrictCode] = useState("");
  const [addressWardCode, setAddressWardCode] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressDeletingId, setAddressDeletingId] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const supportUnreadTotal = useStorefrontSupportUnreadTotal(accountSettings.showSupport);
  const [liveNotifications, notificationMutators] = useCustomerNotificationsPoll(
    data.notifications,
    accountSettings.showNotifications,
    activeTab === "notifications",
    Boolean(
      data.affiliate.isActive &&
        affiliateProgramEnabled &&
        affiliateCommissionTab.realtimeBadgeEnabled &&
        affiliateCommissionTab.tabEnabled,
    ),
  );
  const provinceOptions = getProvinces("legacy");
  const districtOptions = getDistrictsByProvince(addressProvinceCode, "legacy");
  const wardOptions = getWardsByDistrict(addressDistrictCode, addressProvinceCode, "legacy");

  const supportHref = (() => {
    const z = accountSettings.supportZaloUrl?.trim() ?? "";
    if (z) {
      try {
        const u = new URL(z);
        if (u.protocol === "http:" || u.protocol === "https:") return z;
      } catch {
        /* ignore */
      }
    }
    return "/lien-he";
  })();
  const affiliateMetricLabel = data.affiliate.isActive ? "Hoa hồng / điểm" : "Điểm tích lũy";
  const affiliateMetricValue = data.affiliate.isActive
    ? data.stats.affiliateCommission + data.stats.rewardPoints
    : data.loyalty.points;
  const shoppingHomeHref = "/";
  /** Luồng khách/CTV mua: luôn hiển thị CTA mua sắm theo UX chuẩn khách hàng. */
  const showShoppingCta = true;
  const buyerShortcutStatsOk = true;

  const showPurchaseHistoryEffective = accountSettings.showPurchaseHistory;
  const showAddressesEffective = accountSettings.showAddresses;
  const showCouponsEffective = accountSettings.showCoupons;
  const showSupportCombined =
    accountSettings.showSupport || accountSettings.showWarranty || accountSettings.showReturnRequest;
  const quickCards = [
    {
      key: "orders",
      label: "Đơn hàng của tôi",
      value: data.stats.totalOrders,
      enabled: accountSettings.showOrders && buyerShortcutStatsOk,
    },
    {
      key: "processing",
      label: "Đang xử lý",
      value: data.stats.processingOrders,
      enabled: accountSettings.showOrderTimeline && buyerShortcutStatsOk,
    },
    {
      key: "vouchers",
      label: "Kho voucher",
      value: data.stats.vouchers,
      enabled: showCouponsEffective,
    },
    {
      key: "rewards",
      label: affiliateMetricLabel,
      value: affiliateMetricValue,
      enabled: true,
    },
  ].filter((item) => item.enabled);

  const loyaltyUi = useMemo(() => computeLoyaltyUi(data.loyalty.points), [data.loyalty.points]);

  const overviewActivityLines = useMemo(() => {
    const lines: Array<{ title: string; meta: string }> = [];
    const sortedOrders = [...data.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    for (const order of sortedOrders.slice(0, 3)) {
      const ui = getOrderStatusUi(order.orderStatus);
      lines.push({
        title: `Đơn #${order.code} · ${ui.label}`,
        meta: new Date(order.createdAt).toLocaleDateString("vi-VN"),
      });
    }
    if (data.vouchers.active.length > 0) {
      lines.push({
        title: `${data.vouchers.active.length} voucher đang khả dụng trong kho của bạn`,
        meta: "Ưu đãi",
      });
    }
    for (const item of liveNotifications.items.slice(0, 2)) {
      lines.push({
        title: item.title,
        meta: new Date(item.createdAt).toLocaleDateString("vi-VN"),
      });
    }
    if (!data.affiliate.isActive) {
      lines.push({
        title: `${data.loyalty.points.toLocaleString("vi-VN")} điểm thưởng đang hiệu lực trên tài khoản`,
        meta: "Tích lũy",
      });
    }
    return lines.slice(0, 6);
  }, [data.orders, data.vouchers.active, data.loyalty.points, liveNotifications.items, data.affiliate.isActive]);

  const menuItems: AccountNavItem[] = [
    { kind: "tab", label: "Tổng quan", tab: "overview", enabled: accountSettings.showOverview },
    { kind: "tab", label: "Đơn hàng của tôi", tab: "orders", enabled: accountSettings.showOrders },
    {
      kind: "tab",
      label: accountSettings.purchaseHistoryTitle?.trim() || "Lịch sử mua hàng",
      tab: "purchaseHistory",
      enabled: showPurchaseHistoryEffective,
    },
    { kind: "tab", label: "Theo dõi đơn hàng", tab: "tracking", enabled: accountSettings.showOrderTimeline },
    { kind: "tab", label: "Thông báo", tab: "notifications", enabled: accountSettings.showNotifications },
    { kind: "tab", label: "Kho voucher", tab: "coupons", enabled: showCouponsEffective },
    { kind: "tab", label: "Thông tin cá nhân", tab: "profile", enabled: accountSettings.showProfile },
    { kind: "tab", label: "Sổ địa chỉ", tab: "addresses", enabled: showAddressesEffective },
    {
      kind: "tab",
      label: "Yêu thích / đã xem",
      tab: "wishlist",
      enabled: accountSettings.showWishlist || accountSettings.showRecentlyViewed || accountSettings.showRecommendedProducts,
    },
    { kind: "support", label: "Hỗ trợ", enabled: accountSettings.showSupport },
    { kind: "tab", label: "Tra cứu & chính sách", tab: "policyHub", enabled: true },
    { kind: "tab", label: "CTV / Affiliate", tab: "affiliate", enabled: accountSettings.showAffiliate },
    { kind: "tab", label: "Bảo mật tài khoản", tab: "security", enabled: accountSettings.showSecurity },
  ];
  const enabledMenuItems = menuItems.filter((item) => item.enabled && item.label.trim().length > 0);
  const fallbackTab =
    enabledMenuItems.find((item): item is { kind: "tab"; tab: TabKey; label: string; enabled: boolean } => item.kind === "tab")
      ?.tab ?? "overview";
  const allowedAccountTabs = useMemo(
    () =>
      enabledMenuItems
        .filter((item): item is { kind: "tab"; tab: TabKey; label: string; enabled: boolean } => item.kind === "tab")
        .map((item) => item.tab),
    [enabledMenuItems],
  );

  useEffect(() => {
    prefetchStorefrontAccountTabsIdle(allowedAccountTabs);
  }, [allowedAccountTabs]);

  const { onSelectTab: navigateAccountTab } = useStorefrontAccountTabBootstrap({
    affiliateActive: isCtvAffiliate,
    initialAccountTab,
    initialAffiliateSubTab,
    allowedTabs: allowedAccountTabs,
    accountTabKeys: ACCOUNT_TAB_KEYS,
    affiliateSubTabKeys: AFFILIATE_DASH_SUB_TAB_KEYS,
    setActiveTab,
    setActiveSubTab,
    overviewScrollTargetId: "ctv-account-card-heading",
  });

  const selectAccountTab = useCallback(
    (tab: TabKey) => {
      navigateAccountTab(tab);
      if (tab !== "affiliate") {
        setActiveSubTab("overview");
      }
    },
    [navigateAccountTab],
  );

  const orderStatusTabs = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" },
    { key: "processing", label: "Đang xử lý" },
    { key: "shipping", label: "Đang giao" },
    { key: "completed", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã hủy" },
  ];
  const filteredOrders = data.orders.filter((order) => {
    const statusGroup = normalizeOrderStatus(order.orderStatus);
    const byStatus = orderStatusFilter === "all" ? true : statusGroup === orderStatusFilter;
    const normalizedSearch = orderSearch.trim().toLowerCase();
    const bySearch = normalizedSearch
      ? order.code.toLowerCase().includes(normalizedSearch) ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        data.contactText.toLowerCase().includes(normalizedSearch) ||
        order.productNames.some((name) => name.toLowerCase().includes(normalizedSearch))
      : true;
    return byStatus && bySearch;
  });
  const selectedTrackingOrder =
    data.orders.find((order) => order.id === trackingOrderId) ?? data.orders[0] ?? null;
  const couponMap = {
    active: data.vouchers.active,
    used: data.vouchers.used,
    expired: data.vouchers.expired,
  } as const;
  const visibleCoupons = couponMap[couponFilter];
  const accountSubtitle = accountSettings.accountSubtitle || accountSettings.welcomeMessage || "Quản lý thông tin tài khoản của bạn.";
  const contactLooksLikePhone = !data.contactText.trim().includes("@");

  useEffect(() => {
    if (initialAccountTab === "supportTickets" && accountSettings.showSupport) {
      useSupportChatStore.getState().open();
    }
  }, [initialAccountTab, accountSettings.showSupport]);

  useEffect(() => {
    const tabs = enabledMenuItems.filter(
      (item): item is { kind: "tab"; label: string; tab: TabKey; enabled: boolean } => item.kind === "tab",
    );
    if (!tabs.some((item) => item.tab === activeTab)) {
      const next =
        isCtvAffiliate && tabs.some((item) => item.tab === "overview") ? ("overview" as TabKey) : fallbackTab;
      setActiveTab(next);
    }
  }, [activeTab, enabledMenuItems, fallbackTab, isCtvAffiliate]);
  useEffect(() => {
    if (activeTab !== "affiliate") {
      setActiveSubTab("overview");
    }
  }, [activeTab]);
  useEffect(() => {
    setAvatarUrl(data.avatarUrl || "");
  }, [data.avatarUrl]);
  useEffect(() => {
    setProfileName(data.displayName || "");
    setProfileContact(data.contactText || "");
    setProfileBirthDate(data.birthDate || "");
    setProfileGender(data.gender || "");
  }, [data.displayName, data.contactText, data.birthDate, data.gender]);
  useEffect(() => {
    setAddressList(data.addresses || []);
  }, [data.addresses]);

  const currentAvatar = avatarPreviewUrl || avatarUrl;

  const onPickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const onAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarMessage("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Không thể tải ảnh lên. Vui lòng thử lại.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectUrl);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "images/customers/avatars");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      const uploadPayload = (await uploadRes.json()) as { url?: string; message?: string };
      if (!uploadRes.ok || !uploadPayload.url) {
        throw new Error(uploadPayload.message || "upload_failed");
      }
      const updateRes = await fetch("/api/account/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadPayload.url }),
      });
      const updatePayload = (await updateRes.json()) as { ok?: boolean; message?: string; avatarUrl?: string };
      if (!updateRes.ok || !updatePayload.ok) {
        throw new Error(updatePayload.message || "update_failed");
      }
      setAvatarUrl(updatePayload.avatarUrl || uploadPayload.url);
      setAvatarPreviewUrl("");
      setAvatarMessage("Cập nhật ảnh đại diện thành công.");
      router.refresh();
    } catch {
      setAvatarError("Không thể tải ảnh lên. Vui lòng thử lại.");
      setAvatarPreviewUrl("");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      URL.revokeObjectURL(objectUrl);
    }
  };

  const onRemoveAvatar = async () => {
    setAvatarError("");
    setAvatarMessage("");
    setAvatarUploading(true);
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "delete_failed");
      setAvatarUrl("");
      setAvatarPreviewUrl("");
      setAvatarMessage("Cập nhật ảnh đại diện thành công.");
      router.refresh();
    } catch {
      setAvatarError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
  const isValidVnPhone = (value: string) => /^(\+84|84|0)(3|5|7|8|9)\d{8}$/.test(value);

  const resetAddressForm = () => {
    setAddressEditingId("");
    setAddressReceiverName("");
    setAddressPhone("");
    setAddressProvince("");
    setAddressDistrict("");
    setAddressWard("");
    setAddressProvinceCode("");
    setAddressDistrictCode("");
    setAddressWardCode("");
    setAddressDetail("");
    setAddressIsDefault(false);
  };

  const openCreateAddressForm = () => {
    setAddressMessage("");
    setAddressError("");
    resetAddressForm();
    setAddressOpen(true);
  };

  const openEditAddressForm = (item: AddressItem) => {
    setAddressMessage("");
    setAddressError("");
    setAddressEditingId(item.id);
    setAddressReceiverName(item.receiverName);
    setAddressPhone(item.phone);
    setAddressProvince(item.province);
    setAddressDistrict(item.district);
    setAddressWard(item.ward);
    const provinceMatch = provinceOptions.find(
      (province) => normalizeAddressKeyword(province.name) === normalizeAddressKeyword(item.province),
    );
    const matchedProvinceCode = provinceMatch?.code ?? "";
    const districtList = matchedProvinceCode ? getDistrictsByProvince(matchedProvinceCode, "legacy") : [];
    const districtMatch = districtList.find(
      (district) => normalizeAddressKeyword(district.name) === normalizeAddressKeyword(item.district),
    );
    const matchedDistrictCode = districtMatch?.code ?? "";
    const wardList =
      matchedDistrictCode && matchedProvinceCode
        ? getWardsByDistrict(matchedDistrictCode, matchedProvinceCode, "legacy")
        : [];
    const wardMatch = wardList.find(
      (ward) => normalizeAddressKeyword(ward.name) === normalizeAddressKeyword(item.ward),
    );
    setAddressProvinceCode(matchedProvinceCode);
    setAddressDistrictCode(matchedDistrictCode);
    setAddressWardCode(wardMatch?.code ?? "");
    setAddressDetail(item.detail);
    setAddressIsDefault(item.isDefault);
    setAddressOpen(true);
  };

  const validateAddressForm = (): string => {
    if (!addressReceiverName.trim()) return "Vui lòng nhập họ tên người nhận.";
    if (!isValidVnPhone(normalizePhone(addressPhone))) return "Vui lòng nhập số điện thoại hợp lệ.";
    if (!addressProvinceCode || !addressProvince.trim()) return "Vui lòng chọn Tỉnh/Thành phố.";
    if (!addressDistrictCode || !addressDistrict.trim()) return "Vui lòng chọn Quận/Huyện.";
    if (!addressWardCode || !addressWard.trim()) return "Vui lòng chọn Phường/Xã.";
    if (!addressDetail.trim()) return "Vui lòng nhập địa chỉ chi tiết.";
    return "";
  };

  const onProvinceChange = (provinceCode: string) => {
    const province = provinceOptions.find((item) => item.code === provinceCode);
    setAddressProvinceCode(provinceCode);
    setAddressProvince(province?.name ?? "");
    setAddressDistrictCode("");
    setAddressDistrict("");
    setAddressWardCode("");
    setAddressWard("");
  };

  const onDistrictChange = (districtCode: string) => {
    const district = districtOptions.find((item) => item.code === districtCode);
    setAddressDistrictCode(districtCode);
    setAddressDistrict(district?.name ?? "");
    setAddressWardCode("");
    setAddressWard("");
  };

  const onWardChange = (wardCode: string) => {
    const ward = wardOptions.find((item) => item.code === wardCode);
    setAddressWardCode(wardCode);
    setAddressWard(ward?.name ?? "");
  };

  const saveAddress = async () => {
    setAddressMessage("");
    setAddressError("");
    const validationMessage = validateAddressForm();
    if (validationMessage) {
      setAddressError(validationMessage);
      return;
    }
    setAddressSaving(true);
    try {
      const payload = {
        receiverName: addressReceiverName.trim(),
        phone: normalizePhone(addressPhone),
        province: addressProvince.trim(),
        district: addressDistrict.trim(),
        ward: addressWard.trim(),
        detail: addressDetail.trim(),
        isDefault: addressIsDefault,
      };
      const response = await fetch(
        addressEditingId ? `/api/account/addresses/${addressEditingId}` : "/api/account/addresses",
        {
          method: addressEditingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as { ok?: boolean; items?: AddressItem[]; message?: string };
      if (!response.ok || (addressEditingId ? !json.ok : !json.ok || !json.items)) {
        throw new Error(json.message || "save_address_failed");
      }
      if (addressEditingId) {
        const listRes = await fetch("/api/account/addresses");
        const listJson = (await listRes.json()) as { items?: AddressItem[] };
        if (listRes.ok && Array.isArray(listJson.items)) {
          setAddressList(listJson.items);
        }
      } else {
        setAddressList(json.items || []);
      }
      setAddressMessage("Đã lưu địa chỉ.");
      setAddressOpen(false);
      resetAddressForm();
      router.refresh();
    } catch {
      setAddressError("Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setAddressSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    const shouldDelete = window.confirm("Bạn có chắc muốn xóa địa chỉ này?");
    if (!shouldDelete) return;
    setAddressMessage("");
    setAddressError("");
    setAddressDeletingId(id);
    try {
      const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.message || "delete_address_failed");
      const listRes = await fetch("/api/account/addresses");
      const listJson = (await listRes.json()) as { items?: AddressItem[] };
      if (listRes.ok && Array.isArray(listJson.items)) setAddressList(listJson.items);
      setAddressMessage("Đã xóa địa chỉ.");
      router.refresh();
    } catch {
      setAddressError("Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setAddressDeletingId("");
    }
  };

  const setDefaultAddress = async (item: AddressItem) => {
    setAddressMessage("");
    setAddressError("");
    setAddressSaving(true);
    try {
      const response = await fetch(`/api/account/addresses/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverName: item.receiverName,
          phone: item.phone,
          province: item.province,
          district: item.district,
          ward: item.ward,
          detail: item.detail,
          isDefault: true,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.message || "set_default_failed");
      const listRes = await fetch("/api/account/addresses");
      const listJson = (await listRes.json()) as { items?: AddressItem[] };
      if (listRes.ok && Array.isArray(listJson.items)) setAddressList(listJson.items);
      setAddressMessage("Đã đặt làm địa chỉ mặc định.");
      router.refresh();
    } catch {
      setAddressError("Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setAddressSaving(false);
    }
  };

  const onSaveProfile = async () => {
    setProfileMessage("");
    setProfileError("");
    const fullName = profileName.trim();
    const contact = profileContact.trim();
    const gender = profileGender.trim();
    if (!fullName || !contact) {
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
      return;
    }
    const isEmailInput = contact.includes("@");
    if (isEmailInput && !isValidEmail(contact)) {
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
      return;
    }
    if (!isEmailInput && !isValidVnPhone(normalizePhone(contact))) {
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
      return;
    }
    if (!["", "Nam", "Nữ", "Khác"].includes(gender)) {
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
      return;
    }
    setProfileLoading(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          contact,
          birthDate: profileBirthDate,
          gender,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        profile?: { fullName: string; contact: string; birthDate: string; gender: string };
      };
      if (!response.ok || !payload.ok || !payload.profile) {
        throw new Error(payload.message || "save_failed");
      }
      setProfileName(payload.profile.fullName);
      setProfileContact(payload.profile.contact);
      setProfileBirthDate(payload.profile.birthDate || "");
      setProfileGender(payload.profile.gender || "");
      setProfileMessage("Cập nhật thông tin thành công.");
      router.refresh();
    } catch {
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setProfileLoading(false);
    }
  };

  const statCardHelpers: Record<string, string> = {
    orders: "Tổng đơn đã đặt",
    processing: "Đơn đang xử lý",
    vouchers: "Voucher khả dụng",
    rewards: "Điểm thưởng hiện tại",
  };

  const statsGridMobile =
    quickCards.length > 0 ? (
      <div
        id="tong-quan-stats"
        className="grid min-w-0 w-full grid-cols-2 gap-1.5 px-3 pb-3 lg:hidden"
        role="region"
        aria-label="Thống kê tài khoản"
      >
        {quickCards.map((card) => (
          <article
            key={card.key}
            className="rounded-lg border-0 bg-slate-50 px-2 py-1.5 shadow-none sm:rounded-xl sm:border sm:border-[#E2E8F0] sm:bg-[#F8FAFC] sm:px-2.5 sm:py-2 sm:shadow-sm"
          >
            <p className="text-[11px] font-medium leading-snug text-[#64748B] sm:text-xs">{card.label}</p>
            <p className="mt-0.5 truncate text-base font-bold tabular-nums text-[#0F172A] sm:text-lg">{card.value}</p>
          </article>
        ))}
      </div>
    ) : null;

  const statsDashboardDesktop =
    quickCards.length > 0 ? (
      <section
        className="hidden min-w-0 lg:col-start-2 lg:row-start-2 lg:mt-5 lg:block lg:w-full"
        aria-label="Thống kê tài khoản (desktop)"
      >
        <div className="grid min-w-0 grid-cols-2 gap-4 2xl:grid-cols-4">
          {quickCards.map((card) => {
            const Icon =
              card.key === "orders"
                ? Package
                : card.key === "processing"
                  ? Loader2
                  : card.key === "vouchers"
                    ? TicketPercent
                    : Sparkles;
            const displayValue =
              typeof card.value === "number" ? card.value.toLocaleString("vi-VN") : String(card.value);
            return (
              <article
                key={`desktop-stat-${card.key}`}
                className="group relative rounded-[24px] border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-[0_4px_18px_rgba(251,146,60,0.08)] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(251,146,60,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-600">{card.label}</p>
                    <p className="mt-2 text-[36px] font-black leading-none tracking-[-0.05em] text-slate-900 tabular-nums">
                      {displayValue}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{statCardHelpers[card.key] ?? ""}</p>
                  </div>
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-white/80"
                    aria-hidden
                  >
                    <Icon className="h-6 w-6 text-orange-500" strokeWidth={2} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ) : null;

  return (
    <div className="w-full min-w-0 max-w-none space-y-0 bg-transparent max-lg:pb-2 lg:mx-auto lg:max-w-[1400px] lg:space-y-0 lg:px-4 lg:pb-8 lg:pt-2">
      <AccountMobileMenuDrawer
        items={enabledMenuItems.map((item) =>
          item.kind === "support"
            ? ({ kind: "support", label: item.label } as AccountMobileNavItem)
            : ({
                kind: "tab",
                label: item.label,
                tab: item.tab,
                badgeCount: item.tab === "notifications" ? liveNotifications.unread : undefined,
                commissionBadgeCount:
                  item.tab === "notifications" &&
                  data.affiliate.isActive &&
                  affiliateProgramEnabled &&
                  affiliateCommissionTab.tabEnabled
                    ? liveNotifications.groups.commission
                    : undefined,
              } as AccountMobileNavItem),
        )}
        activeTab={activeTab}
        onSelectTab={(tab) => selectAccountTab(tab as TabKey)}
        onOpenSupport={() => useSupportChatStore.getState().open()}
        onSignOut={() => {
          signOut({ callbackUrl: "/" }).catch(() => {});
        }}
        supportUnreadTotal={supportUnreadTotal}
      />
      <section className="flex w-full min-w-0 flex-col gap-0 max-lg:gap-0 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:pt-0">
        <aside
          className={`order-2 hidden w-full min-w-0 shrink-0 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm md:block lg:order-none lg:col-start-1 lg:row-start-1 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-5rem)] lg:w-full lg:max-w-[260px] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[28px] lg:border-slate-200 lg:p-4 lg:shadow-sm ${
            activeTab === "overview" ? "lg:row-span-3" : "lg:row-span-1"
          }`}
        >
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-2">
            {enabledMenuItems.map((item) =>
              item.kind === "support" ? (
                <button
                  key="nav-support-chat"
                  type="button"
                  onClick={() => useSupportChatStore.getState().open()}
                  className={`${MENU_BASE_CLASS} min-h-10 min-w-0 basis-[calc(50%-0.25rem)] text-left lg:min-h-0 lg:basis-auto border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#EFF6FF]`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {supportUnreadTotal > 0 ? (
                    <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 ring-1 ring-rose-200/80">
                      {supportUnreadTotal > 99 ? "99+" : supportUnreadTotal}
                    </span>
                  ) : null}
                </button>
              ) : (
                <button
                  key={`${item.tab}-${item.label}`}
                  type="button"
                  onClick={() => selectAccountTab(item.tab)}
                  aria-current={activeTab === item.tab ? "page" : undefined}
                  className={`${MENU_BASE_CLASS} min-h-10 min-w-0 basis-[calc(50%-0.25rem)] text-left lg:min-h-0 lg:basis-auto ${
                    activeTab === item.tab
                      ? "!border-blue-300 !bg-blue-50 text-blue-900 font-semibold hover:!bg-blue-100"
                      : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#EFF6FF]"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.tab === "notifications" ? (
                    <span className="flex shrink-0 items-center gap-1">
                      {data.affiliate.isActive &&
                      affiliateProgramEnabled &&
                      affiliateCommissionTab.tabEnabled &&
                      liveNotifications.groups.commission > 0 ? (
                        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-600 px-[4px] text-[10px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]">
                          HH {liveNotifications.groups.commission > 99 ? "99+" : liveNotifications.groups.commission}
                        </span>
                      ) : null}
                      {liveNotifications.unread > 0 ? (
                        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-[5px] text-[11px] font-semibold tabular-nums leading-none text-white shadow-sm ring-1 ring-black/[0.08]">
                          {liveNotifications.unread > 99 ? "99+" : liveNotifications.unread}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => {
                signOut({ callbackUrl: "/" }).catch(() => {});
              }}
              className={`${MENU_BASE_CLASS} min-h-10 basis-[calc(50%-0.25rem)] text-left text-rose-600 hover:bg-rose-50 lg:min-h-0 lg:basis-auto`}
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        {activeTab === "overview" ? (
        <section
          className={`order-1 w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 ${MOBILE_HERO_SHELL} lg:order-none lg:col-start-2 lg:row-start-1 lg:relative lg:overflow-hidden lg:rounded-[36px] lg:border-slate-200/70 lg:bg-gradient-to-br lg:from-white lg:via-white lg:to-slate-50 lg:px-7 lg:py-6 lg:shadow-[0_12px_50px_rgba(15,23,42,0.06)]`}
        >
          <div
            className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_40%)] lg:block"
            aria-hidden
          />
          <div className="relative flex flex-col gap-0 max-lg:gap-0 lg:min-w-0 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_260px] lg:items-stretch lg:gap-6 lg:overflow-x-visible lg:tracking-[-0.03em] xl:grid-cols-[340px_minmax(0,1fr)_320px] xl:gap-7">
            <div className="min-w-0 w-full lg:flex lg:h-full">
              <div
                className={`relative flex min-h-0 w-full flex-col rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_28px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:p-8 ${MOBILE_HERO_BLOCK} lg:h-full lg:rounded-[30px] lg:p-8`}
              >
                <span className="absolute right-4 top-4 z-10 max-w-[calc(100%-2rem)] truncate rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] sm:right-5 sm:top-5 sm:px-3 sm:text-xs">
                  {data.badge}
                </span>

                <div className="flex justify-center pt-1 sm:pt-0">
                  <div className="relative shrink-0">
                    <div
                      className="pointer-events-none absolute -inset-4 rounded-full bg-[#2563FF]/18 blur-2xl sm:-inset-5"
                      aria-hidden
                    />
                    <div className="relative mx-auto h-[120px] w-[120px] overflow-hidden rounded-full border-[4px] border-white bg-slate-100 shadow-md sm:h-[148px] sm:w-[148px] sm:border-[5px] sm:shadow-[0_14px_44px_rgba(37,99,255,0.22)] lg:h-[176px] lg:w-[176px]">
                      {currentAvatar ? (
                        <MediaImage
                          src={currentAvatar}
                          alt={`Ảnh đại diện ${data.displayName}`}
                          width={180}
                          height={180}
                          className="h-full w-full object-cover object-center"
                          sizes="(max-width: 640px) 168px, 180px"
                          quality={clampNextImageQuality(90)}
                          fallbackLabel={data.displayName}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#EFF6FF] to-[#BFDBFE] text-4xl font-bold text-[#2563FF] sm:text-5xl">
                          {(data.displayName.trim()[0] || "Z").toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 min-w-0 space-y-3 text-left max-lg:mt-4 max-lg:space-y-2.5 sm:mt-8 sm:space-y-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2563FF] sm:text-[13px] sm:tracking-[0.14em]">
                    {accountSettings.accountTitle || "Tài khoản của tôi"}
                  </p>
                  <h2 className="truncate text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-[1.75rem] lg:text-[1.875rem]">
                    {data.displayName}
                  </h2>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-[15px] font-medium tabular-nums text-slate-600 sm:text-base">
                      {data.contactText}
                    </p>
                    {contactLooksLikePhone ? (
                      <BadgeCheck className="h-5 w-5 shrink-0 text-[#2563FF]" strokeWidth={2} aria-label="Đã xác minh" />
                    ) : null}
                  </div>
                  <p className="text-[15px] leading-[1.65] text-slate-500 sm:text-base sm:leading-relaxed">{accountSubtitle}</p>
                  {accountSettings.showProfile ? (
                    <button
                      type="button"
                      onClick={() => selectAccountTab("profile")}
                      className="text-left text-sm font-semibold text-[#2563FF] underline-offset-4 hover:underline lg:hidden"
                    >
                      Chỉnh sửa hồ sơ
                    </button>
                  ) : null}
                </div>

                <div className={`mt-8 flex min-w-0 flex-row gap-3 sm:gap-3.5 ${avatarUrl ? "" : "flex-col sm:flex-row"}`}>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic"
                    className="hidden"
                    onChange={onAvatarFileChange}
                  />
                  <button
                    type="button"
                    onClick={onPickAvatar}
                    disabled={avatarUploading}
                    className={`inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#2563FF]/35 bg-white px-3 text-sm font-semibold text-[#2563FF] shadow-sm transition-colors hover:border-[#2563FF]/55 hover:bg-[#2563FF]/[0.04] disabled:pointer-events-none disabled:opacity-50 sm:px-4 ${avatarUrl ? "min-w-0 flex-1" : "w-full sm:w-auto sm:flex-1"}`}
                  >
                    <Camera className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
                    <span className="truncate">{avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}</span>
                  </button>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={onRemoveAvatar}
                      disabled={avatarUploading}
                      className="inline-flex h-12 min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-rose-200/90 bg-white px-3 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50/80 disabled:pointer-events-none disabled:opacity-50 sm:px-4"
                    >
                      <Trash2 className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
                      <span className="truncate">Xóa ảnh</span>
                    </button>
                  ) : null}
                </div>
                {avatarUploading ? <p className="mt-3 text-sm text-slate-500">Đang tải ảnh...</p> : null}
                {avatarMessage ? <p className="mt-3 text-sm text-emerald-700">{avatarMessage}</p> : null}
                {avatarError ? <p className="mt-3 text-sm text-rose-700">{avatarError}</p> : null}
              </div>
            </div>

            {!data.affiliate.isActive ? (
            <div className="hidden min-h-0 min-w-0 w-full lg:flex lg:h-full">
              <div className="relative flex h-full min-h-0 w-full flex-col gap-5 rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_28px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:gap-6 sm:p-8 lg:rounded-[30px] lg:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2563FF] sm:text-[13px] sm:tracking-[0.14em]">
                Rank thành viên
              </p>
              <p className="text-lg font-black tracking-[-0.03em] text-slate-900">Thành viên {loyaltyUi.tierLabel}</p>
              <p className="text-sm font-medium tabular-nums tracking-[-0.02em] text-slate-600">{loyaltyUi.pointsLine}</p>
              <p className="text-xs leading-relaxed text-slate-500">{loyaltyUi.subline}</p>
              <div className="flex justify-between gap-1.5">
                {LOYALTY_TIERS.map((tier, i) => {
                  const TierIcon = tier.Icon;
                  const active = i === loyaltyUi.tierIndex;
                  const passed = i < loyaltyUi.tierIndex;
                  return (
                    <div key={tier.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border sm:h-10 sm:w-10 sm:rounded-2xl ${
                          active
                            ? "border-[#2563EB] bg-blue-50 text-[#2563EB] shadow-sm"
                            : passed
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-slate-200 bg-white text-slate-300"
                        }`}
                      >
                        <TierIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
                      </div>
                      <span
                        className={`text-center text-[10px] font-semibold leading-tight ${active ? "text-[#2563EB]" : "text-slate-500"}`}
                      >
                        {tier.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {loyaltyUi.showBar ? (
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-sky-400 transition-all duration-500 ease-out"
                    style={{ width: `${Math.round(loyaltyUi.progress * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 transition-all duration-500 ease-out" />
                </div>
              )}
              <ul className="space-y-2.5 text-sm leading-relaxed text-slate-600">
                {(LOYALTY_TIER_BENEFITS[loyaltyUi.tierIndex] ?? LOYALTY_TIER_BENEFITS[0]).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Hoạt động điểm thưởng</p>
                <ul className="mt-3 max-h-48 space-y-2.5 overflow-y-auto pr-1 text-sm text-slate-600">
                  {data.loyalty.transactions.length === 0 ? (
                    <li className="text-xs text-slate-400">
                      Chưa có giao dịch điểm. Với thẻ/ví: điểm cộng sau khi đặt hàng thành công. Với COD hoặc chuyển khoản: khi cửa hàng xác nhận đã thanh toán trên đơn. Hủy đơn hoặc hoàn tiền sẽ điều chỉnh điểm tương ứng.
                    </li>
                  ) : (
                    data.loyalty.transactions.map((tx) => (
                      <li key={tx.id} className="flex gap-2 border-b border-slate-50 pb-2 last:border-0">
                        <span
                          className={`shrink-0 tabular-nums font-semibold ${tx.points >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {tx.points >= 0 ? "+" : ""}
                          {tx.points.toLocaleString("vi-VN")}
                        </span>
                        <span className="min-w-0 flex-1 leading-snug text-slate-600">{tx.description}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              </div>
            </div>
            ) : null}

            <div className="w-full lg:col-span-3 lg:hidden">{statsGridMobile}</div>

            <div className="min-w-0 w-full lg:flex lg:h-full">
            <div
              className={`flex min-h-0 w-full min-w-0 flex-col gap-4 rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_28px_rgba(15,23,42,0.07)] sm:gap-5 sm:rounded-[28px] sm:p-8 ${MOBILE_PROMO_BLOCK} lg:h-full lg:min-h-0 lg:rounded-[30px] lg:p-8`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563FF]/90">Ưu đãi dành riêng cho bạn</p>
              <p className="text-base font-bold leading-snug tracking-[-0.02em] text-[#0F172A] sm:text-lg">
                {data.vouchers.active[0]?.name?.trim()
                  ? data.vouchers.active[0].name.length > 44
                    ? `${data.vouchers.active[0].name.slice(0, 44)}…`
                    : data.vouchers.active[0].name
                  : "GIẢM 15% ĐƠN TIẾP THEO"}
              </p>
              <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                {data.vouchers.active[0]
                  ? "Áp dụng kèm mã — đơn hàng tiếp theo của bạn."
                  : "Đơn hàng tiếp theo tại Zendo.vn — theo điều kiện chương trình đang hiển thị."}
              </p>
              <div className="rounded-lg border-0 bg-slate-100 px-2.5 py-2 max-lg:shadow-none sm:rounded-xl sm:border sm:border-slate-200 sm:bg-slate-50 sm:px-3 sm:py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mã gợi ý</p>
                <p className="font-mono text-sm font-bold tracking-wide text-[#0F172A] sm:text-base">
                  {data.vouchers.active[0]?.code ?? "ZENDOVIP15"}
                </p>
              </div>
              <div className="mt-auto flex min-w-0 flex-col gap-3 pt-1">
              <Link
                href={accountSettings.orderLookupUrl || "/tra-cuu-don-hang"}
                className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Theo dõi đơn hàng
              </Link>
              {showShoppingCta ? (
                <Link
                  href={shoppingHomeHref}
                  className="inline-flex h-10 min-h-10 w-full shrink-0 items-center justify-center rounded-xl bg-[#F59E0B] px-4 text-sm font-semibold text-white hover:bg-[#D97706]"
                >
                  {accountSettings.shoppingCtaText || "Tiếp tục mua sắm"}
                </Link>
              ) : null}
              {accountSettings.showProfile ? (
                <button
                  type="button"
                  onClick={() => selectAccountTab("profile")}
                  className="hidden h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2563EB] shadow-sm hover:bg-slate-50 lg:inline-flex"
                >
                  Chỉnh sửa hồ sơ
                </button>
              ) : null}
              </div>
            </div>
            </div>
          </div>
        </section>
        ) : null}

        {activeTab === "overview" ? statsDashboardDesktop : null}

        <div
          className={`order-3 min-w-0 w-full max-w-none space-y-0 max-lg:space-y-0 lg:order-none lg:col-start-2 lg:space-y-5 ${
            activeTab === "overview" ? "lg:row-start-3" : "lg:row-start-1"
          }`}
        >
          {activeTab === "overview" ? (
            <section
              className={`w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 ${MOBILE_PANEL_FLAT} lg:rounded-[32px] lg:border-slate-200/90 lg:p-7 lg:shadow-[0_8px_30px_rgba(15,23,42,0.04)]`}
            >
              <h3 className="text-base font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-2xl lg:font-black lg:leading-tight lg:tracking-[-0.03em]">
                Tổng quan tài khoản
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-2 max-lg:gap-2 lg:mt-5 lg:grid-cols-2 lg:gap-5">
                {buyerShortcutStatsOk ? (
                  <article className={`rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all ${MOBILE_OVERVIEW_TILE} lg:rounded-[26px] lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-6 lg:hover:bg-white lg:hover:shadow-sm`}>
                    <p className="text-sm font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-base lg:font-bold lg:tracking-[-0.03em]">
                      Đơn gần đây
                    </p>
                    {data.orders.length ? (
                      <div className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-3">
                        {data.orders.slice(0, 2).map((order) => (
                          <p key={order.id} className="text-sm leading-snug tracking-[-0.02em] text-[#64748B]">
                            #{order.code} • {new Intl.NumberFormat("vi-VN").format(order.totalAmount)}đ
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-[#64748B]">Bạn chưa có đơn hàng nào.</p>
                        {showShoppingCta ? (
                          <Link
                            href={shoppingHomeHref}
                            className="mt-2 inline-flex h-9 items-center rounded-lg bg-[#F59E0B] px-3 text-xs font-semibold text-white hover:bg-[#D97706]"
                          >
                            Mua sắm ngay
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </article>
                ) : null}
                <article className={`rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all ${MOBILE_OVERVIEW_TILE} lg:rounded-[26px] lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-6 lg:hover:bg-white lg:hover:shadow-sm`}>
                  <p className="text-sm font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-base lg:font-bold lg:tracking-[-0.03em]">
                    Thông báo mới
                  </p>
                  <div className="mt-2 space-y-1 text-sm leading-tight tracking-[-0.02em] text-[#64748B] lg:mt-3 lg:space-y-3 lg:leading-snug">
                    <p>Đơn hàng: {liveNotifications.groups.order}</p>
                    <p>Hoa hồng: {liveNotifications.groups.commission}</p>
                    <p>Khuyến mãi: {liveNotifications.groups.promotion}</p>
                    <p>Hệ thống: {liveNotifications.groups.system}</p>
                  </div>
                </article>
                {showCouponsEffective ? (
                  <article className={`rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all ${MOBILE_OVERVIEW_TILE} lg:rounded-[26px] lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-6 lg:hover:bg-white lg:hover:shadow-sm`}>
                    <p className="text-sm font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-base lg:font-bold lg:tracking-[-0.03em]">
                      Voucher nổi bật
                    </p>
                    {data.vouchers.active.slice(0, 2).length ? (
                      <div className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-3">
                        {data.vouchers.active.slice(0, 2).map((voucher) => (
                          <p key={voucher.code} className="text-sm leading-snug tracking-[-0.02em] text-[#64748B]">
                            {voucher.name} • {voucher.code}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[#64748B]">Chưa có voucher còn hạn.</p>
                    )}
                  </article>
                ) : null}
                {showSupportCombined ? (
                  <article className="hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all lg:block lg:rounded-[26px] lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-6 lg:hover:bg-white lg:hover:shadow-sm">
                    <p className="text-sm font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-base lg:font-bold lg:tracking-[-0.03em]">
                      Hỗ trợ nhanh
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 lg:mt-3">
                      {accountSettings.orderLookupUrl ? (
                        <Link href={accountSettings.orderLookupUrl} className="rounded-lg bg-white px-2.5 py-1 text-xs text-[#0F172A]">
                          Tra cứu đơn
                        </Link>
                      ) : null}
                      {supportHref.startsWith("http") ? (
                        <Link
                          href={supportHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-white px-2.5 py-1 text-xs text-[#0F172A]"
                        >
                          Zalo
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ) : null}
                <article className="hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all lg:col-span-2 lg:block lg:rounded-[26px] lg:border-slate-200/90 lg:bg-slate-50/60 lg:p-6 lg:hover:bg-white lg:hover:shadow-sm">
                  <p className="text-sm font-semibold leading-tight tracking-[-0.02em] text-[#0F172A] lg:text-base lg:font-bold lg:tracking-[-0.03em]">
                    Hoạt động gần đây
                  </p>
                  <div className="mt-2 space-y-2 lg:mt-3 lg:space-y-3">
                    {overviewActivityLines.length ? (
                      overviewActivityLines.map((line, i) => (
                        <div
                          key={`${line.title}-${i}`}
                          className="flex items-start justify-between gap-3 rounded-xl border border-transparent bg-white/0 px-0 py-1 lg:rounded-2xl lg:border-slate-200/60 lg:bg-white/70 lg:px-3 lg:py-2"
                        >
                          <p className="min-w-0 flex-1 text-sm font-medium leading-snug tracking-[-0.02em] text-slate-700">{line.title}</p>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">{line.meta}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-relaxed text-[#64748B]">
                        Các hoạt động đơn hàng, ưu đãi và thông báo sẽ hiển thị tại đây.
                      </p>
                    )}
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {accountSettings.showOrders ? (
            <AccountTabKeepAlive tabKey="orders" activeTab={activeTab}>
            <section id="don-hang" className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-lg font-semibold text-[#0F172A]">Đơn hàng của tôi</h3>
              <div className="mt-3 overflow-x-auto border-b border-[#E2E8F0] pb-2">
                <div className="flex min-w-max gap-3">
                {orderStatusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.key)}
                    className={`border-b-2 px-1.5 py-1 text-sm font-medium ${
                      orderStatusFilter === tab.key
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                </div>
              </div>
              <div className="mt-3">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
                  <span className="text-[#64748B]">🔎</span>
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Tìm theo mã đơn hàng hoặc tên sản phẩm"
                    className="h-full w-full bg-transparent text-sm text-[#0F172A] outline-none"
                  />
                </label>
              </div>
              {filteredOrders.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {filteredOrders.map((order) => {
                    const statusUi = getOrderStatusUi(order.orderStatus);
                    const isExpanded = expandedOrderIds.includes(order.id);
                    const hasReturnAction =
                      accountSettings.showReturnRequest &&
                      (normalizeOrderStatus(order.orderStatus) === "completed");
                    return (
                      <article key={order.id} className="rounded-xl border border-[#E2E8F0] bg-white p-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">Mã đơn: #{order.code || order.id.slice(-8)}</p>
                            <p className="mt-0.5 text-xs text-[#64748B]">Ngày đặt: {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusUi.badgeClass}`}>
                            {statusUi.label}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(order.linePreviews.length > 0
                            ? order.linePreviews
                            : order.productNames.map((name) => ({
                                productName: name,
                                quantity: 1,
                                imageUrl: "",
                              }))
                          ).slice(0, 2).map((line, lineIdx) => (
                            <div key={`${order.id}-line-${lineIdx}`} className="flex items-center gap-3">
                              <PurchaseHistoryOrderThumb
                                imageUrl={line.imageUrl}
                                productName={line.productName}
                              />
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm text-[#0F172A]">{line.productName}</p>
                                <p className="text-xs text-[#64748B]">x{line.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {order.itemCount > 2 ? <p className="text-xs text-[#64748B]">+{order.itemCount - 2} sản phẩm khác</p> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-[#64748B]">{statusUi.note}</p>
                          <p className="text-sm font-semibold text-[#0F172A] sm:text-lg">Thành tiền: {new Intl.NumberFormat("vi-VN").format(order.totalAmount)}đ</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderIds((prev) =>
                                prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id],
                              )
                            }
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                          >
                            Xem chi tiết
                          </button>
                          {showShoppingCta ? (
                            <Link href={order.productNames[0] ? accountSettings.continueShoppingUrl || "/cua-hang" : "/"} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]">
                              Mua lại
                            </Link>
                          ) : null}
                          <Link href={supportHref} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]">
                            Liên hệ hỗ trợ
                          </Link>
                          {hasReturnAction ? (
                            <Link
                              href={accountSettings.returnPolicyUrl || "#ho-tro"}
                              className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                            >
                              Yêu cầu đổi trả/hoàn tiền
                            </Link>
                          ) : null}
                        </div>
                        {isExpanded ? (
                          <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#64748B]">
                            <p>Mã đơn đầy đủ: {order.id}</p>
                            <p>Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                            <p>Trạng thái thanh toán: {order.paymentStatus || "Đang cập nhật"}</p>
                            <p className="mt-1">Sản phẩm: {order.productNames.join(", ") || "Đang cập nhật"}</p>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                  {data.orders.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-[#0F172A]">Bạn chưa có đơn hàng nào.</p>
                      <p className="mt-1 text-sm text-[#64748B]">Các đơn hàng bạn đặt tại Zendo.vn sẽ hiển thị tại đây.</p>
                      {showShoppingCta ? (
                        <Link
                          href={shoppingHomeHref}
                          className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                        >
                          Mua sắm ngay
                        </Link>
                      ) : null}
                    </>
                  ) : orderSearch.trim() ? (
                    <>
                      <p className="text-sm font-semibold text-[#0F172A]">Không tìm thấy đơn hàng phù hợp.</p>
                      <p className="mt-1 text-sm text-[#64748B]">Vui lòng thử mã đơn hoặc tên sản phẩm khác.</p>
                      <button
                        type="button"
                        onClick={() => setOrderSearch("")}
                        className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                      >
                        Xóa tìm kiếm
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#0F172A]">Không có đơn hàng ở trạng thái này.</p>
                      <p className="mt-1 text-sm text-[#64748B]">Bạn có thể chuyển sang tab khác hoặc tiếp tục mua sắm.</p>
                      <button
                        type="button"
                        onClick={() => setOrderStatusFilter("all")}
                        className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                      >
                        Xem tất cả đơn
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
            </AccountTabKeepAlive>
          ) : null}

          {showPurchaseHistoryEffective ? (
            <AccountTabKeepAlive tabKey="purchaseHistory" activeTab={activeTab}>
            <PurchaseHistoryPanel settings={accountSettings} supportHref={supportHref} />
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showOrderTimeline ? (
            <AccountTabKeepAlive tabKey="tracking" activeTab={activeTab}>
            <section className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-base font-semibold text-[#0F172A]">Theo dõi đơn hàng</h3>
              {selectedTrackingOrder ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {data.orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setTrackingOrderId(order.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs ${
                          selectedTrackingOrder.id === order.id
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                            : "border-[#E2E8F0] bg-white text-[#0F172A]"
                        }`}
                      >
                        #{order.code}
                      </button>
                    ))}
                  </div>
                  <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">#{selectedTrackingOrder.code}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#2563EB]">
                        {mapOrderTimeline(selectedTrackingOrder.orderStatus).finalLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {mapOrderTimeline(selectedTrackingOrder.orderStatus).steps.map((step) => (
                        <span
                          key={step.key}
                          className={`rounded-full px-2 py-1 text-[11px] ${
                            step.active
                              ? "bg-[#DBEAFE] text-[#1D4ED8]"
                              : step.done
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-white text-[#64748B]"
                          }`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#64748B]">{accountSettings.emptyOrderText || "Bạn chưa có đơn hàng nào."}</p>
              )}
            </section>
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showNotifications ? (
            <AccountTabKeepAlive tabKey="notifications" activeTab={activeTab}>
            <AccountNotificationsSection
              title={accountSettings.notificationTitle || "Thông báo tài khoản"}
              notifications={liveNotifications}
              notificationMutators={notificationMutators}
              commissionTab={affiliateCommissionTab}
              affiliateProgramEnabled={affiliateProgramEnabled}
              isAffiliateActive={data.affiliate.isActive}
            />
            </AccountTabKeepAlive>
          ) : null}

          {showCouponsEffective ? (
            <AccountTabKeepAlive tabKey="coupons" activeTab={activeTab}>
            <section id="voucher" className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-base font-semibold text-[#0F172A]">{accountSettings.couponTitle || "Kho voucher"}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setCouponFilter("active")} className={`rounded-full px-3 py-1 text-xs ${couponFilter === "active" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}>
                  Còn hạn
                </button>
                <button type="button" onClick={() => setCouponFilter("used")} className={`rounded-full px-3 py-1 text-xs ${couponFilter === "used" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}>
                  Đã dùng
                </button>
                <button type="button" onClick={() => setCouponFilter("expired")} className={`rounded-full px-3 py-1 text-xs ${couponFilter === "expired" ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A]"}`}>
                  Hết hạn
                </button>
              </div>
              {visibleCoupons.length ? (
                <div className="mt-3 space-y-3">
                  {visibleCoupons.slice(0, 5).map((voucher) => (
                    <div key={`${couponFilter}-${voucher.code}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0F172A]">{voucher.name}</p>
                        <p className="text-xs text-[#64748B]">{voucher.description || "Ưu đãi dành cho bạn"}</p>
                        <p className="mt-1 text-xs text-[#64748B]">Mã: {voucher.code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(voucher.code).catch(() => {})}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                      >
                        Sao chép mã
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#64748B]">Bạn chưa có voucher nào.</p>
              )}
              {showShoppingCta ? (
                <div className="mt-3">
                  <Link
                    href={shoppingHomeHref}
                    className="inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                  >
                    Mua sắm ngay
                  </Link>
                </div>
              ) : null}
            </section>
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showProfile ? (
            <AccountTabKeepAlive tabKey="profile" activeTab={activeTab}>
            <section id="thong-tin-ca-nhan" className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-base font-semibold text-[#0F172A]">Thông tin cá nhân</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Họ tên</span>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Email / Số điện thoại</span>
                  <input
                    value={profileContact}
                    onChange={(event) => setProfileContact(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Ngày sinh</span>
                  <input
                    type="date"
                    value={profileBirthDate}
                    onChange={(event) => setProfileBirthDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Giới tính</span>
                  <select
                    value={profileGender}
                    onChange={(event) => setProfileGender(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Chưa chọn</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={onSaveProfile}
                disabled={profileLoading}
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {profileLoading ? "Đang lưu..." : "Lưu thông tin"}
              </button>
              {profileMessage ? <p className="mt-2 text-sm text-emerald-700">{profileMessage}</p> : null}
              {profileError ? <p className="mt-2 text-sm text-rose-700">{profileError}</p> : null}
            </section>
            </AccountTabKeepAlive>
          ) : null}

          {showAddressesEffective ? (
            <AccountTabKeepAlive tabKey="addresses" activeTab={activeTab}>
            <section id="so-dia-chi" className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-base font-semibold text-[#0F172A]">Sổ địa chỉ</h3>
              <p className="mt-2 text-sm text-[#64748B]">Quản lý địa chỉ nhận hàng để đặt hàng nhanh hơn.</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={openCreateAddressForm}
                  className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Thêm địa chỉ
                </button>
              </div>
              {addressMessage ? <p className="mt-2 text-sm text-emerald-700">{addressMessage}</p> : null}
              {addressError ? <p className="mt-2 text-sm text-rose-700">{addressError}</p> : null}

              {addressOpen ? (
                <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Họ tên người nhận</span>
                      <input
                        value={addressReceiverName}
                        onChange={(event) => setAddressReceiverName(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Số điện thoại</span>
                      <input
                        value={addressPhone}
                        onChange={(event) => setAddressPhone(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Tỉnh/Thành phố</span>
                      <select
                        value={addressProvinceCode}
                        onChange={(event) => onProvinceChange(event.target.value)}
                        className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#2563EB]"
                      >
                        <option value="">Chọn Tỉnh/Thành phố</option>
                        {provinceOptions.map((province) => (
                          <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Quận/Huyện</span>
                      <select
                        value={addressDistrictCode}
                        onChange={(event) => onDistrictChange(event.target.value)}
                        disabled={!addressProvinceCode}
                        className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#2563EB] disabled:bg-[#F1F5F9]"
                      >
                        <option value="">Chọn Quận/Huyện</option>
                        {districtOptions.map((district) => (
                          <option key={district.code} value={district.code}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Phường/Xã</span>
                      <select
                        value={addressWardCode}
                        onChange={(event) => onWardChange(event.target.value)}
                        disabled={!addressDistrictCode}
                        className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#2563EB] disabled:bg-[#F1F5F9]"
                      >
                        <option value="">Chọn Phường/Xã</option>
                        {wardOptions.map((ward) => (
                          <option key={ward.code} value={ward.code}>
                            {ward.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!addressProvinceCode && addressProvince ? (
                      <p className="text-xs text-[#B45309] md:col-span-2">
                        Địa chỉ cũ chưa map được theo danh mục 63 tỉnh, vui lòng chọn lại Tỉnh/Quận/Xã.
                      </p>
                    ) : null}
                    {!addressDistrictCode && addressDistrict && addressProvinceCode ? (
                      <p className="text-xs text-[#B45309] md:col-span-2">
                        Quận/Huyện cũ chưa khớp, vui lòng chọn lại.
                      </p>
                    ) : null}
                    {!addressWardCode && addressWard && addressDistrictCode ? (
                      <p className="text-xs text-[#B45309] md:col-span-2">
                        Phường/Xã cũ chưa khớp, vui lòng chọn lại.
                      </p>
                    ) : null}
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs text-[#64748B]">Địa chỉ chi tiết</span>
                      <input
                        value={addressDetail}
                        onChange={(event) => setAddressDetail(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                  </div>
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#334155]">
                    <input
                      type="checkbox"
                      checked={addressIsDefault}
                      onChange={(event) => setAddressIsDefault(event.target.checked)}
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveAddress}
                      disabled={addressSaving}
                      className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                    >
                      {addressSaving ? "Đang lưu..." : "Lưu địa chỉ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressOpen(false);
                        resetAddressForm();
                      }}
                      className="inline-flex h-10 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : null}

              {addressList.length ? (
                <div className="mt-4 space-y-3">
                  {addressList.map((item) => (
                    <article key={item.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#0F172A]">{item.receiverName}</p>
                        {item.isDefault ? (
                          <span className="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#475569]">{item.phone}</p>
                      <p className="mt-1 text-sm text-[#475569] break-words">
                        {item.province}, {item.district}, {item.ward}
                      </p>
                      <p className="mt-1 text-sm text-[#475569] break-words">{item.detail}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditAddressForm(item)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          disabled={addressDeletingId === item.id}
                          onClick={() => deleteAddress(item.id)}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-rose-600 disabled:opacity-60"
                        >
                          {addressDeletingId === item.id ? "Đang xóa..." : "Xóa"}
                        </button>
                        {!item.isDefault ? (
                          <button
                            type="button"
                            disabled={addressSaving}
                            onClick={() => setDefaultAddress(item)}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] disabled:opacity-60"
                          >
                            Đặt mặc định
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">Bạn chưa có địa chỉ nhận hàng nào.</p>
                  <button
                    type="button"
                    onClick={openCreateAddressForm}
                    className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                  >
                    Thêm địa chỉ
                  </button>
                </div>
              )}
            </section>
            </AccountTabKeepAlive>
          ) : null}

          {(accountSettings.showWishlist || accountSettings.showRecentlyViewed || accountSettings.showRecommendedProducts) ? (
            <AccountTabKeepAlive tabKey="wishlist" activeTab={activeTab}>
            <section id="yeu-thich" className={TAB_PANEL_CLASS}>
              <h3 className="text-base font-semibold text-[#0F172A]">Yêu thích / đã xem</h3>
              <div className="mt-2 space-y-2 text-sm text-[#64748B]">
                {accountSettings.showWishlist ? (
                  <p>
                    Sản phẩm yêu thích:{" "}
                    {data.personalized.wishlist.length ? `${data.personalized.wishlist.length} sản phẩm` : "Bạn chưa có sản phẩm yêu thích."}
                  </p>
                ) : null}
                {accountSettings.showRecentlyViewed ? (
                  <p>
                    Sản phẩm đã xem:{" "}
                    {data.personalized.recentlyViewed.length
                      ? `${data.personalized.recentlyViewed.length} sản phẩm`
                      : "Bạn chưa có sản phẩm đã xem gần đây."}
                  </p>
                ) : null}
                {accountSettings.showRecommendedProducts ? (
                  <div>
                    <p className="mb-1">Gợi ý mua lại:</p>
                    {data.personalized.recommended.length ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {data.personalized.recommended.slice(0, 4).map((item) => (
                          <article
                            key={item.id}
                            className="min-w-0 max-w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                          >
                            <Link
                              href={`/san-pham/${item.slug}`}
                              className="block text-xs font-semibold text-[#0F172A] hover:text-[#2563EB]"
                            >
                              {item.name}
                            </Link>
                            {data.affiliate.isActive && data.affiliate.refCode ? (
                              <div className="mt-2 min-w-0">
                                <AffiliateProductRefActions slug={item.slug} refCode={data.affiliate.refCode} layout="stack" />
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>Chưa có gợi ý mua lại từ đơn cũ.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
            </AccountTabKeepAlive>
          ) : null}

          <AccountTabKeepAlive tabKey="policyHub" activeTab={activeTab}>
            <AccountPolicyHubPanel
              orderLookupHref={accountSettings.orderLookupUrl?.trim() || "/tra-cuu-don-hang"}
              policyCards={policyHubCards}
              showLegacyWarranty={Boolean(accountSettings.showWarranty && accountSettings.warrantyPolicyUrl?.trim())}
              legacyWarrantyHref={accountSettings.warrantyPolicyUrl ?? undefined}
              showLegacyReturn={Boolean(accountSettings.showReturnRequest && accountSettings.returnPolicyUrl?.trim())}
              legacyReturnHref={accountSettings.returnPolicyUrl ?? undefined}
              zaloHref={supportHref.startsWith("http") ? supportHref : null}
            />
          </AccountTabKeepAlive>

          {accountSettings.showAffiliate ? (
            <AccountTabKeepAlive tabKey="affiliate" activeTab={activeTab}>
            <AffiliateAccountDashboardTab
              accountSettings={accountSettings}
              data={data}
              supportHref={supportHref}
              shoppingHomeHref={shoppingHomeHref}
              highlightOrderCode={highlightOrderCode}
              activeSubTab={activeSubTab}
              onSelectSubTab={setActiveSubTab}
              panelClassName={TAB_PANEL_CLASS}
              showGrowthToolkit
            />
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showSecurity ? (
            <AccountTabKeepAlive tabKey="security" activeTab={activeTab}>
            <section id="bao-mat" className={`${TAB_PANEL_CLASS} lg:p-6`}>
              <h3 className="text-base font-semibold text-[#0F172A]">Bảo mật tài khoản</h3>
              <p className="mt-2 text-sm text-[#64748B]">Quản lý mật khẩu và phiên đăng nhập của bạn.</p>
              <div className="mt-3 max-w-3xl space-y-3">
                <ChangePasswordForm />
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" }).catch(() => {})}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  Đăng xuất
                </button>
              </div>
            </section>
            </AccountTabKeepAlive>
          ) : null}
        </div>
      </section>
    </div>
  );
}
