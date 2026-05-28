"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { AffiliateCommissionTabSettings } from "@/lib/affiliate-commission-tab-settings";
import type { CustomerAccountSettings } from "@/lib/settings";
import type { AffiliateLayoutChromeData } from "@/lib/server/affiliate-layout-chrome-data";
import { buildAffiliateCtvNavEntriesFromDashboard } from "@/lib/storefront-affiliate-ctv-nav-build";
import { useCustomerNotificationsPoll } from "@/lib/use-customer-notifications-poll";
import { useAccountMobileMenuStore } from "@/stores/accountMobileMenuStore";
import AccountMobileMenuDrawer from "./account-mobile-menu-drawer";
import { AffiliateCommissionUnlockBanner } from "./affiliate/affiliate-commission-unlock-banner";
import { AffiliateCtvAccountSidebar } from "./affiliate-ctv-account-sidebar";
import { AccountPageMainChrome } from "./account-page-main-chrome";

/**
 * Sidebar + vùng nội dung cho các route `/tai-khoan/affiliate/*` (analytics, campaign, …).
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
  data: AffiliateLayoutChromeData;
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

  const commissionNotifyUiEnabled = Boolean(
    data.affiliate.isActive && affiliateProgramEnabled && affiliateCommissionTab.tabEnabled,
  );

  const [liveNotifications] = useCustomerNotificationsPoll(
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
      layout="desktop"
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
      showCommissionBadge={commissionNotifyUiEnabled}
      onSignOut={() => {
        signOut({ callbackUrl: "/" }).catch(() => {});
      }}
    />
  );

  const drawer = (
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
          showCommissionBadge={commissionNotifyUiEnabled}
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
  );

  const topSlot = commissionNotifyUiEnabled ? (
    <AffiliateCommissionUnlockBanner notifications={liveNotifications} enabled={commissionNotifyUiEnabled} />
  ) : null;

  return (
    <AccountPageMainChrome
      contentId="tai-khoan-affiliate-subpage-content"
      sidebar={sidebar}
      drawer={drawer}
      topSlot={topSlot}
    >
      {children}
    </AccountPageMainChrome>
  );
}
