"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AFFILIATE_DASH_SUB_TAB_KEYS } from "../../lib/affiliate-account-dashboard-model";
import type { AffiliateSubTab } from "../../lib/affiliate-account-dashboard-model";
import { CtvAccountTabPanel } from "./ctv/ctv-account-tab-panel";
import { AccountPageMainChrome } from "./account-page-main-chrome";
import type { AffiliateCommissionTabSettings } from "../../lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "../../lib/settings";
import { resolveCtvAccountTab } from "../../lib/account-tab-navigation";
import { useAccountOverviewScrollReset } from "../../lib/use-account-overview-scroll-reset";
import { useStorefrontAccountTabBootstrap } from "../../lib/use-storefront-account-tab-bootstrap";
import { useCustomerNotificationsPoll } from "../../lib/use-customer-notifications-poll";
import { useAccountMobileMenuStore } from "../../stores/accountMobileMenuStore";
import AccountMobileMenuDrawer from "./account-mobile-menu-drawer";
import { AccountNotificationsSection } from "./account-notifications-section";
import { AffiliateCommissionNotificationToast } from "./affiliate/affiliate-commission-notification-toast";
import { AffiliateCommissionUnlockBanner } from "./affiliate/affiliate-commission-unlock-banner";
import AccountPolicyHubPanel from "./account-policy-hub-panel";
import {
  CTV_CONTENT_PANEL,
  CTV_CTA_PRIMARY,
  CTV_CTA_SECONDARY,
  CTV_OVERVIEW_TILE,
  CTV_TYPE_SECTION,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import { AccountOrderItemThumbnail } from "./account-order-item-thumbnail";
import { AffiliateCtvAccountSidebar } from "./affiliate-ctv-account-sidebar";
import { buildAffiliateCtvNavEntriesFromDashboard } from "@/lib/storefront-affiliate-ctv-nav-build";
import { flattenEnabledMenuItems } from "./affiliate-ctv-account-menu-config";
type VietnamAddressesApi = typeof import("../../lib/vietnam-addresses");
import type { PolicyHubCard } from "../../lib/site-policy-public";
import { AccountTabKeepAlive } from "./account-tab-keep-alive";
import { prefetchStorefrontAccountTabsIdle } from "../../lib/account-tab-prefetch";
import AccountVoucherWallet from "./account-voucher-wallet";

const accountTabHeavyFallback = (): JSX.Element => (
  <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm" aria-hidden>
    <div className="h-4 w-1/3 max-w-[200px] animate-pulse rounded bg-slate-200" />
    <div className="mt-4 h-3 w-full max-w-xl animate-pulse rounded bg-slate-100" />
    <div className="mt-2 h-3 w-[92%] max-w-xl animate-pulse rounded bg-slate-100" />
  </div>
);

const PurchaseHistoryPanel = dynamic(() => import("./purchase-history-panel"), {
  loading: () => <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const AffiliateProductRefActions = dynamic(() => import("./affiliate-product-ref-actions"), {
  loading: () => <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">Đang tải...</div>,
});
const ChangePasswordForm = dynamic(() => import("../auth/change-password-form"), {
  loading: accountTabHeavyFallback,
});
const AffiliateAccountDashboardTab = dynamic(
  () => import("./affiliate/affiliate-account-dashboard-tab").then((m) => ({ default: m.AffiliateAccountDashboardTab })),
  { loading: accountTabHeavyFallback, ssr: false },
);
const CtvOverviewDashboard = dynamic(
  () => import("./ctv/ctv-overview-dashboard").then((m) => ({ default: m.CtvOverviewDashboard })),
  { loading: accountTabHeavyFallback, ssr: false },
);
const CtvAffiliateWorkspaceDesktop = dynamic(
  () => import("./ctv/ctv-affiliate-workspace-desktop").then((m) => ({ default: m.CtvAffiliateWorkspaceDesktop })),
  { loading: accountTabHeavyFallback, ssr: false },
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
  vouchers: import("../../lib/server/storefront-customer-account-dashboard").StorefrontCustomerAccountDashboardData["vouchers"];
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
      badgeClass: "bg-[#EFF6FF] text-[#1D4ED8]",
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

/** CTV chỉ giới thiệu (`affiliateCanBuy === false`): bảng điều khiển theo affiliateShow* và tab mặc định. */
export default function AffiliateOnlyAccountView({
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
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const resolved = resolveCtvAccountTab(initialAccountTab ?? "", initialAffiliateSubTab ?? "");
    return ACCOUNT_TAB_KEYS.has(resolved.tab as TabKey) ? (resolved.tab as TabKey) : "overview";
  });
  const [activeSubTab, setActiveSubTab] = useState<AffiliateSubTab>(() => {
    const resolved = resolveCtvAccountTab(initialAccountTab ?? "", initialAffiliateSubTab ?? "");
    return AFFILIATE_DASH_SUB_TAB_KEYS.has(resolved.sub ?? "") ? (resolved.sub as AffiliateSubTab) : "overview";
  });
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState("");
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
  const [navExpanded, setNavExpanded] = useState<Record<string, boolean>>({});
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

  const [vietnamAddressesApi, setVietnamAddressesApi] = useState<VietnamAddressesApi | null>(null);

  useEffect(() => {
    if (activeTab !== "addresses" && !addressOpen) return;
    if (vietnamAddressesApi) return;
    let cancelled = false;
    void import("../../lib/vietnam-addresses").then((mod) => {
      if (!cancelled) setVietnamAddressesApi(mod);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, addressOpen, vietnamAddressesApi]);

  const provinceOptions = vietnamAddressesApi ? vietnamAddressesApi.getProvinces("legacy") : [];
  const districtOptions = vietnamAddressesApi
    ? vietnamAddressesApi.getDistrictsByProvince(addressProvinceCode, "legacy")
    : [];
  const wardOptions = vietnamAddressesApi
    ? vietnamAddressesApi.getWardsByDistrict(addressDistrictCode, addressProvinceCode, "legacy")
    : [];

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
  const showShoppingCta = accountSettings.affiliateShowShoppingCta;
  const buyerShortcutStatsOk = accountSettings.affiliateShowBuyerStats;

  const showPurchaseHistoryEffective =
    accountSettings.showPurchaseHistory && accountSettings.affiliateShowPurchaseHistory;
  const showAddressesEffective =
    accountSettings.showAddresses && accountSettings.affiliateShowAddressBook;
  const showCouponsEffective =
    accountSettings.showCoupons && accountSettings.affiliateShowVoucher;
  const quickCards = useMemo(
    () =>
      [
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
      ].filter((item) => item.enabled),
    [
      accountSettings.showOrders,
      accountSettings.showOrderTimeline,
      affiliateMetricLabel,
      affiliateMetricValue,
      buyerShortcutStatsOk,
      data.stats.processingOrders,
      data.stats.totalOrders,
      data.stats.vouchers,
      showCouponsEffective,
    ],
  );

  const ctvNavEntries = useMemo(() => buildAffiliateCtvNavEntriesFromDashboard(accountSettings, data), [accountSettings, data]);

  const enabledMenuItems = useMemo(() => flattenEnabledMenuItems(ctvNavEntries), [ctvNavEntries]);
  const allowedNavTabs = useMemo(
    () => [
      ...new Set(
        enabledMenuItems.filter((i): i is { kind: "tab"; tab: string; label: string } => i.kind === "tab").map((i) => i.tab),
      ),
    ],
    [enabledMenuItems],
  );
  const fallbackTab = (allowedNavTabs[0] ?? "overview") as TabKey;

  useEffect(() => {
    prefetchStorefrontAccountTabsIdle(allowedNavTabs);
  }, [allowedNavTabs]);

  const { onSelectTab: navigateAccountTab } = useStorefrontAccountTabBootstrap({
    affiliateActive: data.affiliate.isActive,
    initialAccountTab,
    initialAffiliateSubTab,
    allowedTabs: allowedNavTabs,
    accountTabKeys: ACCOUNT_TAB_KEYS,
    affiliateSubTabKeys: AFFILIATE_DASH_SUB_TAB_KEYS,
    setActiveTab,
    setActiveSubTab,
  });

  useAccountOverviewScrollReset(activeTab);

  const selectTab = useCallback(
    (tab: TabKey) => {
      startTransition(() => {
        navigateAccountTab(tab);
        if (tab === "overview") setActiveSubTab("overview");
      });
    },
    [navigateAccountTab],
  );
  const selectAffiliateSubTab = useCallback(
    (sub: AffiliateSubTab) => {
      startTransition(() => {
        setActiveSubTab(sub);
        navigateAccountTab("affiliate", sub);
      });
    },
    [navigateAccountTab],
  );
  const selectAffiliateSection = useCallback(
    (sub: AffiliateSubTab) => {
      startTransition(() => {
        navigateAccountTab("affiliate", sub);
        setActiveSubTab(sub);
      });
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
  const accountSubtitle = accountSettings.accountSubtitle || accountSettings.welcomeMessage || "Quản lý thông tin tài khoản của bạn.";
  useEffect(() => {
    if (!allowedNavTabs.includes(activeTab)) {
      setActiveTab(allowedNavTabs.includes("overview") ? "overview" : fallbackTab);
    }
  }, [activeTab, allowedNavTabs, fallbackTab]);
  useEffect(() => {
    if (activeTab !== "affiliate" && activeTab !== "overview") {
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

  const onPickAvatar = useCallback(() => {
    avatarInputRef.current?.click();
  }, []);

  const onAvatarFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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
  }, [router]);

  const onRemoveAvatar = useCallback(async () => {
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
  }, [router]);

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

  const openEditAddressForm = async (item: AddressItem) => {
    setAddressMessage("");
    setAddressError("");
    const addrApi =
      vietnamAddressesApi ??
      (await import("../../lib/vietnam-addresses").then((mod) => {
        setVietnamAddressesApi(mod);
        return mod;
      }));
    setAddressEditingId(item.id);
    setAddressReceiverName(item.receiverName);
    setAddressPhone(item.phone);
    setAddressProvince(item.province);
    setAddressDistrict(item.district);
    setAddressWard(item.ward);
    const provinceMatch = addrApi.getProvinces("legacy").find(
      (province) =>
        addrApi.normalizeAddressKeyword(province.name) === addrApi.normalizeAddressKeyword(item.province),
    );
    const matchedProvinceCode = provinceMatch?.code ?? "";
    const districtList = matchedProvinceCode ? addrApi.getDistrictsByProvince(matchedProvinceCode, "legacy") : [];
    const districtMatch = districtList.find(
      (district) =>
        addrApi.normalizeAddressKeyword(district.name) === addrApi.normalizeAddressKeyword(item.district),
    );
    const matchedDistrictCode = districtMatch?.code ?? "";
    const wardList =
      matchedDistrictCode && matchedProvinceCode
        ? addrApi.getWardsByDistrict(matchedDistrictCode, matchedProvinceCode, "legacy")
        : [];
    const wardMatch = wardList.find(
      (ward) => addrApi.normalizeAddressKeyword(ward.name) === addrApi.normalizeAddressKeyword(item.ward),
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

  const profileHeroProps = useMemo(
    () => ({
      accountSettings,
      accountSubtitle,
      displayName: data.displayName,
      contactText: data.contactText,
      badge: data.badge,
      currentAvatar,
      avatarUrl,
      avatarInputRef,
      avatarUploading,
      avatarMessage,
      avatarError,
      onPickAvatar,
      onAvatarFileChange,
      onRemoveAvatar,
      onEditProfile: accountSettings.showProfile ? () => selectTab("profile") : undefined,
      showProfileLink: accountSettings.showProfile,
      showShoppingCta,
      shoppingHomeHref,
      orderLookupHref: accountSettings.orderLookupUrl || "/tra-cuu-don-hang",
      refCode: data.affiliate.refCode,
      quickCards,
    }),
    [
      accountSettings,
      accountSubtitle,
      avatarError,
      avatarMessage,
      avatarUploading,
      avatarUrl,
      currentAvatar,
      data.affiliate.refCode,
      data.badge,
      data.contactText,
      data.displayName,
      onAvatarFileChange,
      onPickAvatar,
      onRemoveAvatar,
      quickCards,
      selectTab,
      shoppingHomeHref,
      showShoppingCta,
    ],
  );


  const toggleNavSection = (id: string) => {
    setNavExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showCommissionNavBadge = Boolean(
    data.affiliate.isActive && affiliateProgramEnabled && affiliateCommissionTab.tabEnabled,
  );

  const desktopSidebar = useMemo(
    () => (
      <AffiliateCtvAccountSidebar
        layout="desktop"
        entries={ctvNavEntries}
        activeTab={activeTab}
        onSelectTab={(t) => selectTab(t as TabKey)}
        activeAffiliateSubTab={activeSubTab}
        onSelectAffiliateSubTab={(s) => selectAffiliateSubTab(s as AffiliateSubTab)}
        expandedSections={navExpanded}
        onToggleSection={toggleNavSection}
        notificationsUnread={liveNotifications.unread}
        commissionBadge={liveNotifications.groups.commission}
        showCommissionBadge={showCommissionNavBadge}
        onSignOut={() => {
          signOut({ callbackUrl: "/" }).catch(() => {});
        }}
      />
    ),
    [
      activeSubTab,
      activeTab,
      ctvNavEntries,
      liveNotifications.groups.commission,
      liveNotifications.unread,
      navExpanded,
      selectAffiliateSubTab,
      selectTab,
      showCommissionNavBadge,
    ],
  );

  const affiliateDashboardBaseProps = useMemo(
    () => ({
      accountSettings,
      data,
      supportHref,
      shoppingHomeHref,
      highlightOrderCode,
      activeSubTab,
      onSelectSubTab: selectAffiliateSubTab,
      showGrowthToolkit: true as const,
      loyaltyPoints: data.loyalty.points,
      refCode: data.affiliate.refCode,
      ...profileHeroProps,
    }),
    [
      accountSettings,
      activeSubTab,
      data,
      highlightOrderCode,
      profileHeroProps,
      selectAffiliateSubTab,
      shoppingHomeHref,
      supportHref,
    ],
  );

  const overviewDashboardProps = useMemo(
    () => ({
      ...affiliateDashboardBaseProps,
      embedInPageOverview: true as const,
      overviewLayout: "all" as const,
    }),
    [affiliateDashboardBaseProps],
  );

  const affiliateWorkspaceProps = useMemo(
    () => ({
      ...affiliateDashboardBaseProps,
      embedInPageOverview: false as const,
      overviewLayout: "desktop" as const,
    }),
    [affiliateDashboardBaseProps],
  );

  const commissionNotifyUiEnabled = Boolean(
    data.affiliate.isActive && affiliateProgramEnabled && affiliateCommissionTab.tabEnabled,
  );

  const commissionBannerSlot = commissionNotifyUiEnabled ? (
    <AffiliateCommissionUnlockBanner notifications={liveNotifications} enabled={commissionNotifyUiEnabled} />
  ) : null;

  return (
    <AccountPageMainChrome
      contentId="tai-khoan-ctv-content"
      sidebar={desktopSidebar}
      topSlot={commissionBannerSlot}
      drawer={
        <>
      <AffiliateCommissionNotificationToast
        notifications={liveNotifications}
        enabled={commissionNotifyUiEnabled}
        commissionTab={affiliateCommissionTab}
      />
      <AccountMobileMenuDrawer
        items={[]}
        customNav={
          <AffiliateCtvAccountSidebar
            dense
            entries={ctvNavEntries}
            activeTab={activeTab}
            onSelectTab={(t) => selectTab(t as TabKey)}
            activeAffiliateSubTab={activeSubTab}
            onSelectAffiliateSubTab={(s) => selectAffiliateSubTab(s as AffiliateSubTab)}
            expandedSections={navExpanded}
            onToggleSection={toggleNavSection}
            notificationsUnread={liveNotifications.unread}
            commissionBadge={liveNotifications.groups.commission}
            showCommissionBadge={Boolean(
              data.affiliate.isActive && affiliateProgramEnabled && affiliateCommissionTab.tabEnabled,
            )}
            onSignOut={() => {
              signOut({ callbackUrl: "/" }).catch(() => {});
            }}
            onNavigate={() => useAccountMobileMenuStore.getState().close()}
          />
        }
        activeTab={activeTab}
        onSelectTab={(tab) => selectTab(tab as TabKey)}
        onOpenSupport={() => {}}
        supportUnreadTotal={0}
        onSignOut={() => {
          signOut({ callbackUrl: "/" }).catch(() => {});
        }}
      />
        </>
      }
    >
        {accountSettings.showOverview && accountSettings.showAffiliate ? (
          <AccountTabKeepAlive tabKey="overview" activeTab={activeTab}>
            <CtvOverviewDashboard {...overviewDashboardProps} />
          </AccountTabKeepAlive>
        ) : null}

        {accountSettings.showAffiliate ? (
          <AccountTabKeepAlive tabKey="affiliate" activeTab={activeTab}>
            <div className="hidden lg:block">
              <CtvAffiliateWorkspaceDesktop {...affiliateWorkspaceProps} />
            </div>
            <div className="lg:hidden">
              <AffiliateAccountDashboardTab
                accountSettings={accountSettings}
                data={data}
                supportHref={supportHref}
                shoppingHomeHref={shoppingHomeHref}
                highlightOrderCode={highlightOrderCode}
                activeSubTab={activeSubTab}
                onSelectSubTab={selectAffiliateSubTab}
                showGrowthToolkit
                uiShell="ctv"
              />
            </div>
          </AccountTabKeepAlive>
        ) : null}

          {activeTab === "overview" && !(accountSettings.showOverview && accountSettings.showAffiliate) ? (
            <section className={`${CTV_CONTENT_PANEL} lg:hidden`} aria-labelledby="ctv-overview-heading">
              <h3 id="ctv-overview-heading" className={CTV_TYPE_SECTION}>
                Tổng quan tài khoản
              </h3>
              {accountSettings.showAffiliate ? (
                <div
                  className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4"
                  role="group"
                  aria-label="Thao tác CTV nhanh"
                >
                  <button
                    type="button"
                    className={`${CTV_CTA_PRIMARY} w-full`}
                    onClick={() => selectAffiliateSection("links")}
                  >
                    Lấy link giới thiệu
                  </button>
                  <button
                    type="button"
                    className={`${CTV_CTA_SECONDARY} w-full border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}
                    onClick={() => selectAffiliateSection("earnings")}
                  >
                    Xem hoa hồng
                  </button>
                  <button
                    type="button"
                    className={`${CTV_CTA_SECONDARY} w-full`}
                    onClick={() =>
                      selectAffiliateSection(accountSettings.affiliateShowGuide ? "guide" : "overview")
                    }
                  >
                    Hướng dẫn CTV
                  </button>
                </div>
              ) : null}
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {buyerShortcutStatsOk ? (
                  <article className={CTV_OVERVIEW_TILE}>
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
                <article className={CTV_OVERVIEW_TILE}>
                  <p className="text-sm font-semibold text-[#0F172A]">Thông báo mới</p>
                  <div className="mt-2 space-y-1 text-sm text-[#64748B]">
                    <p>Đơn hàng: {liveNotifications.groups.order}</p>
                    <p>Hoa hồng: {liveNotifications.groups.commission}</p>
                    <p>Khuyến mãi: {liveNotifications.groups.promotion}</p>
                    <p>Hệ thống: {liveNotifications.groups.system}</p>
                  </div>
                </article>
                {showCouponsEffective ? (
                  <article className={CTV_OVERVIEW_TILE}>
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
                {accountSettings.affiliateShowSupport ? (
                  <article className={CTV_OVERVIEW_TILE}>
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
                  onClick={() => selectTab("tracking")}
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

          {accountSettings.showOrders ? (
            <AccountTabKeepAlive tabKey="orders" activeTab={activeTab}>
            <section id="don-hang" className="w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
                    id="affiliate-account-order-search"
                    name="orderSearch"
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
                          {(order.linePreviews && order.linePreviews.length > 0
                            ? order.linePreviews
                            : order.productNames.map((n) => ({ productName: n, quantity: 1, imageUrl: "" }))
                          )
                            .slice(0, 2)
                            .map((line, idx) => (
                              <div key={`${order.id}-line-${idx}`} className="flex items-center gap-3">
                                <AccountOrderItemThumbnail imageUrl={line.imageUrl} productName={line.productName} />
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
            <PurchaseHistoryPanel settings={accountSettings} supportHref={supportHref} hideBuyerCommerceActions />
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showOrderTimeline ? (
            <AccountTabKeepAlive tabKey="tracking" activeTab={activeTab}>
            <section className="w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
            <AccountVoucherWallet
              vouchers={data.vouchers}
              title={accountSettings.couponTitle || "Kho voucher"}
              shoppingHomeHref={shoppingHomeHref}
              showShoppingCta={showShoppingCta}
            />
            </AccountTabKeepAlive>
          ) : null}

          {accountSettings.showProfile ? (
            <AccountTabKeepAlive tabKey="profile" activeTab={activeTab}>
            <CtvAccountTabPanel id="thong-tin-ca-nhan" title="Thông tin cá nhân">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Họ tên</span>
                  <input
                    id="affiliate-account-profile-name"
                    name="profileName"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Email / Số điện thoại</span>
                  <input
                    id="affiliate-account-profile-contact"
                    name="profileContact"
                    value={profileContact}
                    onChange={(event) => setProfileContact(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Ngày sinh</span>
                  <input
                    id="affiliate-account-profile-birth-date"
                    name="profileBirthDate"
                    type="date"
                    value={profileBirthDate}
                    onChange={(event) => setProfileBirthDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#64748B]">Giới tính</span>
                  <select
                    id="affiliate-account-profile-gender"
                    name="profileGender"
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
            </CtvAccountTabPanel>
            </AccountTabKeepAlive>
          ) : null}

          {showAddressesEffective ? (
            <AccountTabKeepAlive tabKey="addresses" activeTab={activeTab}>
            <section id="so-dia-chi" className="w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
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
                        id="affiliate-account-address-receiver-name"
                        name="addressReceiverName"
                        value={addressReceiverName}
                        onChange={(event) => setAddressReceiverName(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Số điện thoại</span>
                      <input
                        id="affiliate-account-address-phone"
                        name="addressPhone"
                        value={addressPhone}
                        onChange={(event) => setAddressPhone(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#64748B]">Tỉnh/Thành phố</span>
                      <select
                        id="affiliate-account-address-province"
                        name="addressProvinceCode"
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
                        id="affiliate-account-address-district"
                        name="addressDistrictCode"
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
                        id="affiliate-account-address-ward"
                        name="addressWardCode"
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
                        id="affiliate-account-address-detail"
                        name="addressDetail"
                        value={addressDetail}
                        onChange={(event) => setAddressDetail(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]"
                      />
                    </label>
                  </div>
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#334155]">
                    <input
                      id="affiliate-account-address-is-default"
                      name="addressIsDefault"
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
                      <p className="mt-1 text-sm text-[#64748B]">{item.phone}</p>
                      <p className="mt-1 text-sm text-[#64748B] break-words">
                        {item.province}, {item.district}, {item.ward}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B] break-words">{item.detail}</p>
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
            <section id="yeu-thich" className="w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
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

          {accountSettings.showSecurity ? (
            <AccountTabKeepAlive tabKey="security" activeTab={activeTab}>
            <CtvAccountTabPanel
              id="bao-mat"
              title="Bảo mật tài khoản"
              description="Quản lý mật khẩu và phiên đăng nhập của bạn."
            >
              <div className="w-full min-w-0 space-y-4">
                <ChangePasswordForm />
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" }).catch(() => {})}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC]"
                >
                  Đăng xuất
                </button>
              </div>
            </CtvAccountTabPanel>
            </AccountTabKeepAlive>
          ) : null}
    </AccountPageMainChrome>
  );
}
