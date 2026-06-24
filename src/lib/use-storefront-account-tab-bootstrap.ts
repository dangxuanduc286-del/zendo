"use client";

import type { Dispatch, SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";
import {
  buildTaiKhoanTabHref,
  consumeAccountLoginOverviewEntry,
  isCtvAffiliateAccount,
  resetAccountOverviewScroll,
  resolveBuyerAccountTab,
  resolveCtvAccountTab,
} from "./account-tab-navigation";

type BootstrapArgs<TTab extends string, TSub extends string> = {
  affiliateActive: boolean;
  initialAccountTab?: string;
  initialAffiliateSubTab?: string;
  allowedTabs: readonly string[];
  accountTabKeys: ReadonlySet<TTab>;
  affiliateSubTabKeys: ReadonlySet<TSub>;
  setActiveTab: Dispatch<SetStateAction<TTab>>;
  setActiveSubTab: Dispatch<SetStateAction<TSub>>;
};

export function resolveStorefrontAccountTabInitial<TTab extends string>(
  affiliateActive: boolean,
  initialAccountTab: string | undefined,
  initialAffiliateSubTab: string | undefined,
  allowedTabs: readonly string[],
  accountTabKeys: ReadonlySet<TTab>,
): TTab {
  const isCtv = isCtvAffiliateAccount(affiliateActive);

  const resolved = isCtv
    ? resolveCtvAccountTab(initialAccountTab ?? "", initialAffiliateSubTab ?? "")
    : { tab: resolveBuyerAccountTab(initialAccountTab ?? "", allowedTabs) };

  const tab = resolved.tab;
  if (accountTabKeys.has(tab as TTab)) {
    return tab as TTab;
  }
  return (allowedTabs.includes("overview") ? "overview" : allowedTabs[0] ?? "overview") as TTab;
}

/**
 * URL `?tab=` (và `?sub=` cho CTV) là single source of truth cho tab hiện tại.
 * `activeTab`/`activeSubTab` state chỉ là mirror của URL để render tức thời.
 */
export function useStorefrontAccountTabBootstrap<TTab extends string, TSub extends string>(
  args: BootstrapArgs<TTab, TSub>,
): { onSelectTab: (tab: TTab, sub?: TSub) => void } {
  const {
    affiliateActive,
    allowedTabs,
    accountTabKeys,
    affiliateSubTabKeys,
    setActiveTab,
    setActiveSubTab,
  } = args;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bootstrappedRef = useRef(false);
  const isCtv = isCtvAffiliateAccount(affiliateActive);

  const syncStateFromSearchParams = useCallback(
    (
      params: Pick<URLSearchParams, "get">,
      options?: { forceLoginOverview?: boolean; canonicalize?: boolean },
    ) => {
      const urlTab = (params.get("tab") ?? "").trim();
      const urlSub = (params.get("sub") ?? "").trim();
      const resolved = isCtv
        ? resolveCtvAccountTab(urlTab, urlSub, {
            forceLoginOverview: options?.forceLoginOverview,
          })
        : { tab: resolveBuyerAccountTab(urlTab, allowedTabs) };

      const tab = resolved.tab;
      if (accountTabKeys.has(tab as TTab)) {
        setActiveTab(tab as TTab);
      }
      if (resolved.sub && affiliateSubTabKeys.has(resolved.sub as TSub)) {
        setActiveSubTab(resolved.sub as TSub);
      } else if (tab !== "affiliate" && affiliateSubTabKeys.has("overview" as TSub)) {
        setActiveSubTab("overview" as TSub);
      }

      if (!isCtv || !options?.canonicalize) return;

      const wantSub = resolved.sub ?? "";
      const href = buildTaiKhoanTabHref(tab, wantSub || undefined);
      const needsReplace =
        urlTab !== tab || (tab === "affiliate" && urlSub !== wantSub) || (!urlTab && tab === "overview");

      if (needsReplace) {
        router.replace(href, { scroll: false });
      }

      if (tab === "overview") {
        resetAccountOverviewScroll();
      }
    },
    [accountTabKeys, affiliateSubTabKeys, allowedTabs, isCtv, router, setActiveSubTab, setActiveTab],
  );

  // Giữ ref tới syncStateFromSearchParams để effect chỉ chạy khi searchParams/pathname
  // thay đổi, không chạy khi identity của syncStateFromSearchParams thay đổi.
  const syncStateRef = useRef(syncStateFromSearchParams);
  useEffect(() => {
    syncStateRef.current = syncStateFromSearchParams;
  }, [syncStateFromSearchParams]);

  useEffect(() => {
    const firstRun = !bootstrappedRef.current;
    const forceLogin = firstRun && isCtv && consumeAccountLoginOverviewEntry();
    bootstrappedRef.current = true;
    syncStateRef.current(searchParams, {
      forceLoginOverview: forceLogin,
      canonicalize: firstRun,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCtv, pathname, searchParams]);

  const onSelectTab = useCallback(
    (tab: TTab, sub?: TSub) => {
      startTransition(() => {
        setActiveTab(tab);
        if (tab !== "affiliate" && affiliateSubTabKeys.has("overview" as TSub)) {
          setActiveSubTab("overview" as TSub);
        } else if (sub && affiliateSubTabKeys.has(sub)) {
          setActiveSubTab(sub);
        }
        const subForHref = tab === "affiliate" && sub ? sub : undefined;
        router.replace(buildTaiKhoanTabHref(tab, subForHref), { scroll: false });
      });
    },
    [affiliateSubTabKeys, router, setActiveSubTab, setActiveTab],
  );

  return { onSelectTab };
}
