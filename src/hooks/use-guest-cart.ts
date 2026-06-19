"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  CART_COUPON_STORAGE_KEY,
  CART_COUPON_SOURCE_STORAGE_KEY,
  calcSubtotal,
  type GuestCartItem,
  getUnitPrice,
  normalizeCartItem,
} from "../lib/cart";
import { computeGuestCoupon, findBestGuestCoupon, type CouponResult } from "../lib/coupon";
import { safeParseJson } from "../lib/safe-json";
import { useStorefrontCoupons } from "./use-storefront-coupons";

function readCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];

  const parsed = safeParseJson<unknown[]>(raw, [], "use-guest-cart:local-storage");
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCartItem).filter((item): item is GuestCartItem => Boolean(item));
}

function writeCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

function readSavedCouponCode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CART_COUPON_STORAGE_KEY) ?? "";
}

type CouponSource = "" | "auto" | "manual";

function readSavedCouponSource(): CouponSource {
  if (typeof window === "undefined") return "";
  const source = window.localStorage.getItem(CART_COUPON_SOURCE_STORAGE_KEY);
  return source === "auto" || source === "manual" ? source : "";
}

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [couponCode, setCouponCodeState] = useState("");
  const [couponSource, setCouponSource] = useState<CouponSource>("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const coupons = useStorefrontCoupons();

  const refresh = useCallback(() => {
    setItems(readCart());
  }, []);

  const refreshCoupon = useCallback(() => {
    setCouponCodeState(readSavedCouponCode());
    setCouponSource(readSavedCouponSource());
  }, []);

  useEffect(() => {
    refresh();
    refreshCoupon();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) refresh();
      if (event.key === CART_COUPON_STORAGE_KEY || event.key === CART_COUPON_SOURCE_STORAGE_KEY) refreshCoupon();
    };
    const onCartUpdated = () => {
      refresh();
      refreshCoupon();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);


    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
    };
  }, [refresh, refreshCoupon]);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(
    () => (appliedCoupon?.type === "FREE_SHIPPING" ? 0 : appliedCoupon?.amount ?? 0),
    [appliedCoupon],
  );
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(computeGuestCoupon(couponCode, subtotal, coupons));
  }, [couponCode, coupons, subtotal]);

  useEffect(() => {
    if (subtotal <= 0 || couponSource === "manual" || coupons.length === 0) return;
    const bestCoupon = findBestGuestCoupon(subtotal, coupons);
    const currentCoupon = couponCode.trim() ? computeGuestCoupon(couponCode, subtotal, coupons) : null;
    if (!bestCoupon) return;
    if (currentCoupon?.code === bestCoupon.code && currentCoupon.amount === bestCoupon.amount) {
      setAppliedCoupon(bestCoupon);
      return;
    }
    setCouponCodeState(bestCoupon.code);
    setCouponSource("auto");
    setAppliedCoupon(bestCoupon);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_COUPON_STORAGE_KEY, bestCoupon.code);
      window.localStorage.setItem(CART_COUPON_SOURCE_STORAGE_KEY, "auto");
    }
  }, [couponCode, couponSource, coupons, subtotal]);

  const setCouponCode = useCallback((nextCouponCode: string) => {
    setCouponCodeState(nextCouponCode);
    setCouponSource("manual");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_COUPON_SOURCE_STORAGE_KEY, "manual");
    }
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    const next = readCart().map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: Math.max(1, Math.floor(quantity)),
          }
        : item,
    );
    writeCart(next);
    setItems(next);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    const next = readCart().filter((item) => item.id !== itemId);
    writeCart(next);
    setItems(next);
  }, []);

  const clearCart = useCallback(() => {
    writeCart([]);
    setItems([]);
  }, []);

  const applyCoupon = useCallback(() => {
    const coupon = computeGuestCoupon(couponCode, subtotal, coupons);
    setAppliedCoupon(coupon);
    setCouponSource("manual");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_COUPON_SOURCE_STORAGE_KEY, "manual");
      if (coupon?.code) {
        window.localStorage.setItem(CART_COUPON_STORAGE_KEY, coupon.code);
      } else {
        window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
      }
    }
    return Boolean(coupon);
  }, [couponCode, coupons, subtotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCodeState("");
    setCouponSource("manual");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
      window.localStorage.setItem(CART_COUPON_SOURCE_STORAGE_KEY, "manual");
    }
  }, []);

  return {
    items,
    subtotal,
    discount,
    total,
    totalQuantity,
    couponCode,
    couponSource,
    setCouponCode,
    appliedCoupon,
    setQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    getUnitPrice,
  };
}
