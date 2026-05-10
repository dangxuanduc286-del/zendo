"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  type GuestCartItem,
  normalizeCartItem,
} from "../../lib/cart";
import { safeParseJson } from "../../lib/safe-json";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";

interface BuyNowButtonProps {
  item: Omit<GuestCartItem, "quantity">;
  className?: string;
  label?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}

function readCartItems(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown[]>(raw, [], "buy-now:local-storage");
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCartItem).filter((it): it is GuestCartItem => Boolean(it));
}

export default function BuyNowButton({
  item,
  className,
  label = "Mua ngay",
  ariaLabel,
  style,
}: BuyNowButtonProps): JSX.Element {
  const router = useRouter();

  const onBuyNow = () => {
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
      eventName: "begin_checkout",
      pathname: "/thanh-toan",
      productId: item.productId,
      metadata: { source: "buy_now_button" },
    }).catch(() => {});
    router.push("/thanh-toan");
  };

  return (
    <button
      data-buy-now-product-id={item.productId}
      type="button"
      onClick={onBuyNow}
      className={className}
      style={style}
      aria-label={ariaLabel ?? `Mua ngay ${item.name}`}
    >
      {label}
    </button>
  );
}
