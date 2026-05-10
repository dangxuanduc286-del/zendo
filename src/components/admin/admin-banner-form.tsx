"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BANNER_POSITION_OPTIONS,
  bannerFormSchema,
  type BannerAdminDto,
  type BannerFormValues,
} from "../../lib/admin-banner";
import { slugify } from "../../lib/slug";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface AdminBannerFormProps {
  mode: "create" | "edit";
  bannerId?: string;
}

const DEFAULT_VALUES: BannerFormValues = {
  title: "",
  slug: "",
  imageDesktop: "",
  imageMobile: "",
  linkUrl: "",
  position: "home_main",
  isActive: true,
};

export default function AdminBannerForm({
  mode,
  bannerId,
}: AdminBannerFormProps): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [autoSlug, setAutoSlug] = useState(mode === "create");
  const [ready, setReady] = useState(mode === "create");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTitle = watch("title");
  const imageDesktop = watch("imageDesktop");
  const imageMobile = watch("imageMobile");
  const selectedPosition = watch("position") || "home_main";
  const isMainBanner = selectedPosition === "home_main";
  const positionHelper = isMainBanner
    ? "Banner chính: khuyến nghị 1376x768px, tỷ lệ 16:9. Hiển thị trên desktop và mobile."
    : "Banner phụ: khuyến nghị 336x376px. Chỉ hiển thị trên desktop, mobile sẽ ẩn.";

  useEffect(() => {
    if (!autoSlug) return;
    setValue("slug", slugify(watchedTitle || ""), { shouldValidate: true });
  }, [autoSlug, watchedTitle, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !bannerId) return;

    const loadBanner = async () => {
      setLoadingData(true);
      setSubmitError("");
      const response = await fetch(`/api/admin/banners/${bannerId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: BannerAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu banner.");
        setLoadingData(false);
        return;
      }
      reset({
        title: payload.item.title,
        slug: payload.item.slug,
        imageDesktop: payload.item.imageDesktop,
        imageMobile: payload.item.imageMobile,
        linkUrl: payload.item.linkUrl,
        position: payload.item.position || "home_main",
        isActive: payload.item.isActive,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };

    loadBanner().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu banner.");
      setLoadingData(false);
    });
  }, [mode, bannerId, reset]);

  const onSubmit = async (values: BannerFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/banners" : `/api/admin/banners/${bannerId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu banner.");
      return;
    }
    router.push("/admin/banners");
    router.refresh();
  };

  if (!ready || loadingData) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải dữ liệu...
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Quy trình tạo banner</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            <li>Chuẩn bị ảnh đúng kích thước khuyến nghị theo vị trí banner.</li>
            <li>Nhập tiêu đề rõ nghĩa để dễ quản lý nội dung chiến dịch.</li>
            <li>Upload ảnh desktop và chọn đúng vị trí hiển thị trong 5 vị trí chuẩn.</li>
            <li>Nhập link URL nếu muốn banner có thể click chuyển trang.</li>
            <li>Bật trạng thái hoạt động rồi lưu banner.</li>
            <li>Mở trang chủ để kiểm tra hiển thị desktop/mobile sau khi lưu.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            Nếu có nhiều banner cùng vị trí, storefront ưu tiên banner đang hoạt động theo logic hiện có.
            Mobile chỉ hiển thị banner chính, banner phụ chỉ hiển thị trên desktop.
          </p>
        </section>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề *</span>
          <input
            {...register("title")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Banner trang chủ"
          />
          {errors.title ? <p className="text-xs text-rose-600">{errors.title.message}</p> : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Slug *</span>
            <button
              type="button"
              onClick={() => setAutoSlug(true)}
              className="text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              Tự động từ tiêu đề
            </button>
          </div>
          <input
            {...register("slug", { onChange: () => setAutoSlug(false) })}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="banner-trang-chu"
          />
          {errors.slug ? <p className="text-xs text-rose-600">{errors.slug.message}</p> : null}
        </label>

        <input type="hidden" {...register("imageDesktop")} />
        <div className="space-y-1 sm:col-span-2">
          <AdminImageUploadField
            label="Ảnh banner desktop *"
            value={imageDesktop}
            kind="banner"
            hint="Upload ảnh đúng kích thước để tránh méo hoặc cắt mất nội dung."
            onChange={(nextUrl) => setValue("imageDesktop", nextUrl, { shouldDirty: true, shouldValidate: true })}
            previewClassName="h-24 w-full max-w-md"
          />
          {errors.imageDesktop ? <p className="text-xs text-rose-600">{errors.imageDesktop.message}</p> : null}
        </div>

        <input type="hidden" {...register("imageMobile")} />
        <div className="space-y-1 sm:col-span-2">
          <AdminImageUploadField
            label="Ảnh banner mobile"
            value={imageMobile}
            kind="banner"
            hint="Chỉ dùng cho banner chính nếu hệ thống đang hỗ trợ ảnh mobile. Banner phụ không hiển thị trên mobile."
            onChange={(nextUrl) => setValue("imageMobile", nextUrl, { shouldDirty: true, shouldValidate: true })}
            previewClassName="h-24 w-48"
          />
          {errors.imageMobile ? <p className="text-xs text-rose-600">{errors.imageMobile.message}</p> : null}
        </div>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Link URL</span>
          <input
            {...register("linkUrl")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="/khuyến-mãi"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Vị trí hiển thị *</span>
          <select
            {...register("position")}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          >
            {BANNER_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} - {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">{positionHelper}</p>
          {errors.position ? <p className="text-xs text-rose-600">{errors.position.message}</p> : null}
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-zinc-300" />
          <span>Đang hoạt động</span>
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
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo banner" : "Cập nhật banner"}
        </button>
        <Link
          href="/admin/banners"
          className={adminSecondaryButton}
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}

