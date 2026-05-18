"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";
import {
  buildTaiKhoanTabHref,
  consumeAccountLoginOverviewEntry,
  isCtvAffiliateAccount,
  persistAccountTab,
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
  /** Element id để scroll khi mobile chọn Tổng quan */
  overviewScrollTargetId?: string;
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
    initialAccountTab,
    initialAffiliateSubTab,
    allowedTabs,
    accountTabKeys,
    affiliateSubTabKeys,
    setActiveTab,
    setActiveSubTab,
    overviewScrollTargetId = "ctv-overview-heading",
  } = args;

  const router = useRouter();
  const searchParams = useSearchParams();
  const bootstrappedRef = useRef(false);
  const isCtv = isCtvAffiliateAccount(affiliateActive);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const forceLogin = isCtv && consumeAccountLoginOverviewEntry();
    const resolved = isCtv
      ? resolveCtvAccountTab(initialAccountTab ?? "", initialAffiliateSubTab ?? "", {
          forceLoginOverview: forceLogin,
        })
      : { tab: resolveBuyerAccountTab(initialAccountTab ?? "", allowedTabs) };

    const tab = resolved.tab;
    if (accountTabKeys.has(tab as TTab)) {
      setActiveTab(tab as TTab);
    }
    if (resolved.sub && affiliateSubTabKeys.has(resolved.sub as TSub)) {
      setActiveSubTab(resolved.sub as TSub);
    }

    if (!isCtv) return;

    const urlTab = (searchParams.get("tab") ?? "").trim();
    const urlSub = (searchParams.get("sub") ?? "").trim();
    const wantSub = resolved.sub ?? "";
    const href = buildTaiKhoanTabHref(tab, wantSub || undefined);
    const needsReplace =
      urlTab !== tab || (tab === "affiliate" && urlSub !== wantSub) || (!urlTab && tab === "overview");

    if (needsReplace) {
      router.replace(href, { scroll: false });
    }

    if (tab === "overview" && overviewScrollTargetId) {
      requestAnimationFrame(() => {
        document.getElementById(overviewScrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [
    accountTabKeys,
    affiliateSubTabKeys,
    allowedTabs,
    initialAccountTab,
    initialAffiliateSubTab,
    isCtv,
    overviewScrollTargetId,
    router,
    searchParams,
    setActiveSubTab,
    setActiveTab,
  ]);

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
          router.replace(buildTaiKhoanTabHref(tab, subForHref), { scroll: false });
        }
      });
      if (tab === "overview" && overviewScrollTargetId) {
        requestAnimationFrame(() => {
          document.getElementById(overviewScrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [affiliateSubTabKeys, isCtv, overviewScrollTargetId, router, setActiveSubTab, setActiveTab],
  );

  return { onSelectTab };
}
