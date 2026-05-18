"use client";

import dynamic from "next/dynamic";
import { CheckoutRouteLoading } from "./checkout-route-loading";

const CheckoutForm = dynamic(() => import("./checkout-form"), {
  loading: () => <CheckoutRouteLoading />,
});

export default function CheckoutFormClient(
  props: {
    checkoutLocked?: boolean;
    checkoutBlockMessage?: string;
  } = {},
): JSX.Element {
  return <CheckoutForm {...props} />;
}
