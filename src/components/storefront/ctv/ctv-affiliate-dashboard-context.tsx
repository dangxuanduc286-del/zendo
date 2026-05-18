"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { useAffiliateAccountDashboardModel } from "@/lib/affiliate-account-dashboard-model";

export type CtvAffiliateDashboardModel = ReturnType<typeof useAffiliateAccountDashboardModel>;

const CtvAffiliateDashboardContext = createContext<CtvAffiliateDashboardModel | null>(null);

export function CtvAffiliateDashboardProvider({
  model,
  children,
}: {
  model: CtvAffiliateDashboardModel;
  children: ReactNode;
}): JSX.Element {
  return <CtvAffiliateDashboardContext.Provider value={model}>{children}</CtvAffiliateDashboardContext.Provider>;
}

export function useCtvAffiliateDashboardModel(): CtvAffiliateDashboardModel | null {
  return useContext(CtvAffiliateDashboardContext);
}
