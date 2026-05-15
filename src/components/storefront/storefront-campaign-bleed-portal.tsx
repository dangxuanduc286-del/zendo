"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Nền chiến dịch full viewport qua portal ra `document.body`,
 * tránh containing block từ SessionProvider / layout / transform.
 * Ảnh từ biến CSS trên `<html>` (storefront root layout).
 */
export function StorefrontCampaignBleedPortal(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="storefront-campaign-bleed-root">
      <div className="storefront-campaign-bleed-desktop" aria-hidden />
      <div className="storefront-campaign-bleed-mobile" aria-hidden />
    </div>,
    document.body,
  );
}
