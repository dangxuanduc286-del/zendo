"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  POST_STATUS_OPTIONS,
  postFormSchema,
  type PostAdminDto,
  type PostFormValues,
} from "../../lib/admin-post";
import { slugify } from "../../lib/slug";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface AdminPostFormProps {
  mode: "create" | "edit";
  postId?: string;
}

const DEFAULT_VALUES: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  thumbnail: "",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
};

export default function AdminPostForm({
  mode,
  postId,
}: AdminPostFormProps): JSX.Element {
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
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTitle = watch("title");
  const thumbnailValue = watch("thumbnail");

  useEffect(() => {
    if (!autoSlug) return;
    setValue("slug", slugify(watchedTitle || ""), { shouldValidate: true });
  }, [autoSlug, watchedTitle, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !postId) return;

    const loadPost = async () => {
      setLoadingData(true);
      setSubmitError("");
      const response = await fetch(`/api/admin/posts/${postId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: PostAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu bài viết.");
        setLoadingData(false);
        return;
      }
      reset({
        title: payload.item.title,
        slug: payload.item.slug,
        excerpt: payload.item.excerpt,
        content: payload.item.content,
        thumbnail: payload.item.thumbnail,
        seoTitle: payload.item.seoTitle,
        seoDescription: payload.item.seoDescription,
        status: payload.item.status,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };

    loadPost().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu bài viết.");
      setLoadingData(false);
    });
  }, [mode, postId, reset]);

  const onSubmit = async (values: PostFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${postId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu bài viết.");
      return;
    }
    router.push("/admin/posts");
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
      <div className="grid grid-cols-1 gap-4">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề *</span>
          <input
            {...register("title")}
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Tiêu đề bài viết"
          />
          {errors.title ? <p className="text-xs text-rose-600">{errors.title.message}</p> : null}
        </label>

        <label className="space-y-1">
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
            placeholder="tieu-de-bai-viet"
          />
          {errors.slug ? <p className="text-xs text-rose-600">{errors.slug.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mô tả ngắn</span>
          <textarea
            {...register("excerpt")}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Mô tả ngắn bài viết"
          />
          {errors.excerpt ? <p className="text-xs text-rose-600">{errors.excerpt.message}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Nội dung *</span>
          <textarea
            {...register("content")}
            rows={12}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Nội dung chi tiết bài viết"
          />
          {errors.content ? <p className="text-xs text-rose-600">{errors.content.message}</p> : null}
        </label>

        <input type="hidden" {...register("thumbnail")} />
        <div className="space-y-1">
          <AdminImageUploadField
            label="Ảnh đại diện bài viết"
            value={thumbnailValue}
            kind="post"
            onChange={(nextUrl) => setValue("thumbnail", nextUrl, { shouldDirty: true, shouldValidate: true })}
            previewClassName="h-28 w-full max-w-sm"
          />
          {errors.thumbnail ? <p className="text-xs text-rose-600">{errors.thumbnail.message}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Tiêu đề SEO</span>
            <input
              {...register("seoTitle")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
              placeholder="Tiêu đề SEO"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Trạng thái</span>
            <select
              {...register("status")}
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            >
              {POST_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mô tả SEO</span>
          <textarea
            {...register("seoDescription")}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            placeholder="Mô tả SEO"
          />
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
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo bài viết" : "Cập nhật bài viết"}
        </button>
        <Link
          href="/admin/posts"
          className={adminSecondaryButton}
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}

