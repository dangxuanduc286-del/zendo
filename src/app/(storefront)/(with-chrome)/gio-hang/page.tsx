import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import CartPage from "../../../../components/storefront/cart-page";
import { getStorefrontCheckoutLockState } from "../../../../lib/storefront-checkout-lock";

export const metadata: Metadata = {
  title: "Giỏ hàng | Zendo.vn",
  description: "Xem, cập nhật giỏ hàng và tiếp tục thanh toán nhanh tại Zendo.vn.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function CartRoutePage(): Promise<JSX.Element> {
  const lock = await getStorefrontCheckoutLockState();

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Giỏ hàng" },
          ]}
        />
      </div>
      <CartPage checkoutLocked={lock.locked} checkoutBlockMessage={lock.message} />
    </>
  );
}
