"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  brandFormSchema,
  type BrandAdminDto,
  type BrandFormValues,
} from "../../lib/admin-brand";
import { slugify } from "../../lib/slug";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface AdminBrandFormProps {
  mode: "create" | "edit";
  brandId?: string;
}

const DEFAULT_VALUES: BrandFormValues = {
  name: "",
  slug: "",
  logo: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  isActive: true,
};

export default function AdminBrandForm({
  mode,
  brandId,
}: AdminBrandFormProps): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [autoSlug, setAutoSlug] = useState(mode === "create");
  const [ready, setReady] = useState(mode === "create");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedName = watch("name");
  const logoValue = watch("logo");

  useEffect(() => {
    if (!autoSlug) return;
    const generated = slugify(watchedName || "");
    setValue("slug", generated, { shouldValidate: true });
  }, [autoSlug, watchedName, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !brandId) return;

    const loadBrand = async () => {
      setLoadingData(true);
      setSubmitError("");
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { item?: BrandAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu thương hiệu.");
        setLoadingData(false);
        return;
      }
      reset({
        name: payload.item.name,
        slug: payload.item.slug,
        logo: payload.item.logo ?? "",
        description: payload.item.description ?? "",
        seoTitle: payload.item.seoTitle ?? "",
        seoDescription: payload.item.seoDescription ?? "",
        isActive: payload.item.isActive,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };

    loadBrand().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu thương hiệu.");
      setLoadingData(false);
    });
  }, [mode, brandId, reset]);

  const onSubmit = async (values: BrandFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/brands" : `/api/admin/brands/${brandId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu thương hiệu.");
      return;
    }

    router.push("/admin/brands");
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
      className="max-w-5xl space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Tên thương hiệu *</span>
          <input
            {...register("name")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập tên thương hiệu"
          />
          {errors.name ? <p className="text-xs text-rose-600">{errors.name.message}</p> : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Slug *</span>
            <button
              type="button"
              onClick={() => {
                const generated = slugify(watchedName || "");
                setValue("slug", generated, { shouldValidate: true, shouldDirty: true });
                setAutoSlug(true);
              }}
              className="text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              Tạo slug
            </button>
          </div>
          <input
            {...register("slug", {
              onChange: () => setAutoSlug(false),
            })}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="slug-thuong-hieu"
          />
          {errors.slug ? <p className="text-xs text-rose-600">{errors.slug.message}</p> : null}
        </label>

        <input type="hidden" {...register("logo")} />
        <div className="space-y-1 sm:col-span-2">
          <AdminImageUploadField
            label="Logo thương hiệu"
            value={logoValue}
            kind="brand"
            onChange={(nextUrl) => setValue("logo", nextUrl, { shouldDirty: true, shouldValidate: true })}
            previewClassName="h-24 w-24"
            hint="Khuyến nghị ảnh vuông 400x400px hoặc logo ngang 600x240px."
          />
          {errors.logo ? <p className="text-xs text-rose-600">{errors.logo.message}</p> : null}
        </div>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Mô tả</span>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Mô tả thương hiệu"
          />
          {errors.description ? (
            <p className="text-xs text-rose-600">{errors.description.message}</p>
          ) : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề SEO</span>
          <input
            {...register("seoTitle")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập tiêu đề SEO"
          />
          <p className="text-xs text-zinc-500">Nên dưới 60 ký tự.</p>
          {errors.seoTitle ? <p className="text-xs text-rose-600">{errors.seoTitle.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mô tả SEO</span>
          <textarea
            {...register("seoDescription")}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập mô tả SEO"
          />
          <p className="text-xs text-zinc-500">Nên dưới 160 ký tự.</p>
          {errors.seoDescription ? (
            <p className="text-xs text-rose-600">{errors.seoDescription.message}</p>
          ) : null}
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
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo thương hiệu" : "Cập nhật thương hiệu"}
        </button>
        <Link
          href="/admin/brands"
          className={adminSecondaryButton}
        >
          Danh sách thương hiệu
        </Link>
      </div>
    </form>
  );
}
