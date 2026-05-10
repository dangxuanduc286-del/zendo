"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { useSupportChatStore } from "@/stores/supportChatStore";

import { useStorefrontSupportDisabledOnAdminRoute } from "../../lib/use-storefront-support-disabled-on-admin";
import SupportChatPopup from "./support-chat-popup";

const SUPPORT_PANEL_OPEN_STORAGE_KEY = "zendo.support.panel.open";

export type SupportPanelContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const SupportContext = createContext<SupportPanelContextValue | undefined>(undefined);

export function useSupportPanel(): SupportPanelContextValue {
  const ctx = useContext(SupportContext);
  if (ctx === undefined) {
    throw new Error("useSupportPanel must be used within a StorefrontSupportProvider");
  }
  return ctx;
}

export function StorefrontSupportProvider({ children }: { children: ReactNode }): JSX.Element {
  const disabledOnAdminRoute = useStorefrontSupportDisabledOnAdminRoute();
  const open = useSupportChatStore((s) => s.isOpen);
  const storeOpen = useSupportChatStore((s) => s.open);
  const storeClose = useSupportChatStore((s) => s.close);
  const storeToggle = useSupportChatStore((s) => s.toggle);

  const toggle = useCallback(() => {
    if (disabledOnAdminRoute) return;
    storeToggle();
  }, [disabledOnAdminRoute, storeToggle]);

  const close = useCallback(() => {
    if (disabledOnAdminRoute) return;
    storeClose();
  }, [disabledOnAdminRoute, storeClose]);

  useEffect(() => {
    if (disabledOnAdminRoute) return;
    try {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(SUPPORT_PANEL_OPEN_STORAGE_KEY) === "1") storeOpen();
    } catch {
      /* ignore */
    }
  }, [disabledOnAdminRoute, storeOpen]);

  useEffect(() => {
    if (disabledOnAdminRoute) storeClose();
  }, [disabledOnAdminRoute, storeClose]);

  useEffect(() => {
    if (disabledOnAdminRoute) return;
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(SUPPORT_PANEL_OPEN_STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, disabledOnAdminRoute]);

  const value = useMemo(
    () => ({
      open,
      toggle,
      close,
    }),
    [open, toggle, close],
  );

  const contextValue = useMemo(
    () =>
      disabledOnAdminRoute
        ? { open: false, toggle, close }
        : value,
    [disabledOnAdminRoute, value, toggle, close],
  );

  return (
    <SupportContext.Provider value={contextValue}>
      {children}
      {disabledOnAdminRoute ? null : <SupportChatPopup />}
    </SupportContext.Provider>
  );
}
