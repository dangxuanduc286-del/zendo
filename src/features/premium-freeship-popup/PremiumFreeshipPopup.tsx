"use client";

import { useEffect } from "react";
import { setGlobalOverlayOpen } from "../../lib/ui-state";
import { PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG } from "./constants/premium-freeship-popup";
import { PremiumFreeshipPopupView } from "./components/PremiumFreeshipPopupView";
import { usePremiumFreeshipPopup } from "./hooks/use-premium-freeship-popup";
import type { PremiumFreeshipPopupConfig } from "./types/premium-freeship-popup";

export default function PremiumFreeshipPopup({ config = PREMIUM_FREESHIP_POPUP_DEFAULT_CONFIG }: { config?: PremiumFreeshipPopupConfig }): JSX.Element | null {
  const popup = usePremiumFreeshipPopup(config);

  useEffect(() => {
    setGlobalOverlayOpen(Boolean(config.enabled && popup.open));
    return () => setGlobalOverlayOpen(false);
  }, [config.enabled, popup.open]);

  useEffect(() => {
    if (!config.enabled || !popup.open) return;

    return () => {
      // No scroll lock is applied here; the popup should not affect document scrolling.
    };
  }, [config.enabled, popup.open]);

  if (!config.enabled || !popup.open) return null;

  return <PremiumFreeshipPopupView config={config} onAccept={popup.accept} onClose={popup.close} />;
}
