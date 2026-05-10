"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categoryFormSchema,
  type CategoryAdminDto,
  type CategoryFormValues,
} from "../../lib/admin-category";
import { slugify } from "../../lib/slug";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface AdminCategoryFormProps {
  mode: "create" | "edit";
  categoryId?: string;
  parentIdPreset?: string;
}

const DEFAULT_VALUES: CategoryFormValues = {
  name: "",
  slug: "",
  parentId: "",
  sortOrder: 0,
  image: "",
  shortDescription: "",
  seoTitle: "",
  seoDescription: "",
  isActive: true,
  showOnHome: true,
};

export default function AdminCategoryForm({
  mode,
  categoryId,
  parentIdPreset = "",
}: AdminCategoryFormProps): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [autoSlug, setAutoSlug] = useState(mode === "create");
  const [ready, setReady] = useState(mode === "create");
  const [parents, setParents] = useState<Array<Pick<CategoryAdminDto, "id" | "name">>>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedName = watch("name");
  const imageValue = watch("image");

  useEffect(() => {
    if (!autoSlug) return;
    const generated = slugify(watchedName || "");
    setValue("slug", generated, { shouldValidate: true });
  }, [autoSlug, watchedName, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !categoryId) return;

    const loadCategory = async () => {
      setLoadingData(true);
      setSubmitError("");
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { item?: CategoryAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu danh mục.");
        setLoadingData(false);
        return;
      }
      reset({
        name: payload.item.name,
        slug: payload.item.slug,
        parentId: payload.item.parentId ?? "",
        sortOrder: payload.item.sortOrder,
        image: payload.item.image ?? "",
        shortDescription: payload.item.shortDescription ?? "",
        seoTitle: payload.item.seoTitle ?? "",
        seoDescription: payload.item.seoDescription ?? "",
        isActive: payload.item.isActive,
        showOnHome: payload.item.showOnHome ?? true,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };

    loadCategory().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu danh mục.");
      setLoadingData(false);
    });
  }, [mode, categoryId, reset]);

  useEffect(() => {
    const loadParents = async () => {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const payload = (await response.json()) as { items?: CategoryAdminDto[] };
      const nextParents =
        (payload.items ?? [])
          .filter((item) => item.level === 1 && item.id !== categoryId)
          .map((item) => ({ id: item.id, name: item.name })) ?? [];
      setParents(nextParents);
      if (mode === "create" && parentIdPreset) {
        setValue("parentId", parentIdPreset, { shouldValidate: true });
      }
    };
    loadParents().catch(() => {
      setParents([]);
    });
  }, [categoryId, mode, parentIdPreset, setValue]);

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/categories" : `/api/admin/categories/${categoryId}`;
    const method = mode === "create" ? "POST" : "PATCH";


    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu danh mục.");
      return;
    }

    router.push("/admin/categories");
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
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Tên danh mục *</span>
          <input
            {...register("name")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập tên danh mục"
          />
          {errors.name ? <p className="text-xs text-rose-600">{errors.name.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Danh mục cha</span>
          <select
            {...register("parentId")}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          >
            <option value="">Danh mục cha (cấp 1)</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
          {errors.parentId ? <p className="text-xs text-rose-600">{errors.parentId.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Thứ tự hiển thị</span>
          <input
            type="number"
            {...register("sortOrder", { valueAsNumber: true })}
            min={0}
            max={9999}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="0"
          />
          {errors.sortOrder ? <p className="text-xs text-rose-600">{errors.sortOrder.message}</p> : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Slug *</span>
            <button
              type="button"
              onClick={() => setAutoSlug(true)}
              className="text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              Tự động từ tên
            </button>
          </div>
          <input
            {...register("slug", {
              onChange: () => setAutoSlug(false),
            })}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="slug-danh-muc"
          />
          {errors.slug ? <p className="text-xs text-rose-600">{errors.slug.message}</p> : null}
        </label>

        <input type="hidden" {...register("image")} />
        <div className="space-y-1 sm:col-span-2">
          <AdminImageUploadField
            label="Ảnh danh mục"
            value={imageValue}
            kind="category"
            onChange={(nextUrl) => setValue("image", nextUrl, { shouldDirty: true, shouldValidate: true })}
          />
          {errors.image ? <p className="text-xs text-rose-600">{errors.image.message}</p> : null}
        </div>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Mô tả ngắn</span>
          <textarea
            {...register("shortDescription")}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Mô tả ngắn cho danh mục"
          />
          {errors.shortDescription ? (
            <p className="text-xs text-rose-600">{errors.shortDescription.message}</p>
          ) : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề SEO</span>
          <input
            {...register("seoTitle")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập tiêu đề SEO"
          />
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
          {errors.seoDescription ? (
            <p className="text-xs text-rose-600">{errors.seoDescription.message}</p>
          ) : null}
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-zinc-300" />
          <span>Đang hoạt động</span>
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
          <input type="checkbox" {...register("showOnHome")} className="h-4 w-4 rounded border-zinc-300" />
          <span>Hiển thị trên homepage</span>
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
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo danh mục" : "Cập nhật danh mục"}
        </button>
        <Link
          href="/admin/categories"
          className={adminSecondaryButton}
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
