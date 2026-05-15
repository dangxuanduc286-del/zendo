import {
  ClipboardList,
  Heart,
  MapPin,
  Package,
  TicketPercent,
  Truck,
} from "lucide-react";
import type { CustomerAccountSettings } from "@/lib/settings";
import type { StorefrontCustomerAccountDashboardData } from "@/lib/server/storefront-customer-account-dashboard";
import { buildCtvNavEntries, type CtvNavEntry } from "@/components/storefront/affiliate-ctv-account-menu-config";

/**
 * Cùng logic menu CTV như `affiliate-only-account-view` — dùng cho shell trang con `/tai-khoan/affiliate/*`.
 */
export function buildAffiliateCtvNavEntriesFromDashboard(
  accountSettings: CustomerAccountSettings,
  data: StorefrontCustomerAccountDashboardData,
): CtvNavEntry[] {
  const buyerShortcutStatsOk = accountSettings.affiliateShowBuyerStats;
  const showPurchaseHistoryEffective =
    accountSettings.showPurchaseHistory && accountSettings.affiliateShowPurchaseHistory;
  const showAddressesEffective = accountSettings.showAddresses && accountSettings.affiliateShowAddressBook;
  const showCouponsEffective = accountSettings.showCoupons && accountSettings.affiliateShowVoucher;
  const showShoppingCta = accountSettings.affiliateShowShoppingCta;

  return buildCtvNavEntries({
    showOverview: accountSettings.showOverview,
    showAffiliate: accountSettings.showAffiliate,
    affiliateActive: data.affiliate.isActive,
    showNotifications: accountSettings.showNotifications,
    showProfile: accountSettings.showProfile,
    showPolicyHub: accountSettings.affiliateShowSupport,
    showSecurity: accountSettings.showSecurity,
    buyerRows: [
      {
        tab: "orders",
        label: "Đơn hàng của tôi",
        Icon: Package,
        enabled: accountSettings.showOrders && buyerShortcutStatsOk,
      },
      {
        tab: "purchaseHistory",
        label: accountSettings.purchaseHistoryTitle?.trim() || "Lịch sử mua hàng",
        Icon: ClipboardList,
        enabled: showPurchaseHistoryEffective,
      },
      {
        tab: "tracking",
        label: "Theo dõi đơn hàng",
        Icon: Truck,
        enabled: accountSettings.showOrderTimeline && buyerShortcutStatsOk,
      },
      {
        tab: "coupons",
        label: "Kho voucher",
        Icon: TicketPercent,
        enabled: showCouponsEffective,
      },
      {
        tab: "addresses",
        label: "Sổ địa chỉ",
        Icon: MapPin,
        enabled: showAddressesEffective,
      },
      {
        tab: "wishlist",
        label: "Yêu thích / đã xem",
        Icon: Heart,
        enabled:
          showShoppingCta &&
          (accountSettings.showWishlist ||
            accountSettings.showRecentlyViewed ||
            accountSettings.showRecommendedProducts),
      },
    ],
  });
}
