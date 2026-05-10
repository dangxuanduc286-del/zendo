"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  CART_COUPON_STORAGE_KEY,
  calcSubtotal,
  type GuestCartItem,
  getUnitPrice,
  normalizeCartItem,
} from "../lib/cart";
import { computeGuestCoupon, type CouponResult } from "../lib/coupon";
import { safeParseJson } from "../lib/safe-json";

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

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const refresh = useCallback(() => {
    setItems(readCart());
  }, []);

  useEffect(() => {
    refresh();
    setCouponCode(readSavedCouponCode());

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) refresh();
    };
    const onCartUpdated = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);


    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
    };
  }, [refresh]);

  const subtotal = useMemo(() => calcSubtotal(items), [items]);
  const discount = useMemo(() => appliedCoupon?.amount ?? 0, [appliedCoupon]);
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
    setAppliedCoupon(computeGuestCoupon(couponCode, subtotal));
  }, [couponCode, subtotal]);

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
    const coupon = computeGuestCoupon(couponCode, subtotal);
    setAppliedCoupon(coupon);
    if (typeof window !== "undefined") {
      if (coupon?.code) {
        window.localStorage.setItem(CART_COUPON_STORAGE_KEY, coupon.code);
      } else {
        window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
      }
    }
    return Boolean(coupon);
  }, [couponCode, subtotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
    }
  }, []);

  return {
    items,
    subtotal,
    discount,
    total,
    totalQuantity,
    couponCode,
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
