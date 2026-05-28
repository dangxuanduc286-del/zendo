"use client";

import dynamic from "next/dynamic";
import { CheckoutRouteLoading } from "./checkout-route-loading";
import type { ShippingPromotionConfig } from "../../lib/shipping";

const CheckoutForm = dynamic(() => import("./checkout-form"), {
  loading: () => <CheckoutRouteLoading />,
});

export default function CheckoutFormClient(
  props: {
    checkoutLocked?: boolean;
    checkoutBlockMessage?: string;
    shippingPromotionConfig?: ShippingPromotionConfig;
    isAuthenticated?: boolean;
  } = {},
): JSX.Element {
  return <CheckoutForm {...props} />;
}
