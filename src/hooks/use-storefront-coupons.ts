"use client";

import { useEffect, useState } from "react";
import type { GuestCouponOption } from "../lib/coupon";

export function useStorefrontCoupons(): GuestCouponOption[] {
  const [coupons, setCoupons] = useState<GuestCouponOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCoupons = async () => {
      try {
        const response = await fetch("/api/storefront/coupons", { cache: "no-store" });
        const payload = (await response.json()) as { items?: GuestCouponOption[] };
        if (!cancelled) {
          setCoupons(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch {
        if (!cancelled) setCoupons([]);
      }
    };

    loadCoupons();

    return () => {
      cancelled = true;
    };
  }, []);

  return coupons;
}
