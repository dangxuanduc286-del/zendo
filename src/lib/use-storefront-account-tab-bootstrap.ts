"use client";

import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";
import {
  buildTaiKhoanTabHref,
  consumeAccountLoginOverviewEntry,
  isCtvAffiliateAccount,
  persistAccountTab,
  resetAccountOverviewScroll,
  resolveBuyerAccountTab,
  resolveCtvAccountTab,
} from "./account-tab-navigation";

const ACCOUNT_URL_CHANGE_EVENT = "zendo:account-url-change";

function replaceAccountUrlClientSide(href: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", href);
  window.dispatchEvent(new Event(ACCOUNT_URL_CHANGE_EVENT));
}

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
        replaceAccountUrlClientSide(href);
      }

      if (tab === "overview") {
        resetAccountOverviewScroll();
      }
    },
    [accountTabKeys, affiliateSubTabKeys, allowedTabs, isCtv, setActiveSubTab, setActiveTab],
  );

  useEffect(() => {
    const firstRun = !bootstrappedRef.current;
    const forceLogin = firstRun && isCtv && consumeAccountLoginOverviewEntry();
    bootstrappedRef.current = true;
    syncStateFromSearchParams(searchParams, {
      forceLoginOverview: forceLogin,
      canonicalize: firstRun,
    });
  }, [isCtv, searchParams, syncStateFromSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromLocation = () => {
      syncStateFromSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener(ACCOUNT_URL_CHANGE_EVENT, syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener(ACCOUNT_URL_CHANGE_EVENT, syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [syncStateFromSearchParams]);

  const onSelectTab = useCallback(
    (tab: TTab, sub?: TSub) => {
      startTransition(() => {
        setActiveTab(tab);
        if (sub && affiliateSubTabKeys.has(sub)) {
          setActiveSubTab(sub);
        }
        if (!isCtv) {
          persistAccountTab(tab);
        }
        if (isCtv) {
          const subForHref = tab === "affiliate" && sub ? sub : undefined;
          replaceAccountUrlClientSide(buildTaiKhoanTabHref(tab, subForHref));
        }
      });
    },
    [affiliateSubTabKeys, isCtv, setActiveSubTab, setActiveTab],
  );

  return { onSelectTab };
}
