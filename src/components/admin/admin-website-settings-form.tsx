"use client";

// Legacy note:
// Component này thuộc pipeline full PATCH /api/admin/settings/website cũ.
// Không dùng cho route /admin/website-appearance (route này dùng section PATCH mới).

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  websiteSettingsFormSchema,
  type WebsiteSettingsFormValues,
} from "../../lib/admin-settings";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton } from "../../lib/admin-ui";

const DEFAULT_VALUES: WebsiteSettingsFormValues = {
  siteName: "",
  slogan: "",
  shortDescription: "",
  siteUrl: "",
  canonicalBaseUrl: "",
  logoUrl: "",
  footerLogoUrl: "",
  productPlaceholderImage: "",
  faviconUrl: "",
  hotline: "",
  email: "",
  address: "",
  footerText: "",
  defaultSeoTitle: "",
  defaultSeoDescription: "",
  defaultSeoKeywords: "",
  defaultOgImage: "",
  robotsIndex: true,
  robotsFollow: true,
  socialLinksJson: "[]",
};

export default function AdminWebsiteSettingsForm(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WebsiteSettingsFormValues>({
    resolver: zodResolver(websiteSettingsFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setSubmitError("");
      const response = await fetch("/api/admin/settings/website", { cache: "no-store" });
      const payload = (await response.json()) as {
        item?: Partial<WebsiteSettingsFormValues> & { socialLinksJson?: string };
        message?: string;
      };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải cài đặt website.");
        setLoading(false);
        return;
      }
      reset({
        siteName: payload.item.siteName ?? "",
        slogan: payload.item.slogan ?? "",
        shortDescription: payload.item.shortDescription ?? "",
        siteUrl: payload.item.siteUrl ?? "",
        canonicalBaseUrl: payload.item.canonicalBaseUrl ?? payload.item.siteUrl ?? "",
        logoUrl: payload.item.logoUrl ?? "",
        footerLogoUrl: payload.item.footerLogoUrl ?? payload.item.logoUrl ?? "",
        productPlaceholderImage: payload.item.productPlaceholderImage ?? "",
        faviconUrl: payload.item.faviconUrl ?? "",
        hotline: payload.item.hotline ?? "",
        email: payload.item.email ?? "",
        address: payload.item.address ?? "",
        footerText: payload.item.footerText ?? "",
        defaultSeoTitle: payload.item.defaultSeoTitle ?? "",
        defaultSeoDescription: payload.item.defaultSeoDescription ?? "",
        defaultSeoKeywords: payload.item.defaultSeoKeywords ?? "",
        defaultOgImage: payload.item.defaultOgImage ?? "",
        robotsIndex: payload.item.robotsIndex ?? true,
        robotsFollow: payload.item.robotsFollow ?? true,
        socialLinksJson: payload.item.socialLinksJson ?? "[]",
      });
      setLoading(false);
    };
    loadSettings().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải cài đặt website.");
      setLoading(false);
    });
  }, [reset]);

  const onSubmit = async (values: WebsiteSettingsFormValues) => {
    setSubmitError("");
    setSubmitSuccess("");
    const response = await fetch("/api/admin/settings/website", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu cài đặt website.");
      return;
    }
    setSubmitSuccess("Đã cập nhật cài đặt website.");
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải cài đặt website...
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tên website *</span>
          <input {...register("siteName")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.siteName ? <p className="text-xs text-rose-600">{errors.siteName.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">URL website *</span>
          <input {...register("siteUrl")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.siteUrl ? <p className="text-xs text-rose-600">{errors.siteUrl.message}</p> : null}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Canonical base URL *</span>
          <input {...register("canonicalBaseUrl")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.canonicalBaseUrl ? <p className="text-xs text-rose-600">{errors.canonicalBaseUrl.message}</p> : null}
        </label>
        <input type="hidden" {...register("logoUrl")} />
        <div className="space-y-1">
          <AdminImageUploadField
            label="Logo"
            value={watch("logoUrl")}
            kind="logo"
            previewClassName="h-16 w-36"
            onChange={(nextUrl) => setValue("logoUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
        <input type="hidden" {...register("faviconUrl")} />
        <div className="space-y-1">
          <AdminImageUploadField
            label="Favicon"
            value={watch("faviconUrl")}
            kind="favicon"
            previewClassName="h-14 w-14"
            onChange={(nextUrl) => setValue("faviconUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Hotline</span>
          <input {...register("hotline")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input {...register("email")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Địa chỉ</span>
          <input {...register("address")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Slogan</span>
          <input {...register("slogan")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Mô tả ngắn</span>
          <textarea {...register("shortDescription")} rows={2} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Nội dung chân trang</span>
          <textarea {...register("footerText")} rows={2} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề SEO mặc định</span>
          <input {...register("defaultSeoTitle")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <input type="hidden" {...register("defaultOgImage")} />
        <div className="space-y-1">
          <AdminImageUploadField
            label="Ảnh OG mặc định"
            value={watch("defaultOgImage")}
            kind="og"
            previewClassName="h-24 w-full max-w-sm"
            onChange={(nextUrl) => setValue("defaultOgImage", nextUrl, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Mô tả SEO mặc định</span>
          <textarea {...register("defaultSeoDescription")} rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Meta keywords mặc định</span>
          <input {...register("defaultSeoKeywords")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" {...register("robotsIndex")} className="h-4 w-4 rounded border-zinc-300" />
          Robots index
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" {...register("robotsFollow")} className="h-4 w-4 rounded border-zinc-300" />
          Robots follow
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">JSON liên kết mạng xã hội</span>
          <textarea {...register("socialLinksJson")} rows={8} className="font-mono w-full rounded-md border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-zinc-500" />
          {errors.socialLinksJson ? (
            <p className="text-xs text-rose-600">{errors.socialLinksJson.message}</p>
          ) : null}
        </label>
      </div>

      {submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {submitSuccess}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={adminPrimaryButton}
      >
        {isSubmitting ? "Đang lưu..." : "Lưu cài đặt website"}
      </button>
    </form>
  );
}

