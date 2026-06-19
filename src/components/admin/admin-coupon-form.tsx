"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  COUPON_CURRENCY_TYPES,
  COUPON_DISCOUNT_TYPES,
  COUPON_SCOPE_TYPES,
  couponFormSchema,
  type CouponAdminDto,
  type CouponFormValues,
} from "../../lib/admin-coupon";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";
type QuickCouponOption = {
  code: string;
  name: string;
  type: "PERCENT" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  maxDiscountValue?: number | null;
  minOrderValue?: number | null;
  description: string;
  usageLimit: number;
  usagePerCustomer: number;
};

interface AdminCouponFormProps {
  mode: "create" | "edit";
  couponId?: string;
}

const DEFAULT_VALUES: CouponFormValues = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENT",
  scope: "ORDER",
  currency: "VND",
  discountValue: 0,
  maxDiscountValue: undefined,
  minOrderValue: undefined,
  usageLimit: undefined,
  usagePerCustomer: undefined,
  startAt: "",
  endAt: "",
  isActive: true,
};

type CouponFormInput = z.input<typeof couponFormSchema>;
const QUICK_POPULAR_COUPONS: QuickCouponOption[] = [
  { code: "FREESHIP30", name: "🚚 FREESHIP30 - Được chọn nhiều nhất", type: "FREE_SHIPPING", value: 30000, maxDiscountValue: 30000, minOrderValue: 299000, usageLimit: 5000, usagePerCustomer: 5, description: "Giảm phí vận chuyển tối đa 30.000đ. Tag: Được chọn nhiều nhất" },
  { code: "SAVE5", name: "⚡ SAVE5 - Ưu đãi nhanh", type: "PERCENT", value: 5, maxDiscountValue: 20000, minOrderValue: 399000, usageLimit: 5000, usagePerCustomer: 2, description: "Giảm 5%, tối đa 20.000đ. Tag: Ưu đãi nhanh" },
  { code: "SAVE20", name: "🎁 SAVE20 - Tiết kiệm", type: "FIXED_AMOUNT", value: 20000, maxDiscountValue: null, minOrderValue: 499000, usageLimit: 4000, usagePerCustomer: 2, description: "Giảm trực tiếp 20.000đ. Tag: Tiết kiệm" },
  { code: "SAVE50", name: "🎁 SAVE50 - Phổ biến", type: "FIXED_AMOUNT", value: 50000, maxDiscountValue: null, minOrderValue: 999000, usageLimit: 3500, usagePerCustomer: 2, description: "Giảm trực tiếp 50.000đ. Tag: Phổ biến" },
  { code: "SAVE10", name: "⭐ SAVE10 - Được yêu thích", type: "PERCENT", value: 10, maxDiscountValue: 50000, minOrderValue: 1490000, usageLimit: 3000, usagePerCustomer: 2, description: "Giảm 10%, tối đa 50.000đ. Tag: Được yêu thích" },
  { code: "SAVE80", name: "🎁 SAVE80 - Đơn lớn", type: "FIXED_AMOUNT", value: 80000, maxDiscountValue: null, minOrderValue: 1990000, usageLimit: 2500, usagePerCustomer: 2, description: "Giảm trực tiếp 80.000đ. Tag: Đơn lớn" },
  { code: "SAVE120", name: "🎁 SAVE120 - Tiết kiệm cao", type: "FIXED_AMOUNT", value: 120000, maxDiscountValue: null, minOrderValue: 2990000, usageLimit: 2000, usagePerCustomer: 2, description: "Giảm trực tiếp 120.000đ. Tag: Tiết kiệm cao" },
  { code: "SAVE15VIP", name: "💎 SAVE15VIP - Khách VIP", type: "PERCENT", value: 15, maxDiscountValue: 120000, minOrderValue: 2990000, usageLimit: 1500, usagePerCustomer: 2, description: "Giảm 15%, tối đa 120.000đ. Tag: Khách VIP" },
  { code: "SAVE250", name: "🔥 SAVE250 - Giá trị cao", type: "FIXED_AMOUNT", value: 250000, maxDiscountValue: null, minOrderValue: 4990000, usageLimit: 1200, usagePerCustomer: 2, description: "Giảm trực tiếp 250.000đ. Tag: Giá trị cao" },
  { code: "SAVE25VIP", name: "👑 SAVE25VIP - Ưu đãi cực lớn", type: "PERCENT", value: 25, maxDiscountValue: 200000, minOrderValue: 4990000, usageLimit: 1000, usagePerCustomer: 2, description: "Giảm 25%, tối đa 200.000đ. Tag: Ưu đãi cực lớn" },
  { code: "SAVE350VIP", name: "👑 SAVE350VIP - Cao cấp", type: "FIXED_AMOUNT", value: 350000, maxDiscountValue: null, minOrderValue: 6990000, usageLimit: 800, usagePerCustomer: 2, description: "Giảm trực tiếp 350.000đ. Tag: Cao cấp" },
];

function toDatetimeLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildQuickCouponPayload(coupon: QuickCouponOption): CouponFormValues {
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    discountType: coupon.type,
    scope: coupon.type === "FREE_SHIPPING" ? "SHIPPING" : "ORDER",
    currency: "VND",
    discountValue: coupon.value,
    maxDiscountValue: coupon.type === "PERCENT" || coupon.type === "FREE_SHIPPING"
      ? coupon.maxDiscountValue ?? undefined
      : undefined,
    minOrderValue: coupon.minOrderValue ?? undefined,
    usageLimit: coupon.usageLimit,
    usagePerCustomer: coupon.usagePerCustomer,
    startAt: startsAt.toISOString(),
    endAt: endsAt.toISOString(),
    isActive: true,
  };
}

export default function AdminCouponForm({
  mode,
  couponId,
}: AdminCouponFormProps): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [quickCreateStatus, setQuickCreateStatus] = useState("");
  const [quickCreating, setQuickCreating] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [ready, setReady] = useState(mode === "create");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const discountType = watch("discountType");
  const maxDiscountValue = watch("maxDiscountValue");
  const isPercentDiscount = discountType === "PERCENT";
  const missingPercentMax = isPercentDiscount && (!maxDiscountValue || Number(maxDiscountValue) <= 0);
  const minOrderValue = watch("minOrderValue");
  const missingPercentMinOrder = isPercentDiscount && (!minOrderValue || Number(minOrderValue) <= 0);

  useEffect(() => {
    if (mode !== "edit" || !couponId) return;

    const loadCoupon = async () => {
      setLoadingData(true);
      setSubmitError("");
      const response = await fetch(`/api/admin/coupons/${couponId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: CouponAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu mã giảm giá.");
        setLoadingData(false);
        return;
      }
      reset({
        code: payload.item.code,
        name: payload.item.name,
        description: payload.item.description,
        discountType: payload.item.discountType,
        scope: payload.item.scope,
        currency: payload.item.currency,
        discountValue: payload.item.discountValue,
        maxDiscountValue: payload.item.maxDiscountValue ?? undefined,
        minOrderValue: payload.item.minOrderValue ?? undefined,
        usageLimit: payload.item.usageLimit ?? undefined,
        usagePerCustomer: payload.item.usagePerCustomer ?? undefined,
        startAt: toDatetimeLocal(payload.item.startAt),
        endAt: toDatetimeLocal(payload.item.endAt),
        isActive: payload.item.isActive,
      });
      setLoadingData(false);
      setReady(true);
    };

    loadCoupon().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu mã giảm giá.");
      setLoadingData(false);
    });
  }, [mode, couponId, reset]);

  useEffect(() => {
    if (discountType !== "PERCENT") {
      setValue("maxDiscountValue", undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [discountType, setValue]);

  const onSubmit = async (values: CouponFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/coupons" : `/api/admin/coupons/${couponId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const payload = {
      ...values,
      code: values.code.toUpperCase().trim(),
    };
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(body.message ?? "Không thể lưu mã giảm giá.");
      return;
    }
    router.push("/admin/coupons");
    router.refresh();
  };

  const createPopularCoupons = async () => {
    setQuickCreating(true);
    setQuickCreateStatus("");
    setSubmitError("");
    const coupons = QUICK_POPULAR_COUPONS;
    let createdCount = 0;
    let skippedCount = 0;

    try {
      for (const coupon of coupons) {
        const response = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildQuickCouponPayload(coupon)),
        });
        if (response.status === 409) {
          skippedCount += 1;
          continue;
        }
        if (!response.ok) {
          const body = (await response.json()) as { message?: string };
          throw new Error(body.message ?? `Không thể tạo voucher ${coupon.code}.`);
        }
        createdCount += 1;
      }
      setQuickCreateStatus(`Đã tạo ${createdCount} voucher Zendo, bỏ qua ${skippedCount} mã đã tồn tại.`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể tạo nhanh voucher phổ biến.");
    } finally {
      setQuickCreating(false);
    }
  };

  if (!ready || loadingData) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải dữ liệu...
      </section>
    );
  }
  const generateCode = () => {
    const presets = QUICK_POPULAR_COUPONS.map((coupon) => coupon.code);
    const random = presets[Math.floor(Math.random() * presets.length)] ?? "FREESHIP30";
    setValue("code", random, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
    >
      {mode === "create" ? (
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-blue-950">Tạo nhanh 11 voucher Zendo</h2>
              <p className="mt-1 text-xs font-medium text-blue-800">
                Tự sinh FREESHIP30, SAVE5, SAVE20, SAVE50, SAVE10, SAVE80, SAVE120, SAVE15VIP, SAVE250, SAVE25VIP và SAVE350VIP. Mã đã tồn tại sẽ được bỏ qua.
              </p>
            </div>
            <button
              type="button"
              onClick={createPopularCoupons}
              disabled={quickCreating}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {quickCreating ? "Đang tạo..." : "Tạo nhanh 11 voucher"}
            </button>
          </div>
          {quickCreateStatus ? <p className="mt-2 text-xs font-semibold text-blue-900">{quickCreateStatus}</p> : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mã giảm giá *</span>
          <div className="flex gap-2">
            <input
              {...register("code")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm uppercase outline-none focus:border-zinc-500"
              placeholder="FREESHIP30"
            />
            <button
              type="button"
              onClick={generateCode}
              className="inline-flex h-10 shrink-0 items-center rounded-md border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
            >
              Tạo mã tự động
            </button>
          </div>
          {errors.code ? <p className="text-xs text-rose-600">{errors.code.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tên chương trình *</span>
          <input
            {...register("name")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Ưu đãi tháng này"
          />
          {errors.name ? <p className="text-xs text-rose-600">{errors.name.message}</p> : null}
        </label>

        <label className="space-y-1 lg:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Mô tả</span>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Mô tả ngắn về chiến dịch mã giảm giá"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Loại giảm giá *</span>
          <select
            {...register("discountType")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            {COUPON_DISCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "PERCENT" ? "Giảm theo %" : type === "FIXED_AMOUNT" ? "Giảm số tiền cố định" : "Ưu đãi vận chuyển"}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Áp dụng *</span>
          <select
            {...register("scope")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            {COUPON_SCOPE_TYPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope === "ORDER" ? "Toàn bộ đơn" : "Ưu đãi vận chuyển"}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Giá trị giảm *</span>
          <input
            type="number"
            step="0.01"
            {...register("discountValue", { valueAsNumber: true })}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="10"
          />
          {discountType === "PERCENT" ? <p className="text-xs text-zinc-500">Ví dụ 10 nghĩa là giảm 10%.</p> : null}
          {errors.discountValue ? <p className="text-xs text-rose-600">{errors.discountValue.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tiền tệ</span>
          <select
            {...register("currency")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            {COUPON_CURRENCY_TYPES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">
            Đơn tối thiểu {isPercentDiscount ? <span className="text-rose-600">*</span> : null}
          </span>
          <input
            type="number"
            step="0.01"
            {...register("minOrderValue")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="0"
          />
          {missingPercentMinOrder ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
              Mã giảm theo % bắt buộc phải có Đơn tối thiểu lớn hơn 0.
            </p>
          ) : null}
          {errors.minOrderValue ? <p className="text-xs text-rose-600">{errors.minOrderValue.message}</p> : null}
        </label>

        {isPercentDiscount ? (
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">
              Giảm tối đa <span className="text-rose-600">*</span>
            </span>
            <input
              type="number"
              step="0.01"
              {...register("maxDiscountValue")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
              placeholder="Ví dụ: 100000"
            />
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
              Bắt buộc với mã giảm theo % để giới hạn mức giảm tối đa.
            </p>
            {missingPercentMax ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                Không thể lưu mã giảm theo % nếu chưa nhập Giảm tối đa lớn hơn 0.
              </p>
            ) : null}
            {errors.maxDiscountValue ? <p className="text-xs text-rose-600">{errors.maxDiscountValue.message}</p> : null}
          </label>
        ) : null}

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Ngày bắt đầu</span>
          <input
            type="datetime-local"
            {...register("startAt")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Ngày kết thúc</span>
          <input
            type="datetime-local"
            {...register("endAt")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-500">Để trống nếu không giới hạn thời gian.</p>
          {errors.endAt ? <p className="text-xs text-rose-600">{errors.endAt.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Giới hạn dùng tổng</span>
          <input
            type="number"
            {...register("usageLimit")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Không giới hạn"
          />
          <p className="text-xs text-zinc-500">Để trống nếu không giới hạn lượt dùng.</p>
          {errors.usageLimit ? <p className="text-xs text-rose-600">{errors.usageLimit.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Giới hạn / khách</span>
          <input
            type="number"
            {...register("usagePerCustomer")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Không giới hạn"
          />
          <p className="text-xs text-zinc-500">Để trống nếu không giới hạn lượt dùng.</p>
          {errors.usagePerCustomer ? <p className="text-xs text-rose-600">{errors.usagePerCustomer.message}</p> : null}
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 lg:col-span-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-zinc-300" />
          <span>Kích hoạt</span>
        </label>
      </div>

      {submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={adminPrimaryButton}
        >
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo mã giảm giá" : "Cập nhật mã giảm giá"}
        </button>
        <Link
          href="/admin/coupons"
          className={adminSecondaryButton}
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}

