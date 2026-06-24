"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  buildTaiKhoanTabHref,
  consumeAccountLoginOverviewEntry,
  isCtvAffiliateAccount,
  logAccountTabDebug,
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
 *
 * PERF (audit 2026-06-24):
 * Trước đây hook dùng `router.replace()` từ `next/navigation` để cập nhật `?tab=`.
 * Next.js 15 App Router coi searchParams change là navigation → gửi RSC request
 * `GET /tai-khoan?tab=...` → server chạy lại `page.tsx` → `getStorefrontCustomerAccountDashboardData`
 * (DB query nặng 3–5s) → client chờ 3–5s mỗi lần click tab.
 *
 * Fix: dùng `window.history.replaceState()` để cập nhật URL **không trigger RSC fetch**.
 * - Click tab: `setActiveTab` + `history.replaceState` → render <100ms, không RSC.
 * - Back/Forward: `popstate` listener sync state từ `window.location.search`.
 * - URL `?tab=` vẫn đồng bộ.
 * - Không phá business logic / API / DB / Affiliate / Voucher / Order History.
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

  const isCtv = isCtvAffiliateAccount(affiliateActive);
  const bootstrappedRef = useRef(false);

  const syncStateFromUrl = useCallback(
    (options?: { forceLoginOverview?: boolean }) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const urlTab = (params.get("tab") ?? "").trim();
      const urlSub = (params.get("sub") ?? "").trim();
      const resolved = isCtv
        ? resolveCtvAccountTab(urlTab, urlSub, {
            forceLoginOverview: options?.forceLoginOverview,
          })
        : { tab: resolveBuyerAccountTab(urlTab, allowedTabs) };

      const tab = resolved.tab;
      logAccountTabDebug("syncFromUrl", {
        urlTab,
        urlSub,
        resolvedTab: tab,
        resolvedSub: resolved.sub,
        forceLoginOverview: options?.forceLoginOverview,
      });
      if (accountTabKeys.has(tab as TTab)) {
        setActiveTab(tab as TTab);
      }
      if (resolved.sub && affiliateSubTabKeys.has(resolved.sub as TSub)) {
        setActiveSubTab(resolved.sub as TSub);
      } else if (tab !== "affiliate" && affiliateSubTabKeys.has("overview" as TSub)) {
        setActiveSubTab("overview" as TSub);
      }

      if (tab === "overview") {
        resetAccountOverviewScroll();
      }

      return { tab, sub: resolved.sub };
    },
    [accountTabKeys, affiliateSubTabKeys, allowedTabs, isCtv, setActiveSubTab, setActiveTab],
  );

  // Bootstrap: chạy 1 lần khi mount để đảm bảo state khớp URL (SSR + client).
  useEffect(() => {
    const firstRun = !bootstrappedRef.current;
    const forceLogin = firstRun && isCtv && consumeAccountLoginOverviewEntry();
    bootstrappedRef.current = true;

    const result = syncStateFromUrl({ forceLoginOverview: forceLogin });

    // Canonicalize URL nếu cần (CTV): đảm bảo `?tab=` khớp tab đã resolve.
    if (isCtv && typeof window !== "undefined" && result) {
      const params = new URLSearchParams(window.location.search);
      const urlTab = (params.get("tab") ?? "").trim();
      const urlSub = (params.get("sub") ?? "").trim();
      const wantSub = result.sub ?? "";
      const href = buildTaiKhoanTabHref(result.tab, wantSub || undefined);
      const needsReplace =
        urlTab !== result.tab ||
        (result.tab === "affiliate" && urlSub !== wantSub) ||
        (!urlTab && result.tab === "overview");
      if (needsReplace) {
        window.history.replaceState({}, "", href);
        logAccountTabDebug("bootstrap.canonicalize", { href });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back/Forward browser: popstate listener sync state từ URL mới.
  // Next.js App Router cũng listen popstate và sẽ fetch RSC — không thể prevent
  // hoàn toàn, nhưng state đã được sync tức thời qua handler này nên UI phản hồi
  // ngay; RSC fetch chỉ refresh data (thường dùng cache nên nhanh hơn click tab).
  useEffect(() => {
    const onPopState = () => {
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      logAccountTabDebug("popstate.start", { url: window.location.href, t0 });
      syncStateFromUrl();
      const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
      logAccountTabDebug("popstate.syncDone", { syncMs: t1 - t0 });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncStateFromUrl]);

  /**
   * Click tab: cập nhật state + URL qua `history.replaceState`.
   * KHÔNG dùng `router.replace` để tránh RSC fetch 3–5s.
   * `replaceState` không thêm history entry → không phá Back/Forward của các
   * trang trước/sau tài khoản. Back/Forward giữa các tab tài khoản không tạo
   * entry mới (giống behavior cũ với `router.replace`).
   */
  const onSelectTab = useCallback(
    (tab: TTab, sub?: TSub) => {
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      logAccountTabDebug("onSelectTab.start", { nextTab: tab, sub, isCtv, t0 });

      // 1. Cập nhật state tức thời → React re-render chỉ KeepAlive panels (<100ms).
      setActiveTab(tab);
      if (tab !== "affiliate" && affiliateSubTabKeys.has("overview" as TSub)) {
        setActiveSubTab("overview" as TSub);
      } else if (sub && affiliateSubTabKeys.has(sub)) {
        setActiveSubTab(sub);
      }

      // 2. Cập nhật URL qua history API (không trigger Next.js navigation / RSC fetch).
      if (typeof window !== "undefined") {
        const subForHref = tab === "affiliate" && sub ? sub : undefined;
        const href = buildTaiKhoanTabHref(tab, subForHref);
        const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
        window.history.replaceState({}, "", href);
        const t2 = typeof performance !== "undefined" ? performance.now() : Date.now();
        logAccountTabDebug("onSelectTab.historyReplace", {
          href,
          historyMs: t2 - t1,
        });
      }

      // 3. Reset scroll cho tab Tổng quan.
      if (tab === "overview") {
        resetAccountOverviewScroll();
      }

      // 4. Measure render-complete time (debug only).
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          const t3 = typeof performance !== "undefined" ? performance.now() : Date.now();
          logAccountTabDebug("onSelectTab.renderComplete", { totalMs: t3 - t0 });
        });
      }
    },
    [affiliateSubTabKeys, setActiveSubTab, setActiveTab, isCtv],
  );

  return { onSelectTab };
}
