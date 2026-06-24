"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import { AccountTabPanelVisibilityProvider } from "@/lib/account-tab-panel-visibility";
import { isAccountTabDebug, logAccountTabDebug } from "@/lib/account-tab-navigation";

export type AccountTabKeepAliveProps = {
  tabKey: string;
  activeTab: string;
  /** When false, panel never renders. */
  enabled?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Keep-alive tab panel: mount on first visit, then hide inactive tabs (no unmount).
 * Preserves React state and client-fetched data when switching account tabs.
 */
function AccountTabKeepAliveInner({
  tabKey,
  activeTab,
  enabled = true,
  children,
  className = "",
}: AccountTabKeepAliveProps): ReactNode {
  const isActive = activeTab === tabKey;
  const [hasMounted, setHasMounted] = useState(isActive);

  useEffect(() => {
    if (isActive) setHasMounted(true);
  }, [isActive]);

  if (isAccountTabDebug()) {
    logAccountTabDebug("keepAlive.render", {
      tabKey,
      activeTab,
      isActive,
      hasMounted,
      enabled,
    });
  }

  if (!enabled) return null;
  if (!hasMounted) return null;

  return (
    <div
      className={className}
      hidden={!isActive}
      inert={!isActive}
      aria-hidden={!isActive}
      data-account-tab={tabKey}
      data-account-tab-key={tabKey}
      data-account-active-tab={activeTab}
      {...(isActive ? { "data-account-tab-active": "1" as const } : {})}
    >
      <AccountTabPanelVisibilityProvider active={isActive}>{children}</AccountTabPanelVisibilityProvider>
    </div>
  );
}

export const AccountTabKeepAlive = memo(AccountTabKeepAliveInner);
