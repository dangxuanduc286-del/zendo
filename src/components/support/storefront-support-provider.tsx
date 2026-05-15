"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { useSupportChatStore } from "@/stores/supportChatStore";

import { useStorefrontSupportDisabledOnAdminRoute } from "../../lib/use-storefront-support-disabled-on-admin";
import SupportChatPopup from "./support-chat-popup";
import StorefrontSupportUnreadBootstrap from "./storefront-support-unread-bootstrap";

export type SupportPanelContextValue = {
  open: boolean;
  /** Luôn mở panel (idempotent) — dùng cho nút Hỗ trợ topbar / mobile. */
  requestOpen: () => void;
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
  const pathname = usePathname();
  const disabledOnAdminRoute = useStorefrontSupportDisabledOnAdminRoute();
  const open = useSupportChatStore((s) => s.isOpen);
  const storeOpen = useSupportChatStore((s) => s.open);
  const storeClose = useSupportChatStore((s) => s.close);
  const storeToggle = useSupportChatStore((s) => s.toggle);

  const requestOpen = useCallback(() => {
    if (disabledOnAdminRoute) return;
    storeOpen();
  }, [disabledOnAdminRoute, storeOpen]);

  const toggle = useCallback(() => {
    if (disabledOnAdminRoute) return;
    storeToggle();
  }, [disabledOnAdminRoute, storeToggle]);

  const close = useCallback(() => {
    if (disabledOnAdminRoute) return;
    storeClose();
  }, [disabledOnAdminRoute, storeClose]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem("zendo.support.panel.open");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    useSupportChatStore.getState().close();
  }, [pathname]);

  useEffect(() => {
    if (disabledOnAdminRoute) storeClose();
  }, [disabledOnAdminRoute, storeClose]);

  const value = useMemo(
    () => ({
      open,
      requestOpen,
      toggle,
      close,
    }),
    [open, requestOpen, toggle, close],
  );

  const contextValue = useMemo(
    () =>
      disabledOnAdminRoute
        ? { open: false, requestOpen, toggle, close }
        : value,
    [disabledOnAdminRoute, value, requestOpen, toggle, close],
  );

  return (
    <SupportContext.Provider value={contextValue}>
      {children}
      {disabledOnAdminRoute ? null : (
        <>
          <StorefrontSupportUnreadBootstrap />
          <SupportChatPopup />
        </>
      )}
    </SupportContext.Provider>
  );
}
