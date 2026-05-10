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

function toDatetimeLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminCouponForm({
  mode,
  couponId,
}: AdminCouponFormProps): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
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

  if (!ready || loadingData) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải dữ liệu...
      </section>
    );
  }
  const discountType = watch("discountType");

  const generateCode = () => {
    const presets = ["ZENDO10", "SALE20", "FREESHIP", "VIP50"];
    const random = presets[Math.floor(Math.random() * presets.length)] ?? "ZENDO10";
    setValue("code", random, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mã giảm giá *</span>
          <div className="flex gap-2">
            <input
              {...register("code")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm uppercase outline-none focus:border-zinc-500"
              placeholder="ZENDO10"
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
                {type === "PERCENT" ? "Giảm theo %" : type === "FIXED_AMOUNT" ? "Giảm số tiền cố định" : "Miễn phí vận chuyển"}
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
                {scope === "ORDER" ? "Toàn bộ đơn" : "Miễn phí vận chuyển"}
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
          <span className="text-sm font-medium text-zinc-700">Đơn tối thiểu</span>
          <input
            type="number"
            step="0.01"
            {...register("minOrderValue")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="0"
          />
          {errors.minOrderValue ? <p className="text-xs text-rose-600">{errors.minOrderValue.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Giảm tối đa</span>
          <input
            type="number"
            step="0.01"
            {...register("maxDiscountValue")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Không bắt buộc"
          />
          <p className="text-xs text-zinc-500">Chỉ áp dụng cho mã giảm theo %.</p>
          {errors.maxDiscountValue ? <p className="text-xs text-rose-600">{errors.maxDiscountValue.message}</p> : null}
        </label>

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

