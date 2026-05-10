"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  type GuestCartItem,
  normalizeCartItem,
} from "../../lib/cart";
import { safeParseJson } from "../../lib/safe-json";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";

interface AddToCartButtonProps {
  item: Omit<GuestCartItem, "quantity">;
  className?: string;
  label?: string;
  desktopLabel?: string;
  addedLabel?: string;
  showIcon?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
}

function readCartItems(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown[]>(raw, [], "add-to-cart:local-storage");
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCartItem).filter((it): it is GuestCartItem => Boolean(it));
}

export default function AddToCartButton({
  item,
  className,
  label = "Thêm giỏ",
  desktopLabel,
  addedLabel = "Đã thêm giỏ",
  showIcon = true,
  ariaLabel,
  style,
}: AddToCartButtonProps): JSX.Element {
  const [added, setAdded] = useState(false);
  const iconOnly = Boolean(showIcon && !String(label ?? "").trim());

  const onAddToCart = () => {
    const cart = readCartItems();
    const index = cart.findIndex((existing) => existing.id === item.id);

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: cart[index].quantity + 1,
      };
    } else {
      cart.push({
        ...item,
        quantity: 1,
      });
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    guiSuKienAnalyticsClient({
      eventName: "add_to_cart",
      pathname: window.location.pathname,
      productId: item.productId,
      metadata: { quantity: index >= 0 ? cart[index].quantity : 1 },
    }).catch(() => {});
    setAdded(true);

  };

  return (
    <button
      data-add-to-cart-product-id={item.productId}
      type="button"
      onClick={onAddToCart}
      className={className}
      style={style}
      aria-label={ariaLabel ?? `Thêm ${item.name} vào giỏ hàng`}
    >
      <span
        className={`inline-flex min-w-0 items-center justify-center ${iconOnly ? "" : "gap-1.5 sm:gap-2"}`}
      >
        {!added ? (
          <>
            {showIcon ? (
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
            ) : null}
            {!iconOnly ? (
              <>
                <span className={desktopLabel ? "whitespace-nowrap sm:hidden" : "whitespace-nowrap"}>{label}</span>
                {desktopLabel ? <span className="hidden whitespace-nowrap sm:inline">{desktopLabel}</span> : null}
              </>
            ) : null}
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
          <span className="whitespace-nowrap">{addedLabel}</span>
        )}
      </span>
    </button>
  );
}
