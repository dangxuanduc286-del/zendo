"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { AffiliateCommissionTabSettings } from "@/lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "@/lib/settings";
import type { StorefrontCustomerAccountDashboardData } from "@/lib/server/storefront-customer-account-dashboard";
import { buildAffiliateCtvNavEntriesFromDashboard } from "@/lib/storefront-affiliate-ctv-nav-build";
import { useCustomerNotificationsPoll } from "@/lib/use-customer-notifications-poll";
import { useAccountMobileMenuStore } from "@/stores/accountMobileMenuStore";
import AccountMobileMenuDrawer from "./account-mobile-menu-drawer";
import { AffiliateCtvAccountSidebar } from "./affiliate-ctv-account-sidebar";
import { StorefrontAccountTwoColumnLayout } from "./storefront-account-two-column-layout";

/**
 * Sidebar + vùng nội dung cho các route `/tai-khoan/affiliate/*` (analytics, attribution, …).
 * Tab trong sidebar điều hướng về `/tai-khoan?tab=…` để giữ một shell tài khoản thống nhất.
 */
export function AffiliateAccountSubpagesChrome({
  children,
  accountSettings,
  data,
  affiliateCommissionTab,
  affiliateProgramEnabled,
}: {
  children: ReactNode;
  accountSettings: CustomerAccountSettings;
  data: StorefrontCustomerAccountDashboardData;
  affiliateCommissionTab: AffiliateCommissionTabSettings;
  affiliateProgramEnabled: boolean;
}): JSX.Element {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [navExpanded, setNavExpanded] = useState<Record<string, boolean>>({});

  const ctvNavEntries = useMemo(
    () => buildAffiliateCtvNavEntriesFromDashboard(accountSettings, data),
    [accountSettings, data],
  );

  const liveNotifications = useCustomerNotificationsPoll(
    data.notifications,
    accountSettings.showNotifications,
    false,
    Boolean(
      data.affiliate.isActive &&
        affiliateProgramEnabled &&
        affiliateCommissionTab.realtimeBadgeEnabled &&
        affiliateCommissionTab.tabEnabled,
    ),
  );

  const toggleNavSection = (id: string) => {
    setNavExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pushMainAccount = (tab: string, sub?: string) => {
    useAccountMobileMenuStore.getState().close();
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    if (sub) sp.set("sub", sub);
    router.push(`/tai-khoan?${sp.toString()}`);
  };

  const sidebar = (
    <AffiliateCtvAccountSidebar
      entries={ctvNavEntries}
      activeTab=""
      activeAffiliateSubTab=""
      pathname={pathname}
      onSelectTab={(t) => {
        if (t === "affiliate") pushMainAccount("affiliate", "overview");
        else pushMainAccount(t);
      }}
      onSelectAffiliateSubTab={(s) => pushMainAccount("affiliate", s)}
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
    />
  );

  return (
    <div className="w-full min-w-0 max-w-none space-y-4 overflow-x-hidden bg-transparent">
      <AccountMobileMenuDrawer
        items={[]}
        customNav={
          <AffiliateCtvAccountSidebar
            dense
            entries={ctvNavEntries}
            activeTab=""
            activeAffiliateSubTab=""
            pathname={pathname}
            onSelectTab={(t) => {
              if (t === "affiliate") pushMainAccount("affiliate", "overview");
              else pushMainAccount(t);
            }}
            onSelectAffiliateSubTab={(s) => pushMainAccount("affiliate", s)}
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
        activeTab=""
        onSelectTab={() => {}}
        onOpenSupport={() => {}}
        supportUnreadTotal={0}
        onSignOut={() => {
          signOut({ callbackUrl: "/" }).catch(() => {});
        }}
      />

      <StorefrontAccountTwoColumnLayout sidebar={sidebar} contentId="tai-khoan-affiliate-subpage-content">
        {children}
      </StorefrontAccountTwoColumnLayout>
    </div>
  );
}
