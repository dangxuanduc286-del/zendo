"use client";

import { useAccountTabPanelActive } from "@/lib/account-tab-panel-visibility";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";

/**
 * Affiliate/CTV may fetch/poll/SSE only when the browser tab is visible and the
 * account keep-alive panel (if any) is the active tab.
 */
export function useAffiliateCtvRuntimeActive(): boolean {
  const docVisible = useDocumentVisibility();
  const panelActive = useAccountTabPanelActive();
  return docVisible && panelActive;
}
