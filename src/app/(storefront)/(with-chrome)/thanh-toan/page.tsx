import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import CheckoutFormClient from "../../../../components/storefront/checkout-form-client";
import { authOptions } from "../../../../lib/auth";
import { getStorefrontCheckoutLockState } from "../../../../lib/storefront-checkout-lock";
import { getWebsiteSettings } from "../../../../lib/settings";
import { buildShippingPromotionConfig } from "../../../../lib/shipping";

export const metadata: Metadata = {
  title: "Thanh toán | Zendo.vn",
  description: "Hoàn tất thông tin giao hàng và đặt đơn tại Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage(): Promise<JSX.Element> {
  const [lock, settings, session] = await Promise.all([
    getStorefrontCheckoutLockState(),
    getWebsiteSettings(),
    getServerSession(authOptions),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Giỏ hàng", href: "/gio-hang" },
          { label: "Thanh toán" },
        ]}
      />
      <CheckoutFormClient
        checkoutLocked={lock.locked}
        checkoutBlockMessage={lock.message}
        shippingPromotionConfig={buildShippingPromotionConfig(settings)}
        isAuthenticated={Boolean(session?.user?.id)}
      />
    </main>
  );
}
