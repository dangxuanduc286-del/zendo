"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MediaImage from "../shared/media-image";
import { formatVnd } from "../../lib/currency";
import { useGuestCart } from "../../hooks/use-guest-cart";
import { AFFILIATE_REF_STORAGE_KEY, CART_COUPON_STORAGE_KEY } from "../../lib/cart";
import { guiSuKienAnalyticsClient } from "../../lib/analytics/event-client";
import { laySessionKey, layVisitorKey } from "../../lib/analytics/visitor-session";
import { matchLocationCode } from "../../lib/location-utils";
import type { AddressSelectorValue } from "./address-selector";
import { buildFullAddress } from "../../lib/vietnam-addresses";
import { getDistrictsByProvince, getProvinces, getWardsByDistrict } from "../../lib/vietnam-addresses";

const AddressSelector = dynamic(() => import("./address-selector"), {
  loading: () => <div className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50" />,
});
const CtvPurchaseBlockedPanel = dynamic(() => import("./ctv-purchase-blocked-panel"), { ssr: false });

type PaymentMethod = "COD" | "BANK_TRANSFER" | "CREDIT_CARD" | "E_WALLET";

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
  } = {},
): JSX.Element {
  const { checkoutLocked = false, checkoutBlockMessage = "" } = props;
  const router = useRouter();
  const { items, subtotal, clearCart, getUnitPrice } = useGuestCart();
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

  const normalizePhone = (rawPhone: string): string => rawPhone.replace(/[^\d+]/g, "");

  const applySavedAddress = (address: SavedAddress): void => {
    const provinces = getProvinces("legacy");
    const provinceOptions = provinces.flatMap((province) => [
      { label: province.name, value: province.code },
      ...(province.legacyNames ?? []).map((legacyName) => ({ label: legacyName, value: province.code })),
    ]);
    const matchedProvinceCode = matchLocationCode(address.province || "", provinceOptions);
    const matchedProvince = provinces.find((province) => province.code === matchedProvinceCode);
    const districts = matchedProvince ? getDistrictsByProvince(matchedProvince.code, "legacy") : [];
    const districtOptions = districts.map((district) => ({ label: district.name, value: district.code }));
    const matchedDistrictCode = matchLocationCode(address.district || "", districtOptions);
    const matchedDistrict = districts.find((district) => district.code === matchedDistrictCode);
    const wards = matchedProvince && matchedDistrict
      ? getWardsByDistrict(matchedDistrict.code, matchedProvince.code, "legacy")
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
  };

  useEffect(() => {
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
  }, []);

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {checkoutLocked && checkoutBlockMessage ? (
        <div className="lg:col-span-2">
          <CtvPurchaseBlockedPanel message={checkoutBlockMessage} />
        </div>
      ) : null}
      <form
        onSubmit={onSubmit}
        className={`space-y-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 ${checkoutLocked ? "pointer-events-none opacity-60" : ""}`}
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Thanh toán</h1>

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
              <option value="E_WALLET">Ví điện tử</option>
              <option value="CREDIT_CARD">Thẻ tín dụng</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || checkoutLocked}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkoutLocked ? "Không thể đặt hàng" : isSubmitting ? "Đang đặt hàng..." : "Đặt hàng"}
        </button>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </form>

      <aside
        className={`h-fit rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 ${checkoutLocked ? "pointer-events-none opacity-60" : ""}`}
      >
        <h2 className="text-base font-semibold text-zinc-900">Đơn hàng của bạn</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-md bg-zinc-100">
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
                <p className="line-clamp-2 text-sm font-medium text-zinc-900">{item.name}</p>
                <p className="text-xs text-zinc-500">Số lượng: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {formatVnd(getUnitPrice(item) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <label className="mt-4 block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mã giảm giá</span>
          <input
            value={formState.couponCode}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, couponCode: event.target.value }))
            }
            placeholder="Nhập mã nếu có"
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          />
        </label>

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>Tạm tính</span>
            <span className="font-medium text-zinc-900">{formatVnd(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Phí vận chuyển được tính ở bước tiếp theo.</p>
        </div>
      </aside>
    </div>
  );
}
