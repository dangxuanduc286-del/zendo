"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  type GuestCartItem,
  normalizeCartItem,
} from "../../lib/cart";
import { safeParseJson } from "../../lib/safe-json";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";

interface ProductCardActionsProps {
  item: Omit<GuestCartItem, "quantity">;
  addToCartClassName: string;
  buyNowClassName: string;
  addToCartLabel?: string;
  buyNowLabel?: string;
  addToCartAriaLabel?: string;
  buyNowAriaLabel?: string;
  buyNowStyle?: CSSProperties;
  disabled?: boolean;
}

function readCartItems(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown[]>(raw, [], "product-card-actions:local-storage");
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCartItem).filter((it): it is GuestCartItem => Boolean(it));
}

function upsertCartItem(item: Omit<GuestCartItem, "quantity">): { cart: GuestCartItem[]; quantity: number } {
  const cart = readCartItems();
  const index = cart.findIndex((existing) => existing.id === item.id);

  if (index >= 0) {
    cart[index] = {
      ...cart[index],
      quantity: cart[index].quantity + 1,
    };
    return { cart, quantity: cart[index].quantity };
  }

  cart.push({
    ...item,
    quantity: 1,
  });
  return { cart, quantity: 1 };
}

export default function ProductCardActions({
  item,
  addToCartClassName,
  buyNowClassName,
  addToCartLabel = "",
  buyNowLabel = "Mua ngay",
  addToCartAriaLabel,
  buyNowAriaLabel,
  buyNowStyle,
  disabled = false,
}: ProductCardActionsProps): JSX.Element {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const iconOnly = !String(addToCartLabel ?? "").trim();

  const addToCart = () => {
    if (disabled) return;
    const { cart, quantity } = upsertCartItem(item);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    guiSuKienAnalyticsClient({
      eventName: "add_to_cart",
      pathname: window.location.pathname,
      productId: item.productId,
      metadata: { quantity },
    }).catch(() => {});
    setAdded(true);
  };

  const buyNow = () => {
    if (disabled) return;
    const { cart } = upsertCartItem(item);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    guiSuKienAnalyticsClient({
      eventName: "begin_checkout",
      pathname: "/thanh-toan",
      productId: item.productId,
      metadata: { source: "buy_now_button" },
    }).catch(() => {});
    router.push("/thanh-toan");
  };

  return (
    <>
      <button
        data-add-to-cart-product-id={item.productId}
        type="button"
        onClick={addToCart}
        disabled={disabled}
        className={addToCartClassName}
        aria-label={disabled ? `${item.name} hết hàng` : (addToCartAriaLabel ?? `Thêm ${item.name} vào giỏ hàng`)}
        aria-disabled={disabled}
      >
        <span className={`inline-flex min-w-0 items-center justify-center ${iconOnly ? "" : "gap-1.5 sm:gap-2"}`}>
          {!added ? (
            <>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={iconOnly ? "h-5 w-5 shrink-0 sm:h-5 sm:w-5" : "h-4 w-4 shrink-0"}
              >
                <path
                  d="M3 4h2l2.2 9.1a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <circle cx="10" cy="19" r="1.5" fill="currentColor" />
                <circle cx="18" cy="19" r="1.5" fill="currentColor" />
              </svg>
              {!iconOnly ? <span className="whitespace-nowrap">{addToCartLabel}</span> : null}
            </>
          ) : iconOnly ? (
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 text-emerald-600">
              <path
                d="M20 6 9 17l-5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="whitespace-nowrap">Đã thêm</span>
          )}
        </span>
      </button>
      <button
        data-buy-now-product-id={item.productId}
        type="button"
        onClick={buyNow}
        disabled={disabled}
        className={buyNowClassName}
        style={buyNowStyle}
        aria-label={disabled ? `${item.name} hết hàng` : (buyNowAriaLabel ?? `Mua ngay ${item.name}`)}
        aria-disabled={disabled}
      >
        {buyNowLabel}
      </button>
    </>
  );
}
