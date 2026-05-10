import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import CheckoutForm from "../../../../components/storefront/checkout-form";
import { getStorefrontCheckoutLockState } from "../../../../lib/storefront-checkout-lock";

export const metadata: Metadata = {
  title: "Thanh toán | Zendo.vn",
  description: "Hoàn tất thông tin giao hàng và đặt đơn tại Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage(): Promise<JSX.Element> {
  const lock = await getStorefrontCheckoutLockState();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Giỏ hàng", href: "/gio-hang" },
          { label: "Thanh toán" },
        ]}
      />
      <CheckoutForm checkoutLocked={lock.locked} checkoutBlockMessage={lock.message} />
    </main>
  );
}
