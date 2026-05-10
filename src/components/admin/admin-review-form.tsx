"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_OPTIONS,
  reviewFormSchema,
  type ReviewAdminDto,
  type ReviewFormValues,
} from "../../lib/admin-review";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface ProductOption {
  id: string;
  name: string;
}

const DEFAULT_VALUES: ReviewFormValues = {
  productId: "",
  rating: 5,
  title: "",
  content: "",
  guestName: "",
  guestEmail: "",
  reviewedAt: "",
  status: "PENDING",
  reviewImages: [],
};

function toDatetimeLocalValue(input?: string | null): string {
  if (!input) return "";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "";
  const offsetMs = dt.getTimezoneOffset() * 60_000;
  const local = new Date(dt.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

const REVIEW_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const REVIEW_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const REVIEW_MAX_IMAGES = 5;

async function uploadReviewImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "images/reviews");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.message ?? "Không thể tải ảnh lên. Vui lòng thử lại.");
  }
  return payload.url;
}

export default function AdminReviewForm({ mode, reviewId }: { mode: "create" | "edit"; reviewId?: string }): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [ready, setReady] = useState(mode === "create");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const reviewImages = watch("reviewImages") ?? [];

  useEffect(() => {
    register("reviewImages");
  }, [register]);

  const addImages = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploadError("");
    setUploadSummary("");
    const remainingSlots = Math.max(0, REVIEW_MAX_IMAGES - reviewImages.length);
    if (remainingSlots <= 0) {
      setUploadError("Mỗi đánh giá chỉ được tải tối đa 5 ảnh.");
      return;
    }
    const selectedFiles = Array.from(fileList);
    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setUploadError("Mỗi đánh giá chỉ được tải tối đa 5 ảnh.");
    }
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const failedMessages: string[] = [];
      for (const file of acceptedFiles) {
        if (!REVIEW_ALLOWED_TYPES.has(file.type)) {
          failedMessages.push(`${file.name}: File không đúng định dạng ảnh.`);
          continue;
        }
        if (file.size > REVIEW_MAX_FILE_SIZE_BYTES) {
          failedMessages.push(`${file.name}: Ảnh vượt quá 5MB.`);
          continue;
        }
        try {
          uploadedUrls.push(await uploadReviewImage(file));
        } catch {
          failedMessages.push(`${file.name}: Không thể tải ảnh lên. Vui lòng thử lại.`);
        }
      }
      const next = [...reviewImages, ...uploadedUrls].slice(0, REVIEW_MAX_IMAGES);
      setValue("reviewImages", next, { shouldDirty: true, shouldValidate: true });
      if (failedMessages.length) {
        setUploadError(failedMessages.slice(0, 3).join(" "));
      }
      if (uploadedUrls.length) {
        setUploadSummary(`Đã tải ${uploadedUrls.length} ảnh thành công.`);
      }
    } catch {
      setUploadError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addImages(event.dataTransfer.files).catch(() => {});
  };

  const removeImage = (index: number) => {
    const next = reviewImages.filter((_, idx) => idx !== index);
    setValue("reviewImages", next, { shouldDirty: true, shouldValidate: true });
  };

  useEffect(() => {
    const loadProducts = async () => {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const payload = (await response.json()) as { items?: Array<{ id: string; name: string }> };
      setProducts(payload.items ?? []);
    };
    loadProducts().catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !reviewId) return;
    const loadItem = async () => {
      setLoadingData(true);
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: ReviewAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu đánh giá.");
        setLoadingData(false);
        return;
      }
      reset({
        productId: payload.item.productId,
        rating: payload.item.rating,
        title: payload.item.title,
        content: payload.item.content,
        guestName: payload.item.guestName,
        guestEmail: payload.item.guestEmail,
        reviewedAt: toDatetimeLocalValue(payload.item.createdAt),
        reviewImages: payload.item.reviewImages ?? [],
        status: payload.item.status,
      });
      setLoadingData(false);
      setReady(true);
    };
    loadItem().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu.");
      setLoadingData(false);
    });
  }, [mode, reviewId, reset]);

  const onSubmit = async (values: ReviewFormValues) => {
    setSubmitError("");
    setSubmitSuccess("");
    const endpoint = mode === "create" ? "/api/admin/reviews" : `/api/admin/reviews/${reviewId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu đánh giá.");
      return;
    }
    setSubmitSuccess(mode === "create" ? "Đã tạo đánh giá thành công." : "Đã cập nhật đánh giá thành công.");
    router.push("/admin/reviews");
    router.refresh();
  };

  if (!ready || loadingData) {
    return <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-zinc-600 shadow-sm">Đang tải dữ liệu...</section>;
  }
  const status = watch("status");
  const isVisibleOnStorefront = status === "APPROVED";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Sản phẩm *</span>
          <select {...register("productId")} className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500">
            <option value="">Chọn sản phẩm</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          {errors.productId ? <p className="text-xs text-rose-600">{errors.productId.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Điểm sao *</span>
          <select
            {...register("rating", { valueAsNumber: true })}
            className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            <option value={1}>1 sao</option>
            <option value={2}>2 sao</option>
            <option value={3}>3 sao</option>
            <option value={4}>4 sao</option>
            <option value={5}>5 sao</option>
          </select>
          {errors.rating ? <p className="text-xs text-rose-600">{errors.rating.message}</p> : null}
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Tiêu đề</span>
          <input {...register("title")} className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.title ? <p className="text-xs text-rose-600">{errors.title.message}</p> : null}
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Nội dung *</span>
          <textarea {...register("content")} rows={5} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
          {errors.content ? <p className="text-xs text-rose-600">{errors.content.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Tên hiển thị *</span>
          <input {...register("guestName")} className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.guestName ? <p className="text-xs text-rose-600">{errors.guestName.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Email người gửi</span>
          <input {...register("guestEmail")} className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500" />
          {errors.guestEmail ? <p className="text-xs text-rose-600">{errors.guestEmail.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Ngày giờ đánh giá</span>
          <input
            type="datetime-local"
            {...register("reviewedAt")}
            className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          />
          {errors.reviewedAt ? <p className="text-xs text-rose-600">{errors.reviewedAt.message}</p> : null}
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Trạng thái duyệt</span>
          <select {...register("status")} className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500">
            {REVIEW_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{REVIEW_STATUS_LABELS[option]}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Hiển thị storefront</span>
          <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#64748B]">
            {isVisibleOnStorefront ? "Đang bật hiển thị (đã duyệt)." : "Đang ẩn (cần trạng thái Đã duyệt)."}
          </div>
          <button
            type="button"
            onClick={() => setValue("status", isVisibleOnStorefront ? "HIDDEN" : "APPROVED", { shouldDirty: true })}
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:border-zinc-400"
          >
            {isVisibleOnStorefront ? "Ẩn khỏi storefront" : "Bật hiển thị storefront"}
          </button>
        </label>
        <div className="space-y-1 lg:col-span-2">
          <span className="text-sm font-medium text-zinc-700">Ảnh đánh giá (tuỳ chọn)</span>
          <p className="text-xs text-zinc-500">
            Ảnh đánh giá khuyến nghị 800x800px hoặc 1200x900px, tối đa 5 ảnh, dung lượng ≤ 5MB/ảnh.
          </p>
          <div
            className={`rounded-xl border border-dashed p-3 transition sm:p-4 ${
              isDragging ? "border-sky-500 bg-sky-50/70" : "border-zinc-300 bg-zinc-50/60"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <p className="text-sm font-medium text-zinc-800">Kéo thả ảnh vào đây hoặc chọn ảnh</p>
            <p className="mt-1 text-xs text-zinc-500">Định dạng: JPEG/PNG/WebP/GIF, tối đa 5 ảnh.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700"
                disabled={isUploading}
              >
                Chọn ảnh
              </button>
              <span className="text-xs text-zinc-500">
                {reviewImages.length}/{REVIEW_MAX_IMAGES} ảnh
              </span>
              {isUploading ? <span className="text-xs font-medium text-sky-700">Đang tải ảnh...</span> : null}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/png,image/jpg,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={isUploading}
              onChange={(event) => {
                addImages(event.target.files).catch(() => {});
                event.currentTarget.value = "";
              }}
            />
          </div>
          {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
          {uploadSummary ? <p className="text-xs text-emerald-700">{uploadSummary}</p> : null}
          {errors.reviewImages ? <p className="text-xs text-rose-600">{errors.reviewImages.message}</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {reviewImages.map((url, index) => {
              const image = resolveMediaUrl(url);
              return (
                <div key={`${url}-${index}`} className="rounded-xl border border-zinc-200 p-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    {image ? (
                      <MediaImage
                        src={image}
                        alt="Ảnh đánh giá"
                        fallbackLabel="Ảnh đánh giá"
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                        Không tải được ảnh
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-md border border-rose-200 px-2 text-xs text-rose-700"
                  >
                    Xóa ảnh
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {submitError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{submitError}</p> : null}
      {submitSuccess ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{submitSuccess}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting || isUploading} className={adminPrimaryButton}>
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo đánh giá" : "Cập nhật đánh giá"}
        </button>
        <Link href="/admin/reviews" className={adminSecondaryButton}>Hủy</Link>
        <Link href="/admin/reviews" className={adminSecondaryButton}>Quay lại danh sách</Link>
      </div>
    </form>
  );
}

