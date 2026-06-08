"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pageFormSchema, PAGE_STATUS_OPTIONS, type PageAdminDto, type PageFormValues } from "../../lib/admin-page";
import { slugify } from "../../lib/slug";
import { AdminSeoKeywordsField } from "./admin-seo-keywords-field";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";
import SeoLinkPicker, { type SeoLinkItem } from "./seo-link-picker";

export default function AdminPageForm({ mode, pageId }: { mode: "create" | "edit"; pageId?: string }): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [ready, setReady] = useState(mode === "create");
  const [autoSlug, setAutoSlug] = useState(mode === "create");

  // ── SEO Links state ────────────────────────────────────────────
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [seoLinks, setSeoLinks] = useState<SeoLinkItem[]>([]);
  const [seoError, setSeoError] = useState("");
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoLoaded, setSeoLoaded] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: { main: "", sub: [] },
      status: "DRAFT",
    },
  });

  const watchedTitle = watch("title");
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
    if (mode !== "edit" || !pageId) return;
    const loadItem = async () => {
      setLoadingData(true);
      const response = await fetch(`/api/admin/pages/${pageId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: PageAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu trang.");
        setLoadingData(false);
        return;
      }
      const sk = payload.item.seoKeywords ?? { main: "", sub: [] };
      reset({
        title: payload.item.title,
        slug: payload.item.slug,
        content: payload.item.content,
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
    loadItem().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu.");
      setLoadingData(false);
    });
  }, [mode, pageId, reset]);

  // ── Load SEO links (edit mode) ──────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !pageId || !ready || seoLoaded) return;
    const loadSeo = async () => {
      try {
        const res = await fetch(`/api/admin/pages/${pageId}/seo-links`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: SeoLinkItem[] };
        setSeoLinks(data.items);
      } catch {
        // Non-critical
      } finally {
        setSeoLoaded(true);
        setCreatedId(pageId);
      }
    };
    loadSeo();
  }, [mode, pageId, ready, seoLoaded]);

  const handleSeoKeywordsChange = useCallback(
    (main: string, sub: string[]) => {
      setSeoMain(main);
      setSeoSub(sub);
      setValue("seoKeywords", { main, sub }, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = async (values: PageFormValues) => {
    setSubmitError("");
    setSeoError("");

    const endpoint = mode === "create" ? "/api/admin/pages" : `/api/admin/pages/${pageId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { item?: { id: string }; message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu trang.");
      return;
    }

    // Determine the page ID (create mode returns it in payload.item.id)
    const effectivePageId = mode === "create" ? payload.item?.id : pageId;

    // ── Save SEO links (non-blocking for page save) ───────────
    if (effectivePageId && seoLinks.length > 0) {
      setSeoSaving(true);
      try {
        const seoRes = await fetch(`/api/admin/pages/${effectivePageId}/seo-links`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            links: seoLinks.map((link) => ({
              linkType: link.linkType,
              referenceId: link.referenceId,
              title: link.title,
              slug: link.slug,
              url: link.url,
              thumbnail: link.thumbnail,
              anchorText: link.anchorText,
              sortOrder: link.sortOrder,
            })),
          }),
        });
        if (!seoRes.ok) {
          setSeoError("Đã lưu trang nội dung nhưng chưa lưu được liên kết SEO.");
        }
      } catch {
        setSeoError("Đã lưu trang nội dung nhưng chưa lưu được liên kết SEO.");
      } finally {
        setSeoSaving(false);
      }
    }

    // Update createdId so picker appears in create mode
    if (mode === "create" && effectivePageId) {
      setCreatedId(effectivePageId);
    }

    // Redirect to edit page so admin can add SEO links immediately
    const redirectUrl = mode === "create" && effectivePageId ? `/admin/pages/${effectivePageId}` : "/admin/pages";
    router.push(redirectUrl);
    router.refresh();
  };

  if (!ready || loadingData) {
    return <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Đang tải dữ liệu...</section>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề *</span>
          <input {...register("title")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.title ? <p className="text-xs text-rose-600">{errors.title.message}</p> : null}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Slug *</span>
          <input {...register("slug", { onChange: () => setAutoSlug(false) })} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.slug ? <p className="text-xs text-rose-600">{errors.slug.message}</p> : null}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Nội dung *</span>
          <textarea {...register("content")} rows={10} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
          {errors.content ? <p className="text-xs text-rose-600">{errors.content.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">SEO title</span>
          <input {...register("seoTitle")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">SEO description</span>
          <textarea {...register("seoDescription")} rows={2} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Trạng thái</span>
          <select {...register("status")} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500">
            {PAGE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {/* SEO Keywords - full width */}
        <div className="sm:col-span-2">
          <input type="hidden" {...register("seoKeywords")} />
          <AdminSeoKeywordsField
            mainKeyword={seoMain}
            subKeywords={seoSub}
            onChange={handleSeoKeywordsChange}
            slug={watchedSlug}
            kind="page"
            title={seoTitleValue || watchedTitle}
            metaDescription={seoDescriptionValue}
          />
        </div>
      </div>

      {/* ── SEO Link Picker ─────────────────────────────────── */}
      <div className="border-t border-zinc-200 pt-4">
        {mode === "create" && !createdId ? (
          <p className="text-sm text-zinc-400">
            Sau khi tạo trang thành công, bạn có thể thêm liên kết SEO.
          </p>
        ) : (
          <>
            {seoSaving && (
              <p className="mb-3 text-sm font-medium text-sky-600">Đang lưu liên kết SEO…</p>
            )}
            <SeoLinkPicker
              selected={seoLinks}
              onChange={(links) => setSeoLinks(links)}
            />
          </>
        )}
      </div>

      {seoError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          {seoError}
        </p>
      ) : null}
      {submitError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{submitError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo trang" : "Cập nhật trang"}
        </button>
        <Link href="/admin/pages" className={adminSecondaryButton}>Hủy</Link>
      </div>
    </form>
  );
}
