"use client";

import { memo, useEffect, useState, type ReactNode } from "react";

export type AccountTabKeepAliveProps = {
  tabKey: string;
  activeTab: string;
  /** When false, panel never mounts until enabled becomes true while active. */
  enabled?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Mount tab content on first visit, then hide with CSS instead of unmounting.
 * Preserves scroll, form state, and avoids re-fetch / dynamic import on revisit.
 */
function AccountTabKeepAliveInner({
  tabKey,
  activeTab,
  enabled = true,
  children,
  className = "",
}: AccountTabKeepAliveProps): ReactNode {
  const isActive = activeTab === tabKey;
  const [mounted, setMounted] = useState(() => enabled && isActive);

  useEffect(() => {
    if (!enabled) return;
    if (isActive) setMounted(true);
  }, [enabled, isActive]);

  if (!enabled || !mounted) return null;

  return (
    <div
      className={[className, !isActive ? "hidden" : ""].filter(Boolean).join(" ")}
      hidden={!isActive}
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
      data-account-tab={tabKey}
      data-account-tab-active={isActive ? "1" : "0"}
    >
      {children}
    </div>
  );
}

export const AccountTabKeepAlive = memo(AccountTabKeepAliveInner);
