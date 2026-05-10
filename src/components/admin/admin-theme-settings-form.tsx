"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  themeSettingsFormSchema,
  type ThemeSettingsFormValues,
} from "../../lib/admin-settings";

const DEFAULT_VALUES: ThemeSettingsFormValues = {
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  heroTitle: "",
  heroSubtitle: "",
  homeBannerImage: "",
  homeBannerMobileImage: "",
  mainBannerImage: "",
  mainBannerHref: "",
  mainBannerTitle: "",
  mainBannerSubtitle: "",
  leftBannerTopImage: "",
  leftBannerTopHref: "",
  leftBannerBottomImage: "",
  leftBannerBottomHref: "",
  rightBannerTopImage: "",
  rightBannerTopHref: "",
  rightBannerBottomImage: "",
  rightBannerBottomHref: "",
  campaignBackgroundEnabled: false,
  campaignBackgroundImage: "",
  campaignBackgroundMobileImage: "",
  enableSiteBackgroundImage: false,
  siteBackgroundImage: "",
  showHeroBanner: true,
  heroCtaLabel: "Mua ngay",
  heroCtaHref: "/cua-hang",
  homeBannersJson: "[]",
  homeRightPromoCardsJson: "[]",
  homeBottomPromoCardsJson: "[]",
  enableFlashSaleSection: true,
  enableFeaturedSection: true,
  enableNewSection: true,
  enableBestSellerSection: true,
  enableBrandSection: true,
  enableBlogSection: true,
  productCardButtonMode: "solid",
  productCardButtonText: "Thêm giỏ",
  productDetailPrimaryButtonText: "Mua ngay",
  showAddToCartButton: true,
  showBuyNowButton: true,
};

interface AdminThemeSettingsFormProps {
  /** Nhúng trong trang cài đặt tổng — bỏ khung card ngoài. */
  embedded?: boolean;
}

export default function AdminThemeSettingsForm({ embedded = false }: AdminThemeSettingsFormProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ThemeSettingsFormValues>({
    resolver: zodResolver(themeSettingsFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setSubmitError("");
      const response = await fetch("/api/admin/settings/theme", { cache: "no-store" });
      const payload = (await response.json()) as { item?: Partial<ThemeSettingsFormValues>; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải cài đặt giao diện.");
        setLoading(false);
        return;
      }
      reset({
        ...DEFAULT_VALUES,
        ...payload.item,
        homeBannersJson: JSON.stringify((payload.item as { homeBanners?: unknown[] }).homeBanners ?? [], null, 2),
        homeRightPromoCardsJson: JSON.stringify(
          (payload.item as { homeRightPromoCards?: unknown[] }).homeRightPromoCards ?? [],
          null,
          2,
        ),
        homeBottomPromoCardsJson: JSON.stringify(
          (payload.item as { homeBottomPromoCards?: unknown[] }).homeBottomPromoCards ?? [],
          null,
          2,
        ),
      });
      setLoading(false);
    };
    loadSettings().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải cài đặt giao diện.");
      setLoading(false);
    });
  }, [reset]);

  const onSubmit = async (values: ThemeSettingsFormValues) => {
    setSubmitError("");
    setSubmitSuccess("");
    const response = await fetch("/api/admin/settings/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu cài đặt. Vui lòng thử lại.");
      return;
    }
    setSubmitSuccess("Đã lưu cài đặt.");
  };

  if (loading) {
    return (
      <section
        className={`text-sm text-zinc-600 ${embedded ? "py-4" : "rounded-xl border border-zinc-200 bg-white p-6"}`}
      >
        Đang tải cài đặt giao diện...
      </section>
    );
  }

  const primary = watch("primaryColor") || "#2563EB";
  const secondary = watch("secondaryColor") || "#0F172A";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${embedded ? "p-0" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"} [&_input:not([type='hidden']):not([type='checkbox'])]:h-11 [&_input:not([type='hidden']):not([type='checkbox'])]:w-full [&_input:not([type='hidden']):not([type='checkbox'])]:rounded-xl [&_input:not([type='hidden']):not([type='checkbox'])]:border [&_input:not([type='hidden']):not([type='checkbox'])]:border-slate-200 [&_input:not([type='hidden']):not([type='checkbox'])]:bg-white [&_input:not([type='hidden']):not([type='checkbox'])]:px-3 [&_input:not([type='hidden']):not([type='checkbox'])]:text-sm [&_input:not([type='hidden']):not([type='checkbox'])]:text-slate-900 [&_input:not([type='hidden']):not([type='checkbox'])]:outline-none [&_input:not([type='hidden']):not([type='checkbox'])]:focus:border-[#2563EB] [&_input:not([type='hidden']):not([type='checkbox'])]:focus:ring-2 [&_input:not([type='hidden']):not([type='checkbox'])]:focus:ring-[#DBEAFE] [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:text-slate-900 [&_textarea]:outline-none [&_textarea]:focus:border-[#2563EB] [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#DBEAFE] [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm [&_select]:text-slate-900 [&_select]:outline-none [&_select]:focus:border-[#2563EB] [&_select]:focus:ring-2 [&_select]:focus:ring-[#DBEAFE]`}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Màu sắc thương hiệu</h3>
            <p className="mt-1 text-xs text-slate-500">Dùng cho nút chính, link nổi bật và điểm nhấn giao diện.</p>
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Màu chính *</span>
            <input {...register("primaryColor")} placeholder="#2563EB" />
            {errors.primaryColor ? <p className="text-xs text-rose-600">{errors.primaryColor.message}</p> : null}
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Màu phụ *</span>
            <input {...register("secondaryColor")} placeholder="#0F172A" />
            {errors.secondaryColor ? <p className="text-xs text-rose-600">{errors.secondaryColor.message}</p> : null}
          </label>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            TODO: Các field `hoverColor`, `ctaColor` hiện chưa có trong schema theme hiện tại.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Nền / Card / Border / Text</h3>
            <p className="mt-1 text-xs text-slate-500">Nhóm màu nền và chữ hiện chưa tách field riêng trong theme schema.</p>
          </div>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            TODO: Chưa có `backgroundColor`, `cardColor`, `borderColor`, `textMainColor`, `textMutedColor` trong schema.
          </p>
        </section>

        <input type="hidden" {...register("homeBannerImage")} />
        <input type="hidden" {...register("homeBannerMobileImage")} />
        <input type="hidden" {...register("homeBannersJson")} />
        <input type="hidden" {...register("mainBannerImage")} />
        <input type="hidden" {...register("mainBannerHref")} />
        <input type="hidden" {...register("mainBannerTitle")} />
        <input type="hidden" {...register("mainBannerSubtitle")} />
        <input type="hidden" {...register("leftBannerTopImage")} />
        <input type="hidden" {...register("leftBannerTopHref")} />
        <input type="hidden" {...register("leftBannerBottomImage")} />
        <input type="hidden" {...register("leftBannerBottomHref")} />
        <input type="hidden" {...register("rightBannerTopImage")} />
        <input type="hidden" {...register("rightBannerTopHref")} />
        <input type="hidden" {...register("rightBannerBottomImage")} />
        <input type="hidden" {...register("rightBannerBottomHref")} />
        <label className="hidden">
          <input type="checkbox" {...register("campaignBackgroundEnabled")} />
        </label>
        <input type="hidden" {...register("campaignBackgroundImage")} />
        <input type="hidden" {...register("campaignBackgroundMobileImage")} />
        <input type="hidden" {...register("siteBackgroundImage")} />
        <label className="hidden">
          <input type="checkbox" {...register("enableSiteBackgroundImage")} />
        </label>
        <input type="hidden" {...register("heroTitle")} />
        <input type="hidden" {...register("heroSubtitle")} />
        <label className="hidden">
          <input type="checkbox" {...register("showHeroBanner")} />
        </label>
        <input type="hidden" {...register("heroCtaLabel")} />
        <input type="hidden" {...register("heroCtaHref")} />

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Hiển thị section</h3>
            <p className="mt-1 text-xs text-slate-500">Bật/tắt các khối hiển thị trên trang chủ storefront.</p>
          </div>
          {[
            ["enableFlashSaleSection", "Hiển thị mục đang giảm giá"],
            ["enableFeaturedSection", "Hiển thị mục nổi bật"],
            ["enableNewSection", "Hiển thị mục sản phẩm mới"],
            ["enableBestSellerSection", "Hiển thị mục bán chạy"],
            ["enableBrandSection", "Hiển thị mục thương hiệu"],
            ["enableBlogSection", "Hiển thị mục bài viết"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
              <input type="checkbox" {...register(field as keyof ThemeSettingsFormValues)} className="h-4 w-4 rounded border-zinc-300" />
              <span>{label}</span>
            </label>
          ))}
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Nút sản phẩm / CTA</h3>
            <p className="mt-1 text-xs text-slate-500">Cấu hình kiểu và nhãn nút trên thẻ sản phẩm/trang chi tiết.</p>
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Kiểu nút thẻ sản phẩm</span>
            <select {...register("productCardButtonMode")}>
              <option value="solid">Nền đặc</option>
              <option value="outline">Viền</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Nhãn nút thẻ sản phẩm</span>
            <input {...register("productCardButtonText")} placeholder="Ví dụ: Thêm giỏ" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Nhãn nút chính trang sản phẩm</span>
            <input {...register("productDetailPrimaryButtonText")} placeholder="Ví dụ: Mua ngay" />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
            <input type="checkbox" {...register("showAddToCartButton")} className="h-4 w-4 rounded border-zinc-300" />
            Hiển thị nút thêm vào giỏ
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
            <input type="checkbox" {...register("showBuyNowButton")} className="h-4 w-4 rounded border-zinc-300" />
            Hiển thị nút mua ngay
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Preview giao diện</h3>
            <p className="mt-1 text-xs text-slate-500">Mẫu xem nhanh card/nút theo màu đang nhập.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4" style={{ backgroundColor: "#F8FAFC" }}>
            <div className="rounded-lg border p-3" style={{ borderColor: secondary, backgroundColor: "#FFFFFF" }}>
              <p className="text-sm font-semibold" style={{ color: secondary }}>Thẻ sản phẩm mẫu</p>
              <p className="mt-1 text-xs text-slate-500">Mô tả ngắn hiển thị trên giao diện storefront.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: primary }}>
                  {watch("productCardButtonText") || "Thêm giỏ"}
                </button>
                <button type="button" className="rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: secondary, color: secondary }}>
                  {watch("productDetailPrimaryButtonText") || "Mua ngay"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {submitError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {submitSuccess}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Đang lưu..." : "Lưu cài đặt giao diện"}
      </button>
    </form>
  );
}

