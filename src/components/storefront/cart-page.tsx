"use client";

import Link from "next/link";
import MediaImage from "../shared/media-image";
import EmptyState from "./empty-state";
import { formatVnd } from "../../lib/currency";
import { useGuestCart } from "../../hooks/use-guest-cart";
import CtvPurchaseBlockedPanel from "./ctv-purchase-blocked-panel";
import { findNextVoucherMilestone } from "../../lib/coupon";
import { useStorefrontCoupons } from "../../hooks/use-storefront-coupons";
import VoucherProgressCard from "./voucher-progress-card";
import CartAddonSuggestions from "./cart-addon-suggestions";
import {
  DEFAULT_SHIPPING_PROMOTION_CONFIG,
  getNextShippingPromotionProgress,
  getShippingPromotionDiscount,
  type ShippingPromotionConfig,
} from "../../lib/shipping";
import ShippingPromotionProgressCard from "./shipping-promotion-progress";

function getCartVoucherValueLabel(code: string, coupons: ReturnType<typeof useStorefrontCoupons>): string {
  const coupon = coupons.find((item) => item.code === code.toUpperCase());
  if (!coupon) return code.toUpperCase();
  if (coupon.type === "PERCENT") return `Giảm ${coupon.value}%`;
  if (coupon.type === "FREE_SHIPPING") return `Ưu đãi vận chuyển ${formatVnd(coupon.value)}`;
  return `Giảm ${formatVnd(coupon.value)}`;
}

export default function CartPage(
  props: {
    checkoutLocked?: boolean;
    checkoutBlockMessage?: string;
    shippingPromotionConfig?: ShippingPromotionConfig;
  } = {},
): JSX.Element {
  const {
    checkoutLocked = false,
    checkoutBlockMessage = "",
    shippingPromotionConfig = DEFAULT_SHIPPING_PROMOTION_CONFIG,
  } = props;
  const {
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
    applyCoupon,
    removeCoupon,
    getUnitPrice,
  } = useGuestCart();
  const coupons = useStorefrontCoupons();
  const nextVoucherMilestone = findNextVoucherMilestone(subtotal, coupons);
  const hasActiveCoupon = Boolean(appliedCoupon);
  const shippingPromoProgress = hasActiveCoupon ? null : getNextShippingPromotionProgress(subtotal, shippingPromotionConfig);
  const estimatedShippingPromo = hasActiveCoupon
    ? null
    : getShippingPromotionDiscount(subtotal, Number.MAX_SAFE_INTEGER, shippingPromotionConfig);


  if (!items.length) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Bạn chưa có sản phẩm nào trong giỏ. Khám phá danh mục để bắt đầu mua sắm."
          actionLabel="Tiếp tục mua sắm"
          actionHref="/"
        />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Giỏ hàng</h1>
        <p className="text-sm text-zinc-600">{totalQuantity} sản phẩm trong giỏ</p>
      </header>

      {checkoutLocked && checkoutBlockMessage ? (
        <div className="mb-6 max-w-full min-w-0">
          <CtvPurchaseBlockedPanel message={checkoutBlockMessage} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <article className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[96px_1fr] gap-4 rounded-xl border border-zinc-200 bg-white p-3 sm:grid-cols-[120px_1fr]"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                <MediaImage
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="120px"
                  fallbackLabel={item.name}
                  className="object-cover"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/san-pham/${item.slug}`}
                      className="text-sm font-semibold text-zinc-900 transition hover:text-zinc-700 sm:text-base"
                    >
                      {item.name}
                    </Link>
                    {item.sku ? <p className="text-xs text-zinc-500">SKU: {item.sku}</p> : null}
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 sm:text-base">
                    {formatVnd(getUnitPrice(item))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-md border border-zinc-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      className="h-9 w-9 text-zinc-700 transition hover:bg-zinc-100"
                      aria-label="Giảm số lượng"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => setQuantity(item.id, Number(event.target.value || 1))}
                      className="h-9 w-12 border-x border-zinc-300 text-center text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      className="h-9 w-9 text-zinc-700 transition hover:bg-zinc-100"
                      aria-label="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
          <CartAddonSuggestions />
        </article>

        <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-zinc-900">Tóm tắt đơn hàng</h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Tạm tính</span>
              <span className="font-medium text-zinc-900">{formatVnd(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Giảm giá</span>
              <span className="font-medium text-zinc-900">- {formatVnd(discount)}</span>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
              Phí vận chuyển sẽ được tính khi nhập địa chỉ giao hàng.
            </div>
            {appliedCoupon ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-bold text-emerald-800">
                  {couponSource === "auto" ? "🔥 Đã tự động áp dụng ưu đãi tốt nhất" : "🎁 Voucher đã áp dụng"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-emerald-950">{appliedCoupon.code}</p>
                    <p className="text-xs font-medium text-emerald-700">{getCartVoucherValueLabel(appliedCoupon.code, coupons)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-emerald-700">
                      {appliedCoupon.type === "FREE_SHIPPING" ? "Vận chuyển" : "Tiết kiệm"}
                    </p>
                    <p className="text-sm font-extrabold text-emerald-950">
                      {appliedCoupon.type === "FREE_SHIPPING" ? "Tính ở checkout" : formatVnd(discount)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {nextVoucherMilestone ? <VoucherProgressCard milestone={nextVoucherMilestone} subtotal={subtotal} compact /> : null}
            <ShippingPromotionProgressCard
              progress={shippingPromoProgress}
              applied={estimatedShippingPromo}
              subtotal={subtotal}
              compact
            />
            <div className="border-t border-zinc-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">Tổng cộng</span>
                <span className="text-lg font-bold text-zinc-900">{formatVnd(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <label htmlFor="coupon" className="text-sm font-medium text-zinc-700">
              Mã giảm giá
            </label>
            <div className="flex gap-2">
              <input
                id="coupon"
                type="text"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="Nhập mã (FREESHIP30...)"
                className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="inline-flex h-10 shrink-0 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
              >
                Áp dụng
              </button>
            </div>
            {appliedCoupon ? (
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                Bỏ voucher đang áp dụng
              </button>
            ) : null}
          </div>

          {checkoutLocked ? (
            <p
              role="status"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-center text-sm font-medium text-zinc-600"
            >
              Thanh toán không khả dụng với tài khoản CTV này
            </p>
          ) : (
            <Link
              href="/thanh-toan"
              className="mt-5 inline-flex h-11 w-full min-w-0 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Tiếp tục thanh toán
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
