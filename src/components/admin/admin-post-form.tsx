"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
import { AdminSeoKeywordsField } from "./admin-seo-keywords-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";
import SeoProductPicker, {
  type SeoProductPickerItem,
} from "./seo-product-picker";

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
  seoKeywords: { main: "", sub: [] },
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

  // ── SEO Products state ─────────────────────────────────────────
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [seoProducts, setSeoProducts] = useState<SeoProductPickerItem[]>([]);
  const [seoError, setSeoError] = useState("");
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoLoaded, setSeoLoaded] = useState(false);

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
  const seoTitleValue = watch("seoTitle");
  const seoDescriptionValue = watch("seoDescription");
  const watchedSlug = watch("slug");

  const [seoMain, setSeoMain] = useState("");
  const [seoSub, setSeoSub] = useState<string[]>([]);

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
      const sk = payload.item.seoKeywords ?? { main: "", sub: [] };
      reset({
        title: payload.item.title,
        slug: payload.item.slug,
        excerpt: payload.item.excerpt,
        content: payload.item.content,
        thumbnail: payload.item.thumbnail,
        seoTitle: payload.item.seoTitle,
        seoDescription: payload.item.seoDescription,
        seoKeywords: sk,
        status: payload.item.status,
      });
      setSeoMain(sk.main ?? "");
      setSeoSub(sk.sub ?? []);
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };

    loadPost().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu bài viết.");
      setLoadingData(false);
    });
  }, [mode, postId, reset]);

  // ── Load SEO products (edit mode) ────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !postId || !ready || seoLoaded) return;
    const loadSeo = async () => {
      try {
        const res = await fetch(`/api/admin/posts/${postId}/seo-products`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: SeoProductPickerItem[] };
        setSeoProducts(data.items);
      } catch {
        // Non-critical — don't block UI
      } finally {
        setSeoLoaded(true);
        setCreatedId(postId);
      }
    };
    loadSeo();
  }, [mode, postId, ready, seoLoaded]);

  const handleSeoKeywordsChange = useCallback(
    (main: string, sub: string[]) => {
      setSeoMain(main);
      setSeoSub(sub);
      setValue("seoKeywords", { main, sub }, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = async (values: PostFormValues) => {
    setSubmitError("");
    setSeoError("");

    const endpoint = mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${postId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { item?: { id: string }; message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu bài viết.");
      return;
    }

    // Determine the post ID (create mode returns it in payload.item.id)
    const effectivePostId = mode === "create" ? payload.item?.id : postId;

    // ── Save SEO products (non-blocking for post save) ─────────
    if (effectivePostId && seoProducts.length > 0) {
      setSeoSaving(true);
      try {
        const seoRes = await fetch(`/api/admin/posts/${effectivePostId}/seo-products`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: seoProducts.map((s) => ({
              productId: s.productId,
              sortOrder: s.sortOrder,
            })),
          }),
        });
        if (!seoRes.ok) {
          setSeoError("Đã lưu bài viết nhưng chưa lưu được liên kết SEO.");
        }
      } catch {
        setSeoError("Đã lưu bài viết nhưng chưa lưu được liên kết SEO.");
      } finally {
        setSeoSaving(false);
      }
    }

    // Update createdId for create mode so picker appears
    if (mode === "create" && effectivePostId) {
      setCreatedId(effectivePostId);
    }

    // Redirect to edit page so admin can add SEO products immediately
    const redirectUrl = mode === "create" && effectivePostId ? `/admin/posts/${effectivePostId}` : "/admin/posts";
    router.push(redirectUrl);
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

        {/* SEO Keywords */}
        <input type="hidden" {...register("seoKeywords")} />
        <AdminSeoKeywordsField
          mainKeyword={seoMain}
          subKeywords={seoSub}
          onChange={handleSeoKeywordsChange}
          slug={watchedSlug}
          kind="post"
          title={seoTitleValue || watchedTitle}
          metaDescription={seoDescriptionValue}
        />
      </div>

      {/* ── SEO Product Picker ──────────────────────────────── */}
      <div className="border-t border-zinc-200 pt-4">
        {mode === "create" && !createdId ? (
          <p className="text-sm text-zinc-400">
            Sau khi tạo bài viết thành công, bạn có thể thêm sản phẩm liên quan (SEO).
          </p>
        ) : (
          <>
            {seoSaving && (
              <p className="mb-3 text-sm font-medium text-sky-600">Đang lưu liên kết sản phẩm SEO…</p>
            )}
            <SeoProductPicker
              selected={seoProducts}
              onChange={(items) => {
                setSeoProducts(
                  items.map((item) => {
                    const existing = seoProducts.find((s) => s.productId === item.productId);
                    return {
                      productId: item.productId,
                      sortOrder: item.sortOrder,
                      product: existing?.product ?? { name: "", slug: "", price: 0, imageUrl: "" },
                    };
                  }),
                );
              }}
            />
          </>
        )}
      </div>

      {seoError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          {seoError}
        </p>
      ) : null}

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
