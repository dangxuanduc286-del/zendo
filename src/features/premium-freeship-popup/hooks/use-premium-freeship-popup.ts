"use client";

import { useEffect, useMemo, useState } from "react";
import { getPremiumFreeshipPopupLastSeen, setPremiumFreeshipPopupLastSeen } from "../storage/premium-freeship-popup-storage";
import type { PremiumFreeshipPopupConfig } from "../types/premium-freeship-popup";

export function usePremiumFreeshipPopup(config: PremiumFreeshipPopupConfig) {
  const [open, setOpen] = useState(false);

  const safeDelay = useMemo(
    () => Math.max(0, Math.min(30000, Number.isFinite(config.delayMs) ? config.delayMs : config.delaySeconds * 1000)),
    [config.delayMs, config.delaySeconds],
  );
  const safeRepeatHours = useMemo(() => Math.max(1, Math.min(168, Number.isFinite(config.repeatHours) ? config.repeatHours : 12)), [config.repeatHours]);

  useEffect(() => {
    if (!config.enabled) return;
    const lastSeen = getPremiumFreeshipPopupLastSeen();
    if (lastSeen) {
      const elapsed = Date.now() - lastSeen;
      if (elapsed < safeRepeatHours * 60 * 60 * 1000) return;
    }
    const timer = window.setTimeout(() => setOpen(true), safeDelay);
    return () => window.clearTimeout(timer);
  }, [config.enabled, safeDelay, safeRepeatHours]);

  const close = () => {
    setPremiumFreeshipPopupLastSeen(Date.now());
    setOpen(false);
  };

  const accept = () => {
    setPremiumFreeshipPopupLastSeen(Date.now());
    setOpen(false);
  };

  return { open, close, accept };
}
