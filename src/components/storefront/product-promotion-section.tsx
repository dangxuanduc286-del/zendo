"use client";

import { useEffect, useState } from "react";
import { CART_COUPON_SOURCE_STORAGE_KEY, CART_COUPON_STORAGE_KEY, CART_UPDATED_EVENT } from "../../lib/cart";

export interface ProductPromotionCoupon {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
}

function formatCompactVnd(value: number): string {
  if (value >= 1000 && value % 1000 === 0) return `${Math.round(value / 1000)}K`;
  return new Intl.NumberFormat("vi-VN").format(value);
}

function buildCouponHint(coupon: ProductPromotionCoupon): string {
  const parts: string[] = [];
  if (coupon.type === "PERCENT" && coupon.maxDiscountAmount) {
    parts.push(`Tối đa ${formatCompactVnd(coupon.maxDiscountAmount)}`);
  }
  if (coupon.minOrderAmount) {
    parts.push(`Đơn từ ${formatCompactVnd(coupon.minOrderAmount)}`);
  }
  return parts.join(" · ");
}

function buildCouponValue(coupon: ProductPromotionCoupon): string {
  if (coupon.type === "PERCENT") return `Giảm ${coupon.value}%`;
  if (coupon.type === "FREE_SHIPPING") return "Freeship";
  return `Giảm ${formatCompactVnd(coupon.value)}`;
}

function buildCouponSubtext(coupon: ProductPromotionCoupon): string {
  const hint = buildCouponHint(coupon);
  if (hint) return hint;
  if (coupon.type === "FREE_SHIPPING") return `Ưu đãi ${formatCompactVnd(coupon.value)}`;
  return coupon.code;
}

export default function ProductPromotionSection({
  coupons,
  productPrice,
}: {
  coupons: ProductPromotionCoupon[];
  productPrice: number;
}): JSX.Element {
  const [selectedCode, setSelectedCode] = useState("");
  const visibleCoupons = [...coupons]
    .sort((a, b) => {
      const priority = (coupon: ProductPromotionCoupon) => {
        if (coupon.type === "FREE_SHIPPING") return 0;
        if (coupon.type === "PERCENT") return 2;
        return 1;
      };
      return priority(a) - priority(b);
    })
    .slice(0, 3);
  const hiddenCount = Math.max(0, coupons.length - visibleCoupons.length);

  useEffect(() => {
    setSelectedCode(window.localStorage.getItem(CART_COUPON_STORAGE_KEY) ?? "");
  }, []);

  const selectCoupon = (coupon: ProductPromotionCoupon) => {
    if (coupon.minOrderAmount && productPrice < coupon.minOrderAmount) return;
    window.localStorage.setItem(CART_COUPON_STORAGE_KEY, coupon.code);
    window.localStorage.setItem(CART_COUPON_SOURCE_STORAGE_KEY, "manual");
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    setSelectedCode(coupon.code);
  };

  return (
    <section className="flex min-h-[132px] min-w-0 flex-col justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-3 text-amber-950 md:min-h-[136px] md:p-3.5 xl:min-h-0 xl:p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-amber-700 xl:h-7 xl:w-7" aria-hidden>
          <svg viewBox="0 0 20 20" className="h-6 w-6 xl:h-[22px] xl:w-[22px]">
            <path d="M4.5 7.5V5.8c0-.7.6-1.3 1.3-1.3h8.4c.7 0 1.3.6 1.3 1.3v1.7M4.5 7.5h11M4.5 7.5v6.7c0 .7.6 1.3 1.3 1.3h8.4c.7 0 1.3-.6 1.3-1.3V7.5" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinejoin="round" />
            <path d="M10 4.5v11M7.3 4.5c-.9-.7-1.2-1.6-.7-2.1.6-.6 1.9 0 3.4 2.1M12.7 4.5c.9-.7 1.2-1.6.7-2.1-.6-.6-1.9 0-3.4 2.1" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-none tracking-[-0.02em] text-amber-950 md:text-[15px] xl:text-sm">
            Ưu đãi áp dụng
          </h2>
          <p className="mt-1 text-[11px] font-medium leading-none text-amber-800">
            Chọn 1 mã giảm giá{hiddenCount > 0 ? ` · +${hiddenCount} ưu đãi khác` : ""}
          </p>
        </div>
      </div>

      {visibleCoupons.length ? (
        <div className="mt-2 flex max-w-full flex-col gap-2 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 xl:mt-1.5" role="radiogroup" aria-label="Ưu đãi áp dụng">
          {visibleCoupons.map((coupon) => {
            const selected = selectedCode.toUpperCase() === coupon.code.toUpperCase();
            const disabled = Boolean(coupon.minOrderAmount && productPrice < coupon.minOrderAmount);
            return (
              <button
                key={coupon.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => selectCoupon(coupon)}
                className={`relative flex h-12 w-full flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-left shadow-sm transition duration-150 ease-out lg:min-w-0 lg:max-w-full lg:flex-auto xl:h-11 ${
                  selected
                    ? "border-[#2563EB] bg-blue-50 text-[#1D4ED8] ring-1 ring-blue-100"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-[#2563EB]/60 hover:bg-blue-50/30"
                } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
                title={disabled && coupon.minOrderAmount ? `Áp dụng cho đơn từ ${formatCompactVnd(coupon.minOrderAmount)}` : coupon.code}
              >
                {selected ? (
                  <span className="absolute right-1 top-1 inline-flex h-4 items-center gap-0.5 rounded-full bg-[#2563EB] px-1.5 text-[8px] font-extrabold leading-none text-white shadow-sm">
                    <span aria-hidden>✓</span>
                    <span className="hidden md:inline">Đã chọn</span>
                  </span>
                ) : null}
                <span className={`max-w-full truncate pr-6 text-[15px] font-black leading-none tracking-[-0.035em] md:text-base lg:text-[17px] ${selected ? "text-[#1D4ED8]" : "text-zinc-950"}`}>
                  {buildCouponValue(coupon)}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[9px] font-semibold leading-none text-zinc-500 md:text-[10px]">
                  {buildCouponSubtext(coupon)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-white/70 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800">
          Khuyến mãi sẽ được cập nhật
        </div>
      )}
    </section>
  );
}
