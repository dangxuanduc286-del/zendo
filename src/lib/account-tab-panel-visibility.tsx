"use client";

import { createContext, useContext, type ReactNode } from "react";

/** `true` outside `AccountTabKeepAlive` (e.g. `/tai-khoan/affiliate/*` full routes). */
const AccountTabPanelVisibilityContext = createContext(true);

export function AccountTabPanelVisibilityProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <AccountTabPanelVisibilityContext.Provider value={active}>{children}</AccountTabPanelVisibilityContext.Provider>
  );
}

/** `false` when the account tab panel is keep-alive hidden (`hidden` / `inert`). */
export function useAccountTabPanelActive(): boolean {
  return useContext(AccountTabPanelVisibilityContext);
}
