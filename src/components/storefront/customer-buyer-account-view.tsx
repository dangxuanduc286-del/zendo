"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ChangePasswordForm from "../auth/change-password-form";
import { useAffiliateDashboardApi } from "./use-affiliate-dashboard-api";
import type { AffiliateCommissionTabSettings } from "../../lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "../../lib/settings";
import { getDefaultAccountTab } from "../../lib/account-role";
import { useCustomerNotificationsPoll } from "../../lib/use-customer-notifications-poll";
import { useStorefrontSupportUnreadTotal } from "../../lib/use-storefront-support-unread-total";
import { useSupportChatStore } from "../../stores/supportChatStore";
import AccountMobileMenuDrawer, { type AccountMobileNavItem } from "./account-mobile-menu-drawer";
import { AccountNotificationsSection } from "./account-notifications-section";
import AccountPolicyHubPanel from "./account-policy-hub-panel";
import {
  getDistrictsByProvince,
  getProvinces,
  getWardsByDistrict,
  normalizeAddressKeyword,
} from "../../lib/vietnam-addresses";
import type { PolicyHubCard } from "../../lib/site-policy-public";

const PurchaseHistoryPanel = dynamic(() => import("./purchase-history-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateLinkBuilder = dynamic(() => import("./affiliate-link-builder"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateProductRefActions = dynamic(() => import("./affiliate-product-ref-actions"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateEarningsPanel = dynamic(() => import("./affiliate-earnings-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateOrdersPanel = dynamic(() => import("./affiliate-orders-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateWithdrawalPanel = dynamic(() => import("./affiliate-withdrawal-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliatePayoutAccountPanel = dynamic(() => import("./affiliate-payout-account-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateGuidePanel = dynamic(() => import("./affiliate-guide-panel"), {
  loading: () => <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});

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
  "rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#EFF6FF]";

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

function isPublicOrigin(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return !text.includes("localhost") && !text.includes("127.0.0.1");
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

const AFFILIATE_DASH_SUB_TABS = new Set<string>([
  "overview",
  "orders",
  "earnings",
  "withdrawal",
  "links",
  "guide",
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
  type AffiliateSubTab = "overview" | "orders" | "earnings" | "withdrawal" | "links" | "guide";
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    return getDefaultAccountTab({ affiliateActive: data.affiliate.isActive }, accountSettings) === "affiliate"
      ? "affiliate"
      : "overview";
  });
  const [activeSubTab, setActiveSubTab] = useState<AffiliateSubTab>("overview");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [couponFilter, setCouponFilter] = useState<"active" | "used" | "expired">("active");
  const [affiliateCopied, setAffiliateCopied] = useState(false);
  const [affiliateCopyError, setAffiliateCopyError] = useState("");
  const [payoutAccount, setPayoutAccount] = useState<null | {
    id: string;
    bankName: string;
    bankAccountNumberMasked: string;
    bankAccountHolder: string;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason?: string;
    verifiedAt?: string | null;
    changeRequests?: Array<{
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      requestedAt: string;
      reviewedAt: string | null;
      rejectionReason: string;
      requestedBankName: string;
      requestedBankAccountNumberMasked: string;
      requestedBankAccountHolder: string;
    }>;
  }>(null);
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
  const liveNotifications = useCustomerNotificationsPoll(
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
    : data.stats.rewardPoints;
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
  const runtimeOrigin =
    typeof window !== "undefined" && isPublicOrigin(window.location.origin)
      ? window.location.origin
      : "";
  const referralBaseOrigin = (() => {
    if (isPublicOrigin(data.affiliate.referralUrl)) {
      try {
        return new URL(data.affiliate.referralUrl).origin;
      } catch {
        return "";
      }
    }
    if (runtimeOrigin) return runtimeOrigin;
    return "https://www.zendo.vn";
  })();
  const referralUrl = data.affiliate.refCode
    ? `${referralBaseOrigin}/?ref=${encodeURIComponent(data.affiliate.refCode)}`
    : "";
  const affDash = useAffiliateDashboardApi(Boolean(data.affiliate.hasProfile));
  const s = affDash.data?.summary;
  const approvedCommission = s?.commissionApprovedPool ?? data.stats.affiliateCommission;
  const pendingCommission = s?.commissionPending ?? 0;
  const paidCommission = s?.commissionPaid ?? 0;
  const cancelledCommission = s?.commissionCancelled ?? 0;
  const referralRevenueUi = s?.referralRevenue ?? 0;
  const totalClicksUi = s?.totalClicks ?? data.affiliate.totalClicks;
  const referredOrdersUi = s?.referredOrdersCount ?? data.affiliate.referredOrders;
  const withdrawableBalanceUi = s?.withdrawableBalance ?? 0;
  const conversionRate =
    s?.conversionRatePercent ??
    (data.affiliate.totalClicks > 0
      ? Math.round((data.affiliate.referredOrders / data.affiliate.totalClicks) * 1000) / 10
      : 0);
  const isAffiliateDataEmpty = affDash.data
    ? affDash.data.summary.referredOrdersCount === 0 &&
      affDash.data.summary.totalClicks === 0 &&
      affDash.data.summary.commissionPending === 0 &&
      affDash.data.summary.commissionApprovedPool === 0 &&
      affDash.data.summary.referralRevenue === 0 &&
      data.stats.rewardPoints === 0
    : data.affiliate.totalClicks === 0 &&
      data.affiliate.referredOrders === 0 &&
      data.stats.affiliateCommission === 0 &&
      data.stats.rewardPoints === 0;
  const affiliateSubTabs: Array<{ key: AffiliateSubTab; label: string }> = [
    { key: "overview", label: "Trung tâm CTV / Affiliate" },
    { key: "links", label: "Bộ tạo link giới thiệu" },
    { key: "orders", label: "Đơn phát sinh" },
    { key: "earnings", label: "Hoa hồng & điểm thưởng" },
    { key: "withdrawal", label: "Yêu cầu rút tiền" },
    { key: "guide", label: "Hướng dẫn chi tiết" },
  ].filter((row): row is { key: AffiliateSubTab; label: string } => {
    if (!data.affiliate.isActive) return true;
    if (row.key === "withdrawal" && !accountSettings.affiliateShowWithdrawals) return false;
    if (row.key === "guide" && !accountSettings.affiliateShowGuide) return false;
    return true;
  });
  const rewardRows: Array<{
    id: string;
    createdAt: string;
    points: number;
    status: string;
    reason: string;
  }> = data.stats.rewardPoints
    ? [
        {
          id: "reward-summary",
          createdAt: new Date().toISOString(),
          points: data.stats.rewardPoints,
          status: "AVAILABLE",
          reason: "Tổng điểm khả dụng",
        },
      ]
    : [];
  const guideTitle = accountSettings.affiliateGuideTitle || "Hướng dẫn chi tiết CTV / Affiliate";
  const guideIntro =
    accountSettings.affiliateGuideIntro ||
    "Làm theo từng bước để triển khai link giới thiệu hiệu quả và tuân thủ chính sách.";
  const guideStepsRaw = [
    accountSettings.affiliateGuideStep1,
    accountSettings.affiliateGuideStep2,
    accountSettings.affiliateGuideStep3,
    accountSettings.affiliateGuideStep4,
    accountSettings.affiliateGuideStep5,
    accountSettings.affiliateGuideStep6,
    accountSettings.affiliateGuideStep7,
    accountSettings.affiliateGuideStep8,
  ];
  const fallbackGuideSteps = [
    "Lấy link giới thiệu: vào Bộ tạo link giới thiệu, chọn loại link phù hợp và tạo link có mã ref cá nhân.",
    "Chia sẻ link đúng cách: chia sẻ qua Zalo, Facebook, TikTok, website hoặc nhóm khách hàng phù hợp.",
    "Khách bấm link và phát sinh đơn: hệ thống ghi nhận click/đơn hợp lệ theo mã ref, chỉ tính đơn đúng điều kiện.",
    "Theo dõi đơn giới thiệu: vào mục Đơn giới thiệu để theo dõi trạng thái đơn và hoa hồng dự kiến.",
    "Theo dõi hoa hồng & điểm thưởng: xem trạng thái chờ duyệt, đã duyệt, đã thanh toán.",
    "Yêu cầu rút tiền: vào mục Yêu cầu rút tiền, kiểm tra mức rút tối thiểu và gửi yêu cầu khi được kích hoạt.",
    "Quy định/lưu ý: không spam, không tự mua gian lận, chỉ tính đơn hợp lệ; vi phạm có thể bị khóa CTV.",
    "Cần hỗ trợ: dùng tab Hỗ trợ, Zalo (nếu cửa hàng cấu hình) hoặc link hướng dẫn từ cài đặt quản trị.",
  ];
  const guideSteps = guideStepsRaw.every((item) => typeof item === "string" && item.trim())
    ? (guideStepsRaw as string[]).map((item) => item.trim())
    : fallbackGuideSteps;

  useEffect(() => {
    if (initialAccountTab === "supportTickets" && accountSettings.showSupport) {
      useSupportChatStore.getState().open();
    }
  }, [initialAccountTab, accountSettings.showSupport]);

  useEffect(() => {
    const rawIncoming = (initialAccountTab ?? "").trim();
    const raw = rawIncoming === "support" ? "policyHub" : rawIncoming;
    if (raw && ACCOUNT_TAB_KEYS.has(raw as TabKey)) {
      setActiveTab(raw as TabKey);
    }
    const sub = (initialAffiliateSubTab ?? "").trim();
    if (sub && AFFILIATE_DASH_SUB_TABS.has(sub)) {
      setActiveSubTab(sub as AffiliateSubTab);
    }
  }, [initialAccountTab, initialAffiliateSubTab]);

  useEffect(() => {
    if (activeTab !== "affiliate" || activeSubTab !== "withdrawal") return;
    const hash =
      typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash !== "affiliate-payout-account") return;
    requestAnimationFrame(() => {
      document.getElementById("affiliate-payout-account")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [activeTab, activeSubTab]);

  useEffect(() => {
    const tabs = enabledMenuItems.filter(
      (item): item is { kind: "tab"; label: string; tab: TabKey; enabled: boolean } => item.kind === "tab",
    );
    if (!tabs.some((item) => item.tab === activeTab)) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, enabledMenuItems, fallbackTab]);
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

  const statsGrid =
    quickCards.length > 0 ? (
      <div
        id="tong-quan-stats"
        className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-2.5 lg:gap-3 xl:grid-cols-4 xl:gap-3"
        role="region"
        aria-label="Thống kê tài khoản"
      >
        {quickCards.map((card) => (
          <article
            key={card.key}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 shadow-sm sm:px-3 sm:py-2.5"
          >
            <p className="text-[11px] font-medium leading-snug text-[#64748B] sm:text-xs">{card.label}</p>
            <p className="mt-0.5 truncate text-base font-bold tabular-nums text-[#0F172A] sm:text-lg">{card.value}</p>
          </article>
        ))}
      </div>
    ) : null;

  return (
    <div className="w-full min-w-0 max-w-none space-y-4 bg-transparent">
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
        onSelectTab={(tab) => setActiveTab(tab as TabKey)}
        onOpenSupport={() => useSupportChatStore.getState().open()}
        onSignOut={() => {
          signOut({ callbackUrl: "/" }).catch(() => {});
        }}
        supportUnreadTotal={supportUnreadTotal}
      />
      <section className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(200px,42%)] lg:items-center lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(240px,40%)]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">
              {currentAvatar ? (
                <Image
                  src={currentAvatar}
                  alt={`${data.displayName} avatar`}
                  width={72}
                  height={72}
                  className="h-12 w-12 shrink-0 rounded-full border border-[#E2E8F0] object-cover sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px]"
                />
              ) : (
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-lg font-bold text-[#1D4ED8] sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px]">
                  {(data.displayName.trim()[0] || "Z").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                  {accountSettings.accountTitle || "Tài khoản của tôi"}
                </p>
                <h2 className="truncate text-lg font-semibold text-[#0F172A]">{data.displayName}</h2>
                <p className="truncate text-sm text-[#64748B]">{data.contactText}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-[#64748B]">{accountSubtitle}</p>
                {accountSettings.showProfile ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="mt-1 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                ) : null}
              </div>
              <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                {data.badge}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] hover:bg-[#EFF6FF] disabled:opacity-60"
              >
                {avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={avatarUploading}
                  className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                >
                  Xóa ảnh
                </button>
              ) : null}
              {avatarUploading ? <p className="text-xs text-[#64748B]">Đang tải ảnh...</p> : null}
              {avatarMessage ? <p className="text-xs text-emerald-700">{avatarMessage}</p> : null}
              {avatarError ? <p className="text-xs text-rose-700">{avatarError}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={accountSettings.orderLookupUrl || "/tra-cuu-don-hang"}
                className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Theo dõi đơn hàng
              </Link>
              {showShoppingCta ? (
                <Link
                  href={shoppingHomeHref}
                  className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-xl bg-[#F59E0B] px-4 text-sm font-semibold text-white hover:bg-[#D97706]"
                >
                  {accountSettings.shoppingCtaText || "Tiếp tục mua sắm"}
                </Link>
              ) : null}
            </div>
          </div>
          {statsGrid}
        </div>
      </section>

      <section className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-5">
        <aside className="hidden w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm md:block lg:sticky lg:top-24 lg:self-start lg:p-4">
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {enabledMenuItems.map((item) =>
              item.kind === "support" ? (
                <button
                  key="nav-support-chat"
                  type="button"
                  onClick={() => useSupportChatStore.getState().open()}
                  className={`${MENU_BASE_CLASS} flex min-h-10 min-w-0 basis-[calc(50%-0.25rem)] items-center justify-between gap-2 text-left lg:basis-auto border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#EFF6FF]`}
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
                  onClick={() => setActiveTab(item.tab)}
                  aria-current={activeTab === item.tab ? "page" : undefined}
                  className={`${MENU_BASE_CLASS} flex min-h-10 min-w-0 basis-[calc(50%-0.25rem)] items-center justify-between gap-2 text-left lg:basis-auto ${
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
              className={`${MENU_BASE_CLASS} min-h-10 basis-[calc(50%-0.25rem)] text-left text-rose-600 hover:bg-rose-50 lg:basis-auto`}
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="min-w-0 w-full max-w-none space-y-4">
          {activeTab === "overview" ? (
            <section className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
              <h3 className="text-base font-semibold text-[#0F172A]">Tổng quan tài khoản</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {buyerShortcutStatsOk ? (
                  <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-[#0F172A]">Đơn gần đây</p>
                    {data.orders.length ? (
                      <div className="mt-2 space-y-1.5">
                        {data.orders.slice(0, 2).map((order) => (
                          <p key={order.id} className="text-sm text-[#64748B]">
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
                <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-sm font-semibold text-[#0F172A]">Thông báo mới</p>
                  <div className="mt-2 space-y-1 text-sm text-[#64748B]">
                    <p>Đơn hàng: {liveNotifications.groups.order}</p>
                    <p>Hoa hồng: {liveNotifications.groups.commission}</p>
                    <p>Khuyến mãi: {liveNotifications.groups.promotion}</p>
                    <p>Hệ thống: {liveNotifications.groups.system}</p>
                  </div>
                </article>
                {showCouponsEffective ? (
                  <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-[#0F172A]">Voucher nổi bật</p>
                    {data.vouchers.active.slice(0, 2).length ? (
                      <div className="mt-2 space-y-1.5">
                        {data.vouchers.active.slice(0, 2).map((voucher) => (
                          <p key={voucher.code} className="text-sm text-[#64748B]">
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
                  <article className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-[#0F172A]">Hỗ trợ nhanh</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {accountSettings.orderLookupUrl ? <Link href={accountSettings.orderLookupUrl} className="rounded-lg bg-white px-2.5 py-1 text-xs text-[#0F172A]">Tra cứu đơn</Link> : null}
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
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("tracking")}
                  className="inline-flex h-10 items-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Theo dõi đơn hàng
                </button>
                {showShoppingCta ? (
                  <Link
                    href={shoppingHomeHref}
                    className="inline-flex h-10 items-center rounded-xl bg-[#F59E0B] px-4 text-sm font-semibold text-white hover:bg-[#D97706]"
                  >
                    Tiếp tục mua sắm
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeTab === "orders" && accountSettings.showOrders ? (
            <section id="don-hang" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
                          {order.productNames.slice(0, 2).map((name) => (
                            <div key={`${order.id}-${name}`} className="flex items-center gap-3">
                              <div className="h-14 w-14 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] sm:h-16 sm:w-16" />
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm text-[#0F172A]">{name}</p>
                                <p className="text-xs text-[#64748B]">x1</p>
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
          ) : null}

          {activeTab === "purchaseHistory" && showPurchaseHistoryEffective ? (
            <PurchaseHistoryPanel settings={accountSettings} supportHref={supportHref} />
          ) : null}

          {activeTab === "tracking" && accountSettings.showOrderTimeline ? (
            <section className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
          ) : null}

          {activeTab === "notifications" && accountSettings.showNotifications ? (
            <AccountNotificationsSection
              title={accountSettings.notificationTitle || "Thông báo tài khoản"}
              notifications={liveNotifications}
              commissionTab={affiliateCommissionTab}
              affiliateProgramEnabled={affiliateProgramEnabled}
              isAffiliateActive={data.affiliate.isActive}
            />
          ) : null}

          {activeTab === "coupons" && showCouponsEffective ? (
            <section id="voucher" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
          ) : null}

          {activeTab === "profile" && accountSettings.showProfile ? (
            <section id="thong-tin-ca-nhan" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
          ) : null}

          {activeTab === "addresses" && showAddressesEffective ? (
            <section id="so-dia-chi" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
          ) : null}

          {activeTab === "wishlist" &&
          (accountSettings.showWishlist || accountSettings.showRecentlyViewed || accountSettings.showRecommendedProducts) ? (
            <section id="yeu-thich" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
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
          ) : null}

          {activeTab === "policyHub" ? (
            <AccountPolicyHubPanel
              orderLookupHref={accountSettings.orderLookupUrl?.trim() || "/tra-cuu-don-hang"}
              policyCards={policyHubCards}
              showLegacyWarranty={Boolean(accountSettings.showWarranty && accountSettings.warrantyPolicyUrl?.trim())}
              legacyWarrantyHref={accountSettings.warrantyPolicyUrl ?? undefined}
              showLegacyReturn={Boolean(accountSettings.showReturnRequest && accountSettings.returnPolicyUrl?.trim())}
              legacyReturnHref={accountSettings.returnPolicyUrl ?? undefined}
              zaloHref={supportHref.startsWith("http") ? supportHref : null}
            />
          ) : null}

          {activeTab === "affiliate" && accountSettings.showAffiliate ? (
            <section id="affiliate" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
              {data.affiliate.isActive ? (
                <>
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-2">
                    <div className="-mx-1 overflow-x-auto px-1">
                      <div className="inline-flex min-w-max flex-nowrap gap-2">
                        {affiliateSubTabs.map((item) => {
                          const active = activeSubTab === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setActiveSubTab(item.key)}
                              className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm lg:text-[15px] ${
                                active
                                  ? "border-[#2563EB] bg-[#EFF6FF] font-bold text-[#0F172A]"
                                  : "border-[#E2E8F0] bg-white font-semibold text-[#0F172A] hover:bg-[#EFF6FF]"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {activeSubTab === "overview" ? (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#0F172A]">
                          {accountSettings.affiliateTitle || "Trung tâm CTV / Affiliate"}
                        </h3>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Đang hoạt động
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {accountSettings.affiliateSubtitle ||
                          "Theo dõi hiệu suất giới thiệu, hoa hồng và điểm thưởng của bạn."}
                      </p>
                      {affDash.error ? <p className="mt-1 text-xs text-rose-600">{affDash.error}</p> : null}
                      {affDash.loading ? <p className="mt-1 text-xs text-[#64748B]">Đang cập nhật số liệu CTV…</p> : null}
                      <p className="mt-1 text-xs text-[#64748B]">Mã giới thiệu: <span className="font-semibold text-[#0F172A]">{data.affiliate.refCode || "—"}</span></p>
                      {accountSettings.affiliateBanner.enabled ? (
                        <article className="mt-3 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                          {accountSettings.affiliateBanner.imageUrl ? (
                            <Image
                              src={accountSettings.affiliateBanner.imageUrl}
                              alt={accountSettings.affiliateBanner.title || "Banner CTV"}
                              width={1200}
                              height={360}
                              className="h-32 w-full object-cover sm:h-36"
                            />
                          ) : null}
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {accountSettings.affiliateBanner.title || "Ưu đãi dành cho CTV"}
                            </p>
                            {accountSettings.affiliateBanner.subtitle ? (
                              <p className="mt-1 text-xs text-[#64748B]">{accountSettings.affiliateBanner.subtitle}</p>
                            ) : null}
                            {accountSettings.affiliateBanner.buttonUrl ? (
                              <Link
                                href={accountSettings.affiliateBanner.buttonUrl}
                                className="mt-2 inline-flex rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                              >
                                {accountSettings.affiliateBanner.buttonText || "Xem chi tiết"}
                              </Link>
                            ) : null}
                          </div>
                        </article>
                      ) : null}
                      <p className="mt-3 break-all rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
                        Link giới thiệu: {referralUrl || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAffiliateCopyError("");
                            navigator.clipboard
                              ?.writeText(referralUrl)
                              .then(() => {
                                setAffiliateCopied(true);
                                window.setTimeout(() => setAffiliateCopied(false), 1600);
                              })
                              .catch(() => {
                                setAffiliateCopyError("Không thể sao chép, vui lòng copy thủ công.");
                              });
                          }}
                          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                        >
                          Sao chép link
                        </button>
                        {referralUrl ? (
                          <Link
                            href={referralUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                          >
                            Mở link
                          </Link>
                        ) : null}
                        <Link
                          href={`${accountSettings.continueShoppingUrl || "/cua-hang"}${data.affiliate.refCode ? `?ref=${encodeURIComponent(data.affiliate.refCode)}` : ""}`}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                        >
                          Tạo link sản phẩm
                        </Link>
                      </div>
                      {affiliateCopied ? (
                        <p className="mt-2 text-xs font-medium text-emerald-700">Đã sao chép</p>
                      ) : null}
                      {affiliateCopyError ? (
                        <p className="mt-2 text-xs font-medium text-rose-700">{affiliateCopyError}</p>
                      ) : null}
                      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Mã giới thiệu</p>
                          <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]" title={data.affiliate.refCode || undefined}>
                            {data.affiliate.refCode || "—"}
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Tổng click</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">{totalClicksUi}</p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Đơn phát sinh</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">{referredOrdersUi}</p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Doanh thu ghi nhận</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {new Intl.NumberFormat("vi-VN").format(referralRevenueUi)}₫
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Hoa hồng chờ duyệt</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {new Intl.NumberFormat("vi-VN").format(pendingCommission)}₫
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Hoa hồng đã duyệt (chưa chi)</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {new Intl.NumberFormat("vi-VN").format(approvedCommission)}₫
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Hoa hồng đã thanh toán</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {new Intl.NumberFormat("vi-VN").format(paidCommission)}₫
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Hoa hồng bị hủy</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {new Intl.NumberFormat("vi-VN").format(cancelledCommission)}₫
                          </p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Điểm thưởng</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">{data.stats.rewardPoints}</p>
                        </article>
                        <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                          <p className="text-xs text-[#64748B]">Tỷ lệ chuyển đổi</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-[#0F172A]">
                            {conversionRate === null || conversionRate === undefined ? "—" : `${conversionRate}%`}
                          </p>
                        </article>
                        {accountSettings.affiliateShowWithdrawals && affDash.data?.program.withdrawalEnabled ? (
                          <article className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2 xl:col-span-2">
                            <p className="text-xs text-emerald-800">Số dư có thể rút</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-950">
                              {new Intl.NumberFormat("vi-VN").format(withdrawableBalanceUi)}₫
                            </p>
                          </article>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("links")}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                        >
                          Tạo link giới thiệu
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("orders")}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                        >
                          Xem đơn phát sinh
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("earnings")}
                          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                        >
                          Xem hoa hồng
                        </button>
                        {accountSettings.affiliateShowWithdrawals ? (
                          <button
                            type="button"
                            onClick={() => setActiveSubTab("withdrawal")}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                          >
                            Yêu cầu rút tiền
                          </button>
                        ) : null}
                        <Link href={supportHref} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]">
                          Liên hệ hỗ trợ CTV
                        </Link>
                        {accountSettings.affiliateGuideUrl ? (
                          <Link
                            href={accountSettings.affiliateGuideUrl}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                          >
                            Hướng dẫn CTV
                          </Link>
                        ) : null}
                        {accountSettings.affiliateTermsUrl ? (
                          <Link
                            href={accountSettings.affiliateTermsUrl}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
                          >
                            Điều khoản CTV
                          </Link>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                        <p>
                          {accountSettings.affiliateDefaultCommissionText ||
                            "Hoa hồng được đối soát theo đơn hàng đủ điều kiện."}
                        </p>
                        <p className="mt-1">
                          {accountSettings.affiliateSupportText ||
                            "Liên hệ đội ngũ hỗ trợ CTV nếu bạn cần trợ giúp về link giới thiệu và hoa hồng."}
                        </p>
                      </div>
                      {isAffiliateDataEmpty ? (
                        <div className="mt-3 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                          <p className="text-sm font-semibold text-[#0F172A]">Bạn chưa có đơn giới thiệu nào.</p>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab("links")}
                            className="mt-2 inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                          >
                            Tạo link giới thiệu đầu tiên
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {activeSubTab === "orders" ? (
                    <AffiliateOrdersPanel
                      highlightOrderCode={highlightOrderCode}
                      loading={affDash.loading && !affDash.data}
                      orders={(affDash.data?.referredOrders ?? []).map((o) => ({
                        id: o.id,
                        code: o.code,
                        createdAt: o.createdAt,
                        orderStatus: o.orderStatus,
                        orderStatusVi: o.orderStatusVi,
                        totalAmount: o.totalAmount,
                        estimatedCommission: o.estimatedCommission,
                        commissionStatus: o.commissionStatus,
                        commissionStatusVi: o.commissionStatusVi,
                      }))}
                    />
                  ) : null}
                  {activeSubTab === "earnings" ? (
                    <AffiliateEarningsPanel
                      loading={affDash.loading && !affDash.data}
                      commissions={(affDash.data?.commissions ?? []).map((c) => ({
                        id: c.id,
                        createdAt: c.createdAt,
                        amount: c.amount,
                        orderRevenue: c.orderRevenue,
                        status: c.status,
                        statusKey: c.statusKey,
                        statusDisplayVi: c.statusDisplayVi,
                        orderCode: c.orderCode,
                        approvedAt: c.approvedAt,
                        paidAt: c.paidAt,
                      }))}
                      rewards={rewardRows}
                    />
                  ) : null}
                  {activeSubTab === "withdrawal" ? (
                    <>
                      <AffiliatePayoutAccountPanel onChanged={(acc) => setPayoutAccount(acc as typeof payoutAccount)} />
                      <AffiliateWithdrawalPanel
                        withdrawnEnabled={Boolean(
                          affDash.data?.program.withdrawalEnabled && accountSettings.affiliateShowWithdrawals,
                        )}
                        payoutAccount={payoutAccount}
                        availableAmount={affDash.data?.summary.withdrawableBalance ?? 0}
                        withdrawals={(affDash.data?.withdrawals ?? []).map((w) => ({
                          id: w.id,
                          createdAt: w.createdAt,
                          amount: w.amount,
                          status: w.status,
                          statusDisplayVi: w.statusDisplayVi,
                          approvedAt: w.approvedAt,
                          paidAt: w.paidAt,
                        }))}
                        minWithdrawalAmount={accountSettings.affiliateMinWithdrawalAmount ?? 100000}
                        payoutThreshold={
                          affDash.data?.program.payoutThreshold ?? accountSettings.affiliateMinWithdrawalAmount ?? 100000
                        }
                        busy={affDash.loading && !affDash.data}
                        onSubmitRequest={async (payload) => {
                          const res = await fetch("/api/account/affiliate/withdrawal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "same-origin",
                            body: JSON.stringify(payload),
                          });
                          const j = (await res.json()) as { ok?: boolean; message?: string };
                          if (res.ok && j.ok) {
                            affDash.refetch();
                            return { ok: true, message: j.message };
                          }
                          return { ok: false, message: j.message ?? "Không gửi được yêu cầu." };
                        }}
                      />
                    </>
                  ) : null}
                  {activeSubTab === "links" ? (
                    <div className="min-w-0 space-y-4">
                      <AffiliateLinkBuilder refCode={data.affiliate.refCode} />
                      {(affDash.data?.productQuickLinks?.length ?? 0) > 0 ? (
                        <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                          <p className="text-sm font-semibold text-[#0F172A]">Link theo sản phẩm (gợi ý)</p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            Gợi ý sản phẩm để tạo link ref nhanh trong Bộ tạo link — không hiển thị dữ liệu khách mua.
                          </p>
                          <div className="mt-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto overscroll-contain">
                            {affDash.data?.productQuickLinks.map((p) => (
                              <Link
                                key={p.id}
                                href={`/san-pham/${encodeURIComponent(p.slug)}`}
                                className="truncate rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
                                title={p.name}
                              >
                                {p.name}
                              </Link>
                            ))}
                          </div>
                        </section>
                      ) : affDash.loading ? (
                        <p className="text-sm text-[#64748B]">Đang tải gợi ý sản phẩm…</p>
                      ) : null}
                    </div>
                  ) : null}
                  {activeSubTab === "guide" ? (
                    <AffiliateGuidePanel
                      title={guideTitle}
                      intro={guideIntro}
                      steps={guideSteps}
                      guideUrl={accountSettings.affiliateGuideUrl}
                      termsUrl={accountSettings.affiliateTermsUrl}
                      supportZaloUrl={accountSettings.supportZaloUrl}
                      systemGuideContent={affDash.data?.program.ctvGuideResolved}
                      affiliateCanBuy={affDash.data?.program.affiliateCanBuy ?? true}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-[#0F172A]">Chương trình CTV / Affiliate</h3>
                  <p className="mt-2 text-sm text-[#64748B]">
                    Tài khoản của bạn chưa được kích hoạt chức năng CTV. Vui lòng liên hệ quản trị viên để được nâng cấp.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={supportHref} className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]">
                      Liên hệ hỗ trợ
                    </Link>
                    <Link
                      href={shoppingHomeHref}
                      className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D97706]"
                    >
                      Tiếp tục mua sắm
                    </Link>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {activeTab === "security" && accountSettings.showSecurity ? (
            <section id="bao-mat" className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
