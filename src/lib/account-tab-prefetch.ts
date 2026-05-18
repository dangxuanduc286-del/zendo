/** Prefetch heavy account-tab chunks after idle / on nav hover. */

const prefetched = new Set<string>();

function prefetchOnce(key: string, loader: () => Promise<unknown>): void {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  void loader();
}

export function prefetchStorefrontAccountTab(tab: string): void {
  if (typeof window === "undefined") return;

  switch (tab) {
    case "notifications":
      prefetchOnce("notifications", () => import("../components/storefront/account-notifications-section"));
      break;
    case "purchaseHistory":
      prefetchOnce("purchaseHistory", () => import("../components/storefront/purchase-history-panel"));
      break;
    case "policyHub":
      prefetchOnce("policyHub", () => import("../components/storefront/account-policy-hub-panel"));
      break;
    case "affiliate":
      prefetchOnce("affiliate-dashboard", () =>
        import("../components/storefront/affiliate/affiliate-account-dashboard-tab"),
      );
      prefetchOnce("ctv-overview", () => import("../components/storefront/ctv/ctv-overview-dashboard"));
      prefetchOnce("ctv-workspace", () =>
        import("../components/storefront/ctv/ctv-affiliate-workspace-desktop"),
      );
      break;
    case "overview":
      prefetchOnce("ctv-overview", () => import("../components/storefront/ctv/ctv-overview-dashboard"));
      break;
    case "security":
      prefetchOnce("change-password", () => import("../components/auth/change-password-form"));
      break;
    default:
      break;
  }
}

export function prefetchStorefrontAccountTabsIdle(tabs: readonly string[]): void {
  if (typeof window === "undefined" || !tabs.length) return;

  const run = (): void => {
    for (const tab of tabs) prefetchStorefrontAccountTab(tab);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    globalThis.setTimeout(run, 1200);
  }
}
