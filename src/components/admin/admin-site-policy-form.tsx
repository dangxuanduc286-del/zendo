"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SITE_POLICY_TYPE_LABELS,
  SITE_POLICY_TYPE_VALUES,
  sitePolicyFormSchema,
  type SitePolicyAdminDto,
  type SitePolicyFormValues,
} from "../../lib/admin-site-policy";
import { slugify } from "../../lib/slug";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

const AdminSitePolicyRichTextEditor = dynamic(() => import("./admin-site-policy-rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-10 text-center text-sm text-slate-500">
      Đang tải trình soạn thảo…
    </div>
  ),
});

const DEFAULT_VALUES: SitePolicyFormValues = {
  title: "",
  slug: "",
  type: "CUSTOM",
  content: "<p></p>",
  excerpt: "",
  isPublished: false,
  sortOrder: 0,
};

export default function AdminSitePolicyForm({
  mode,
  policyId,
}: {
  mode: "create" | "edit";
  policyId?: string;
}): JSX.Element {
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<SitePolicyFormValues>({
    resolver: zodResolver(sitePolicyFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTitle = watch("title");

  useEffect(() => {
    if (!autoSlug) return;
    setValue("slug", slugify(watchedTitle || ""), { shouldValidate: true });
  }, [autoSlug, watchedTitle, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !policyId) return;
    const load = async () => {
      setLoadingData(true);
      setSubmitError("");
      const res = await fetch(`/api/admin/site-policies/${policyId}`, { cache: "no-store" });
      const payload = (await res.json()) as { item?: SitePolicyAdminDto; message?: string };
      if (!res.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải chính sách.");
        setLoadingData(false);
        return;
      }
      reset({
        title: payload.item.title,
        slug: payload.item.slug,
        type: payload.item.type,
        content: payload.item.content || "<p></p>",
        excerpt: payload.item.excerpt ?? "",
        isPublished: payload.item.isPublished,
        sortOrder: payload.item.sortOrder,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };
    load().catch(() => {
      setSubmitError("Có lỗi khi tải dữ liệu.");
      setLoadingData(false);
    });
  }, [mode, policyId, reset]);

  const onSubmit = async (values: SitePolicyFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/site-policies" : `/api/admin/site-policies/${policyId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await res.json()) as { message?: string };
    if (!res.ok) {
      setSubmitError(payload.message ?? "Không thể lưu.");
      return;
    }
    router.push("/admin/site-policies");
    router.refresh();
  };

  if (!ready || loadingData) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Đang tải dữ liệu…
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-slate-800">Tiêu đề</span>
          <input {...register("title")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.title ? <span className="text-xs text-rose-600">{errors.title.message}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Slug (URL /chinh-sach/…)</span>
          <div className="flex flex-wrap items-center gap-2">
            <input {...register("slug")} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={autoSlug}
                onChange={(e) => setAutoSlug(e.target.checked)}
                className="rounded border-slate-300"
              />
              Tự slug theo tiêu đề
            </label>
          </div>
          {errors.slug ? <span className="text-xs text-rose-600">{errors.slug.message}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Loại</span>
          <select {...register("type")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {SITE_POLICY_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {SITE_POLICY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-slate-800">Mô tả ngắn (card / meta)</span>
          <textarea {...register("excerpt")} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" {...register("isPublished")} className="rounded border-slate-300" />
          Xuất bản (hiển thị trên website &amp; tài khoản)
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Thứ tự</span>
          <input
            type="number"
            {...register("sortOrder", { valueAsNumber: true, min: 0 })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-800">Nội dung</span>
        <Controller
          name="content"
          control={control}
          render={({ field }) => <AdminSitePolicyRichTextEditor value={field.value} onChange={field.onChange} />}
        />
        {errors.content ? <span className="text-xs text-rose-600">{errors.content.message}</span> : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
          {isSubmitting ? "Đang lưu…" : "Lưu"}
        </button>
        <Link href="/admin/site-policies" className={adminSecondaryButton}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}
