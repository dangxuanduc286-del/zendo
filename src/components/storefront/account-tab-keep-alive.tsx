"use client";

import { memo, type ReactNode } from "react";

export type AccountTabKeepAliveProps = {
  tabKey: string;
  activeTab: string;
  /** When false, panel never renders. */
  enabled?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Renders tab panel only while active. Inactive tabs unmount (no hidden/inert keep-alive)
 * so dynamic client-only trees (e.g. CTV dashboards) do not leave stale DOM for React reconciliation.
 */
function AccountTabKeepAliveInner({
  tabKey,
  activeTab,
  enabled = true,
  children,
  className = "",
}: AccountTabKeepAliveProps): ReactNode {
  const isActive = activeTab === tabKey;

  if (!enabled || !isActive) return null;

  return (
    <div className={className} data-account-tab={tabKey} data-account-tab-active="1">
      {children}
    </div>
  );
}

export const AccountTabKeepAlive = memo(AccountTabKeepAliveInner);
