"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MediaImage from "../shared/media-image";
import { formatVnd } from "../../lib/currency";
import { useGuestCart } from "../../hooks/use-guest-cart";
import { AFFILIATE_REF_STORAGE_KEY, CART_COUPON_STORAGE_KEY } from "../../lib/cart";
import {
  computeGuestCoupon,
  findNextVoucherMilestone,
  getGuestCouponBadges,
  type GuestCouponOption,
} from "../../lib/coupon";
import { useStorefrontCoupons } from "../../hooks/use-storefront-coupons";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";
import { laySessionKey, layVisitorKey } from "../../lib/analytics/visitor-session";
import { matchLocationCode } from "../../lib/location-utils";
import type { AddressSelectorValue } from "./address-selector";
import { buildFullAddress } from "../../lib/address-format";
import VoucherProgressCard from "./voucher-progress-card";
import CartAddonSuggestions from "./cart-addon-suggestions";
import {
  DEFAULT_SHIPPING_PROMOTION_CONFIG,
  getInternalShippingQuote,
  getNextShippingPromotionProgress,
  getShippingPromotionDiscount,
  resolveCartShippingClass,
  type ShippingPromotionConfig,
} from "../../lib/shipping";
import ShippingPromotionProgressCard from "./shipping-promotion-progress";

const AddressSelector = dynamic(() => import("./address-selector"), {
  loading: () => <div className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50" />,
});
const CtvPurchaseBlockedPanel = dynamic(() => import("./ctv-purchase-blocked-panel"), { ssr: false });

type PaymentMethod = "COD" | "BANK_TRANSFER" | "CREDIT_CARD" | "E_WALLET";

function getVoucherValueLabel(coupon: GuestCouponOption): string {
  if (coupon.type === "PERCENT") return `Giảm ${coupon.value}%`;
  if (coupon.type === "FREE_SHIPPING") return `Ưu đãi vận chuyển ${formatVnd(coupon.value)}`;
  return `Giảm ${formatVnd(coupon.value)}`;
}

function getVoucherMinOrderLabel(coupon: GuestCouponOption): string {
  if (coupon.minOrderValue && coupon.minOrderValue > 0) {
    return `Đơn tối thiểu ${formatVnd(coupon.minOrderValue)}`;
  }
  return coupon.conditionLabel;
}

interface CheckoutState {
  fullName: string;
  phone: string;
  email: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  note: string;
  paymentMethod: PaymentMethod;
  couponCode: string;
}

interface SavedAddress {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
}

const INITIAL_STATE: CheckoutState = {
  fullName: "",
  phone: "",
  email: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  wardCode: "",
  wardName: "",
  addressLine: "",
  note: "",
  paymentMethod: "COD",
  couponCode: "",
};

export default function CheckoutForm(
  props: {
    checkoutLocked?: boolean;
    checkoutBlockMessage?: string;
    shippingPromotionConfig?: ShippingPromotionConfig;
    isAuthenticated?: boolean;
  } = {},
): JSX.Element {
  const {
    checkoutLocked = false,
    checkoutBlockMessage = "",
    shippingPromotionConfig = DEFAULT_SHIPPING_PROMOTION_CONFIG,
    isAuthenticated = false,
  } = props;
  const router = useRouter();
  const {
    items,
    subtotal,
    discount,
    couponCode: cartCouponCode,
    couponSource,
    setCouponCode,
    setQuantity,
    removeItem,
    clearCart,
    getUnitPrice,
  } = useGuestCart();
  const [formState, setFormState] = useState<CheckoutState>(() => {
    if (typeof window === "undefined") return INITIAL_STATE;
    return {
      ...INITIAL_STATE,
      couponCode: window.localStorage.getItem(CART_COUPON_STORAGE_KEY) ?? "",
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>("");
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isMappingAddress, setIsMappingAddress] = useState(false);
  const [addressMappingWarning, setAddressMappingWarning] = useState("");
  const [voucherPickerOpen, setVoucherPickerOpen] = useState(false);
  const [pendingMobileVoucherCode, setPendingMobileVoucherCode] = useState("");
  const voucherPanelRef = useRef<HTMLDivElement | null>(null);
  const voucherTriggerRef = useRef<HTMLButtonElement | null>(null);
  const coupons = useStorefrontCoupons();
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    phone?: string;
    provinceCode?: string;
    districtCode?: string;
    addressLine?: string;
  }>({});
  const daTrackBeginCheckout = useRef(false);
  const previewAddress = buildFullAddress({
    addressLine: formState.addressLine,
    wardName: formState.wardName,
    districtName: formState.districtName,
    provinceName: formState.provinceName,
  });

  const onAddressChange = (nextAddress: AddressSelectorValue) => {
    setFieldErrors((prev) => ({
      ...prev,
      provinceCode: undefined,
      districtCode: undefined,
      addressLine: undefined,
    }));
    setFormState((prev) => ({
      ...prev,
      provinceCode: nextAddress.provinceCode,
      provinceName: nextAddress.provinceName,
      districtCode: nextAddress.districtCode,
      districtName: nextAddress.districtName,
      wardCode: nextAddress.wardCode,
      wardName: nextAddress.wardName,
      addressLine: nextAddress.addressLine,
    }));
  };

  const clampCheckoutQuantity = (quantity: number, stockQuantity?: number | null): number => {
    const normalized = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
    if (typeof stockQuantity === "number" && Number.isFinite(stockQuantity) && stockQuantity > 0) {
      return Math.min(normalized, stockQuantity);
    }
    return normalized;
  };

  const updateCheckoutQuantity = (itemId: string, quantity: number, stockQuantity?: number | null) => {
    const nextQuantity = clampCheckoutQuantity(quantity, stockQuantity);
    if (nextQuantity === 0) {
      removeItem(itemId);
      return;
    }
    setQuantity(itemId, nextQuantity);
  };

  const updateCouponCode = useCallback((couponCode: string) => {
    setFormState((prev) => ({ ...prev, couponCode }));
    setCouponCode(couponCode);
    if (couponCode.trim()) {
      window.localStorage.setItem(CART_COUPON_STORAGE_KEY, couponCode.trim().toUpperCase());
    } else {
      window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
    }
  }, [setCouponCode]);

  const voucherOptions = useMemo(
    () =>
      coupons.map((coupon) => {
        const result = computeGuestCoupon(coupon.code, subtotal, coupons);
        return {
          coupon,
          discountAmount: result?.amount ?? 0,
          available: Boolean(result && result.amount > 0),
          amountNeeded: coupon.minOrderValue ? Math.max(0, coupon.minOrderValue - subtotal) : 0,
        };
      }),
    [coupons, subtotal],
  );
  const bestVoucherCode = voucherOptions
    .filter((item) => item.available)
    .sort((a, b) => b.discountAmount - a.discountAmount)[0]?.coupon.code ?? "";
  const selectedVoucher = voucherOptions.find((item) => item.coupon.code === formState.couponCode.trim().toUpperCase()) ?? null;
  const nextVoucherMilestone = findNextVoucherMilestone(subtotal, coupons);
  const shippingQuote = useMemo(
    () => getInternalShippingQuote({
      provinceCode: formState.provinceCode,
      provinceName: formState.provinceName,
    }, { shippingClass: resolveCartShippingClass(items) }),
    [formState.provinceCode, formState.provinceName, items],
  );
  const activeCouponCode = formState.couponCode.trim().toUpperCase();
  const shippingFee = shippingQuote?.fee ?? 0;
  const manualShippingDiscount = selectedVoucher?.coupon.type === "FREE_SHIPPING"
    ? Math.min(selectedVoucher.discountAmount, shippingFee)
    : 0;
  const autoShippingPromo = activeCouponCode
    ? null
    : getShippingPromotionDiscount(subtotal, shippingFee, shippingPromotionConfig);
  const autoShippingDiscount = autoShippingPromo?.discountAmount ?? 0;
  const shippingDiscount = Math.max(manualShippingDiscount, autoShippingDiscount);
  const shippingPromoProgress = activeCouponCode
    ? null
    : getNextShippingPromotionProgress(subtotal, shippingPromotionConfig);
  const payableShippingFee = Math.max(0, shippingFee - shippingDiscount);
  const checkoutTotal = Math.max(0, subtotal - discount + payableShippingFee);
  const selectedVoucherSavings = selectedVoucher?.coupon.type === "FREE_SHIPPING" ? shippingDiscount : discount;

  useEffect(() => {
    if (couponSource === "auto" && cartCouponCode && formState.couponCode !== cartCouponCode) {
      setFormState((prev) => ({ ...prev, couponCode: cartCouponCode }));
    }
  }, [cartCouponCode, couponSource, formState.couponCode]);

  const closeVoucherPicker = useCallback(() => {
    setVoucherPickerOpen(false);
    setPendingMobileVoucherCode("");
    voucherTriggerRef.current?.focus();
  }, []);

  const selectVoucher = useCallback((coupon: GuestCouponOption) => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
      setPendingMobileVoucherCode(coupon.code);
      return;
    }
    updateCouponCode(coupon.code);
    closeVoucherPicker();
  }, [closeVoucherPicker, updateCouponCode]);

  const confirmMobileVoucher = useCallback(() => {
    if (!pendingMobileVoucherCode) return;
    updateCouponCode(pendingMobileVoucherCode);
    closeVoucherPicker();
  }, [closeVoucherPicker, pendingMobileVoucherCode, updateCouponCode]);

  const clearVoucher = useCallback(() => {
    updateCouponCode("");
    closeVoucherPicker();
  }, [closeVoucherPicker, updateCouponCode]);

  useEffect(() => {
    if (!voucherPickerOpen) return;
    const panel = voucherPanelRef.current;
    const focusableSelector = "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeVoucherPicker();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((node) => !node.hasAttribute("disabled"));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeVoucherPicker, voucherPickerOpen]);

  const normalizePhone = (rawPhone: string): string => rawPhone.replace(/[^\d+]/g, "");

  const applySavedAddressWithLookup = useCallback((
    address: SavedAddress,
    lookup: {
      getProvinces: typeof import("../../lib/vietnam-addresses").getProvinces;
      getDistrictsByProvince: typeof import("../../lib/vietnam-addresses").getDistrictsByProvince;
      getWardsByDistrict: typeof import("../../lib/vietnam-addresses").getWardsByDistrict;
    },
  ): void => {
    const provinces = lookup.getProvinces("legacy");
    const provinceOptions = provinces.flatMap((province) => [
      { label: province.name, value: province.code },
      ...(province.legacyNames ?? []).map((legacyName) => ({ label: legacyName, value: province.code })),
    ]);
    const matchedProvinceCode = matchLocationCode(address.province || "", provinceOptions);
    const matchedProvince = provinces.find((province) => province.code === matchedProvinceCode);
    const districts = matchedProvince ? lookup.getDistrictsByProvince(matchedProvince.code, "legacy") : [];
    const districtOptions = districts.map((district) => ({ label: district.name, value: district.code }));
    const matchedDistrictCode = matchLocationCode(address.district || "", districtOptions);
    const matchedDistrict = districts.find((district) => district.code === matchedDistrictCode);
    const wards = matchedProvince && matchedDistrict
      ? lookup.getWardsByDistrict(matchedDistrict.code, matchedProvince.code, "legacy")
      : [];
    const wardOptions = wards.map((ward) => ({ label: ward.name, value: ward.code }));
    const matchedWardCode = matchLocationCode(address.ward || "", wardOptions);
    const matchedWard = wards.find((ward) => ward.code === matchedWardCode);
    setIsMappingAddress(true);
    setAddressMappingWarning("");
    setFieldErrors((prev) => ({
      ...prev,
      fullName: undefined,
      phone: undefined,
      provinceCode: undefined,
      districtCode: undefined,
      addressLine: undefined,
    }));
    setFormState((prev) => ({
      ...prev,
      fullName: address.receiverName || prev.fullName,
      phone: address.phone || prev.phone,
      provinceCode: matchedProvince?.code ?? "",
      provinceName: matchedProvince?.name ?? (address.province || ""),
      districtCode: matchedDistrict?.code ?? "",
      districtName: matchedDistrict?.name ?? (address.district || ""),
      wardCode: matchedWard?.code ?? "",
      wardName: matchedWard?.name ?? (address.ward || ""),
      addressLine: address.detail || "",
    }));
    if (!matchedProvince) {
      setAddressMappingWarning("Không thể tự động khớp Tỉnh/Thành phố. Vui lòng chọn lại địa chỉ khu vực.");
    }
    setIsMappingAddress(false);
  }, []);

  const applySavedAddress = useCallback((address: SavedAddress): void => {
    void (async () => {
      const { getDistrictsByProvince, getProvinces, getWardsByDistrict } = await import("../../lib/vietnam-addresses");
      applySavedAddressWithLookup(address, { getProvinces, getDistrictsByProvince, getWardsByDistrict });
    })();
  }, [applySavedAddressWithLookup]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedAddresses([]);
      setSelectedSavedAddressId("");
      setIsAddressesLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setIsAddressesLoading(true);
      try {
        const res = await fetch("/api/account/addresses", { credentials: "include" });
        const data = (await res.json()) as { items?: SavedAddress[] };
        if (!res.ok || !Array.isArray(data.items)) {
          if (!cancelled) setSavedAddresses([]);
          return;
        }
        if (cancelled) return;
        setSavedAddresses(data.items);
        const defaultAddress = data.items.find((addr) => addr.isDefault) ?? data.items[0] ?? null;
        if (defaultAddress) {
          setSelectedSavedAddressId(defaultAddress.id);
          applySavedAddress(defaultAddress);
        }
      } catch {
        if (!cancelled) setSavedAddresses([]);
      } finally {
        if (!cancelled) setIsAddressesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySavedAddress, isAuthenticated]);

  useEffect(() => {
    if (!items.length || daTrackBeginCheckout.current) return;
    guiSuKienAnalyticsClient({
      eventName: "begin_checkout",
      pathname: "/thanh-toan",
      metadata: { itemCount: items.length, subtotal },
    }).catch(() => {});
    daTrackBeginCheckout.current = true;
  }, [items.length, subtotal]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkoutLocked || !items.length || isSubmitting) return;

    setError("");
    setFieldErrors({});

    const nextFieldErrors: typeof fieldErrors = {};
    const phoneValue = normalizePhone(formState.phone);
    if (!formState.fullName.trim()) nextFieldErrors.fullName = "Vui lòng nhập họ và tên.";
    if (!phoneValue) nextFieldErrors.phone = "Vui lòng nhập số điện thoại.";
    else if (!/^(0\d{9}|84\d{9}|\+84\d{9})$/.test(phoneValue)) {
      nextFieldErrors.phone = "Số điện thoại không hợp lệ.";
    }
    if (!formState.provinceCode) nextFieldErrors.provinceCode = "Vui lòng chọn tỉnh/thành phố.";
    if (!formState.districtCode) nextFieldErrors.districtCode = "Vui lòng chọn quận/huyện.";
    if (!formState.addressLine.trim()) nextFieldErrors.addressLine = "Vui lòng nhập địa chỉ chi tiết.";

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setIsSubmitting(true);


    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          affiliateRefCode:
            typeof window !== "undefined"
              ? window.localStorage.getItem(AFFILIATE_REF_STORAGE_KEY)?.trim() ?? ""
              : "",
          visitorKey: layVisitorKey(),
          sessionKey: laySessionKey(),
          items: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            imageUrl: item.imageUrl,
            sku: item.sku,
            basePrice: item.basePrice,
            salePrice: item.salePrice ?? null,
            quantity: item.quantity,
            stockQuantity: item.stockQuantity ?? null,
          })),
        }),
      });

      const result = (await response.json()) as { message?: string; orderCode?: string };
      if (!response.ok || !result.orderCode) {
        setError(result.message ?? "Không thể tạo đơn hàng.");
        setIsSubmitting(false);
        return;
      }

      clearCart();
      window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
      router.push(`/thanh-toan/cam-on?code=${encodeURIComponent(result.orderCode)}`);
    } catch {
      setError("Có lỗi xảy ra trong quá trình đặt hàng.");
      setIsSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Giỏ hàng đang trống</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Vui lòng quay lại giỏ hàng và thêm sản phẩm trước khi thanh toán.
        </p>
        <Link
          href="/gio-hang"
          className="mt-4 inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-400"
        >
          Quay lại giỏ hàng
        </Link>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 pb-28 lg:grid-cols-[1fr_340px] lg:gap-6 lg:pb-0">
      {checkoutLocked && checkoutBlockMessage ? (
        <div className="lg:col-span-2">
          <CtvPurchaseBlockedPanel message={checkoutBlockMessage} />
        </div>
      ) : null}
      <form
        id="checkout-form"
        onSubmit={onSubmit}
        className={`space-y-3 rounded-xl border border-zinc-200 bg-white p-4 sm:space-y-4 sm:p-6 ${checkoutLocked ? "pointer-events-none opacity-60" : ""}`}
      >
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">Thanh toán</h1>

        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">📍 Địa chỉ nhận hàng</h2>
            {isAddressesLoading ? <span className="text-xs text-zinc-500">Đang tải địa chỉ...</span> : null}
          </div>
          {isMappingAddress ? (
            <p className="mt-2 text-xs font-medium text-blue-600">⏳ Đang cập nhật địa chỉ...</p>
          ) : null}
          {addressMappingWarning ? <p className="mt-2 text-xs font-medium text-amber-700">{addressMappingWarning}</p> : null}
          {savedAddresses.length > 0 ? (
            <div className="mt-3 space-y-2">
              {savedAddresses.map((addr) => {
                const checked = selectedSavedAddressId === addr.id;
                return (
                  <label
                    key={addr.id}
                    className={`block cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                      checked ? "border-blue-300 bg-blue-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved-address"
                      className="sr-only"
                      checked={checked}
                      onChange={() => {
                        setSelectedSavedAddressId(addr.id);
                        applySavedAddress(addr);
                      }}
                    />
                    <p className="font-semibold text-zinc-900">
                      {addr.receiverName} - {addr.phone}
                    </p>
                    <p className="mt-0.5 text-zinc-600">
                      {addr.province}, {addr.district}
                      {addr.ward ? `, ${addr.ward}` : ""}, {addr.detail}
                    </p>
                    {addr.isDefault ? (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Mặc định
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Chưa có địa chỉ lưu. Vui lòng nhập địa chỉ mới bên dưới.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/tai-khoan"
              className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              + Thêm địa chỉ mới
            </Link>
            <Link
              href="/tai-khoan"
              className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              Quản lý địa chỉ
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Họ và tên *</span>
            <input
              required
              value={formState.fullName}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, fullName: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            />
            {fieldErrors.fullName ? <p className="text-xs font-medium text-rose-600">{fieldErrors.fullName}</p> : null}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Số điện thoại *</span>
            <input
              required
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            />
            {fieldErrors.phone ? <p className="text-xs font-medium text-rose-600">{fieldErrors.phone}</p> : null}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Email (không bắt buộc)</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            />
          </label>

          <div className="sm:col-span-2">
            <AddressSelector
              mode="legacy"
              value={{
                provinceCode: formState.provinceCode,
                provinceName: formState.provinceName,
                districtCode: formState.districtCode,
                districtName: formState.districtName,
                wardCode: formState.wardCode,
                wardName: formState.wardName,
                addressLine: formState.addressLine,
              }}
              onChange={onAddressChange}
              errors={{
                provinceCode: fieldErrors.provinceCode,
                districtCode: fieldErrors.districtCode,
                addressLine: fieldErrors.addressLine,
              }}
            />
            {previewAddress ? (
              <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                Giao đến: {previewAddress}
              </p>
            ) : null}
          </div>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Ghi chú</span>
            <textarea
              rows={3}
              value={formState.note}
              onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Phương thức thanh toán *</span>
            <select
              required
              value={formState.paymentMethod}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value as PaymentMethod,
                }))
              }
              className="h-11 w-full rounded-xl border border-[#CBD5E1] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            >
              <option value="COD">Thanh toán khi nhận hàng (COD)</option>
              <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
            </select>
          </label>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </form>

      <aside
        className={`h-fit rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 ${checkoutLocked ? "pointer-events-none opacity-60" : ""}`}
      >
        <h2 className="text-base font-semibold text-zinc-900">Đơn hàng của bạn</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const stockLimit =
              typeof item.stockQuantity === "number" && Number.isFinite(item.stockQuantity) && item.stockQuantity > 0
                ? item.stockQuantity
                : null;
            const canDecrease = item.quantity > 0;
            const canIncrease = stockLimit == null || item.quantity < stockLimit;

            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  <MediaImage
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="56px"
                    fallbackLabel={item.name}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="line-clamp-2 min-w-0 text-sm font-medium text-zinc-900">{item.name}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatVnd(getUnitPrice(item) * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1 text-[11px] font-semibold text-rose-600 transition hover:text-rose-700 hover:underline"
                      >
                        Xóa sản phẩm
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                      <button
                        type="button"
                        onClick={() => updateCheckoutQuantity(item.id, item.quantity - 1, item.stockQuantity)}
                        disabled={!canDecrease}
                        className="inline-flex h-8 w-8 items-center justify-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Giảm số lượng ${item.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={stockLimit ?? undefined}
                        value={item.quantity}
                        onChange={(event) =>
                          updateCheckoutQuantity(item.id, Number(event.target.value || 0), item.stockQuantity)
                        }
                        className="h-8 w-10 border-x border-zinc-300 text-center text-xs font-semibold text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        aria-label={`Số lượng ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateCheckoutQuantity(item.id, item.quantity + 1, item.stockQuantity)}
                        disabled={!canIncrease}
                        className="inline-flex h-8 w-8 items-center justify-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Tăng số lượng ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                    {stockLimit != null ? (
                      <span className="text-[11px] font-medium text-zinc-500">Tồn kho: {stockLimit}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="relative mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Voucher</h3>
            <span className="text-[11px] font-medium text-zinc-500">{voucherOptions.filter((item) => item.available).length} khả dụng</span>
          </div>

          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {selectedVoucher && selectedVoucher.available ? (
              <div className="rounded-xl border border-[#2563EB]/35 bg-blue-50/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0F172A]">✓ Đang áp dụng {selectedVoucher.coupon.code}</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Tiết kiệm dự kiến</p>
                    <p className="text-sm font-extrabold text-[#2563EB]">
                      {selectedVoucher.coupon.type === "FREE_SHIPPING" && !shippingQuote ? "Tính khi nhập địa chỉ" : formatVnd(selectedVoucherSavings)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearVoucher}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-rose-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : null}
            <button
              ref={voucherTriggerRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={voucherPickerOpen}
              aria-controls="checkout-voucher-panel"
              onClick={() => {
                setPendingMobileVoucherCode(activeCouponCode);
                setVoucherPickerOpen(true);
              }}
              className="mt-3 inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 transition duration-150 hover:border-[#2563EB]/60 hover:bg-white hover:text-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <span>{selectedVoucher?.available ? "Đổi voucher" : "Chọn voucher"}</span>
              <span aria-hidden>{voucherPickerOpen ? "⌃" : "⌄"}</span>
            </button>
          </div>

          {nextVoucherMilestone ? <div className="mt-2"><VoucherProgressCard milestone={nextVoucherMilestone} subtotal={subtotal} compact /></div> : null}
          <div className="mt-2">
            <ShippingPromotionProgressCard
              progress={shippingPromoProgress}
              applied={autoShippingPromo}
              subtotal={subtotal}
              compact
            />
          </div>

          {voucherPickerOpen ? (
            <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 backdrop-blur-[2px] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+10px)] sm:block sm:w-full sm:bg-transparent sm:backdrop-blur-0">
              <button
                type="button"
                aria-label="Đóng chọn voucher"
                className="absolute inset-0 sm:hidden"
                onClick={closeVoucherPicker}
              />
              <div
                id="checkout-voucher-panel"
                ref={voucherPanelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-voucher-title"
                className="relative w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl ring-1 ring-slate-200/70 transition duration-200 ease-out sm:max-h-[520px] sm:rounded-3xl sm:shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
                style={{ maxHeight: "min(82vh, calc(100dvh - env(safe-area-inset-top) - 24px))", paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <div className="border-b border-slate-100 px-4 py-3 sm:px-4">
                  <div className="mb-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-3 shadow-sm">
                    <p className="text-sm font-extrabold text-orange-950">🔥 Tiết kiệm tới 350.000đ</p>
                    <p className="mt-0.5 text-xs font-bold text-amber-800">🎁 Có 11 ưu đãi dành cho bạn</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p id="checkout-voucher-title" className="text-sm font-extrabold text-slate-950">Danh sách voucher ({voucherOptions.length})</p>
                      <p className="mt-0.5 text-xs text-slate-500">Chọn 1 ưu đãi tốt nhất cho đơn hàng</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeVoucherPicker}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      aria-label="Đóng"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="max-h-[58vh] space-y-2 overflow-y-auto overscroll-contain p-3 sm:max-h-[390px]">
                  {nextVoucherMilestone ? <VoucherProgressCard milestone={nextVoucherMilestone} subtotal={subtotal} compact /> : null}
                  <ShippingPromotionProgressCard
                    progress={shippingPromoProgress}
                    applied={autoShippingPromo}
                    subtotal={subtotal}
                    compact
                  />
                  {voucherOptions.map(({ coupon, discountAmount, available, amountNeeded }) => {
                    const selected = (pendingMobileVoucherCode || activeCouponCode) === coupon.code;
                    const recommended = coupon.code === bestVoucherCode;
                    const badges = getGuestCouponBadges(coupon, { isBest: recommended });
                    return (
                      <button
                        key={coupon.code}
                        type="button"
                        onClick={() => {
                          if (available) selectVoucher(coupon);
                        }}
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={!available}
                        className={`flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left transition duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                          selected
                            ? "border-[#2563EB] bg-blue-50/80 shadow-sm"
                            : available
                              ? "border-emerald-300 bg-emerald-50/60 shadow-sm hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
                              : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                            selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-300 bg-white text-transparent"
                          }`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-bold text-zinc-900">{coupon.name}</span>
                          </span>
                          {available ? (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold leading-none text-emerald-700">
                              Đủ điều kiện
                            </span>
                          ) : null}
                          {badges.length ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {badges.slice(0, 2).map((badge) => (
                                <span
                                  key={badge}
                                  className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600"
                                >
                                  {badge}
                                </span>
                              ))}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-xs font-bold text-[#2563EB]">Mã: {coupon.code}</span>
                          <span className="mt-1 block text-sm font-extrabold text-slate-950">
                            {available ? `Tiết kiệm tới ${formatVnd(discountAmount)}` : getVoucherValueLabel(coupon)}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {getVoucherMinOrderLabel(coupon)}
                          </span>
                          {!available && amountNeeded > 0 ? (
                            <span className="mt-1 block text-xs font-semibold text-amber-700">
                              Mua thêm {formatVnd(amountNeeded)} để nhận ưu đãi này
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  <div className="sticky bottom-0 space-y-2 bg-white pt-2 sm:static sm:bg-transparent sm:pt-0">
                    <button
                      type="button"
                      onClick={confirmMobileVoucher}
                      disabled={!pendingMobileVoucherCode}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
                    >
                      Áp dụng voucher
                    </button>
                    {formState.couponCode ? (
                      <button
                        type="button"
                        onClick={clearVoucher}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      >
                        Không dùng voucher
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>Tạm tính</span>
            <span className="font-medium text-zinc-900">{formatVnd(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-600">
            <span>Giảm giá</span>
            <span className="font-medium text-zinc-900">- {formatVnd(discount)}</span>
          </div>
          <div className="mt-3">
            <CartAddonSuggestions compact />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-zinc-600">
            <span>Phí vận chuyển</span>
            <span className="font-medium text-zinc-900">
              {shippingQuote ? formatVnd(shippingFee) : "Tính khi nhập địa chỉ"}
            </span>
          </div>
          {shippingDiscount > 0 ? (
            <div className="mt-2 flex items-center justify-between text-sm text-zinc-600">
              <span>{autoShippingPromo?.freeShipping ? "🎉 Miễn phí vận chuyển" : "🚚 Ưu đãi vận chuyển"}</span>
              <span className="font-medium text-emerald-700">- {formatVnd(shippingDiscount)}</span>
            </div>
          ) : null}
          {shippingQuote ? (
            <div className="mt-2 flex items-center justify-between text-sm text-zinc-600">
              <span>Phí ship phải trả</span>
              <span className="font-medium text-zinc-900">{formatVnd(payableShippingFee)}</span>
            </div>
          ) : null}
          {!shippingQuote ? (
            <div className="mt-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
              Phí vận chuyển sẽ được tính khi nhập địa chỉ giao hàng.
            </div>
          ) : null}
          <div className="mt-3 border-t border-zinc-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900">Tổng thanh toán</span>
              <span className="text-lg font-bold text-zinc-900">{formatVnd(checkoutTotal)}</span>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting || checkoutLocked}
              className="mt-3 hidden h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
            >
              {checkoutLocked ? "Không thể đặt hàng" : isSubmitting ? "Đang đặt hàng..." : "Đặt hàng"}
            </button>
          </div>
        </div>
      </aside>
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-7xl space-y-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tổng thanh toán</p>
            <p className="truncate text-lg font-extrabold text-zinc-950">{formatVnd(checkoutTotal)}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting || checkoutLocked}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutLocked ? "Không thể đặt" : isSubmitting ? "Đang đặt..." : "Đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
