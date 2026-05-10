"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productFormSchema,
  PRODUCT_STATUS_OPTIONS,
  type ProductAdminDto,
  type ProductFormValues,
} from "../../lib/admin-product";
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_OPTIONS } from "../../lib/admin-review";
import { slugify } from "../../lib/slug";
import MediaImage from "../shared/media-image";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

interface ProductOption {
  id: string;
  name: string;
}

interface ProductReviewItem {
  id: string;
  productId: string;
  rating: number;
  title: string;
  content: string;
  guestName: string;
  guestEmail: string;
  reviewImages?: string[];
  imageUrls?: string[];
  status: (typeof REVIEW_STATUS_OPTIONS)[number];
  createdAt: string;
}

interface ProductReviewDraft {
  id?: string;
  rating: number;
  title: string;
  content: string;
  guestName: string;
  guestEmail: string;
  reviewImages: string[];
  status: (typeof REVIEW_STATUS_OPTIONS)[number];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang bán",
  DRAFT: "Bản nháp",
  ARCHIVED: "Đã lưu trữ",
  INACTIVE: "Tạm dừng",
  OUT_OF_STOCK: "Hết hàng",
};

const DEFAULT_VALUES: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  categoryId: "",
  brandId: "",
  brandName: "",
  vendorId: "Zendo.vn",
  shortDescription: "",
  description: "",
  warrantyInfo: "",
  colors: [],
  rememberWarrantyAsDefault: false,
  basePrice: 0,
  salePrice: 0,
  saleEndAt: "",
  stockQuantity: 0,
  soldCount: 0,
  status: "DRAFT",
  isFeatured: false,
  isNew: false,
  isBestSeller: false,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogImage: "",
  images: [],
  primaryImage: "",
};

const REVIEW_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const REVIEW_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const REVIEW_MAX_IMAGES = 5;

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "images/products");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  const payload = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message ?? "Upload ảnh thất bại.");
  return payload.url;
}

async function uploadReviewImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "images/reviews");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message ?? "Không thể tải ảnh lên. Vui lòng thử lại.");
  return payload.url;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

function toDatetimeLocal(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

export default function AdminProductForm({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}): JSX.Element {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(mode === "edit");
  const [ready, setReady] = useState(mode === "create");
  const [autoSlug, setAutoSlug] = useState(mode === "create");
  const [categories, setCategories] = useState<ProductOption[]>([]);
  const [defaultWarranty, setDefaultWarranty] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [colorInput, setColorInput] = useState("");
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(mode === "edit");
  const [reviewsError, setReviewsError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ProductReviewDraft>({
    rating: 5,
    title: "",
    content: "",
    guestName: "",
    guestEmail: "",
    reviewImages: [],
    status: "PENDING",
  });
  const [reviewUploadError, setReviewUploadError] = useState("");
  const [isReviewUploading, setIsReviewUploading] = useState(false);
  const [isReviewDragging, setIsReviewDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const reviewImageInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchedName = watch("name");
  const images = watch("images") ?? [];
  const primaryImage = watch("primaryImage");
  const colors = watch("colors") ?? [];
  const warrantyInfo = watch("warrantyInfo");
  const basePrice = watch("basePrice");
  const salePrice = watch("salePrice");

  useEffect(() => {
    register("colors");
  }, [register]);

  useEffect(() => {
    if (!autoSlug) return;
    setValue("slug", slugify(watchedName || ""), { shouldValidate: true });
  }, [autoSlug, watchedName, setValue]);

  useEffect(() => {
    const loadData = async () => {
      const [categoriesResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/categories", { cache: "no-store" }),
        fetch("/api/admin/settings/website", { cache: "no-store" }),
      ]);
      const categoriesPayload = (await categoriesResponse.json()) as { items?: ProductOption[] };
      const settingsPayload = (await settingsResponse.json()) as {
        item?: { defaultProductWarranty?: string };
      };
      setCategories(categoriesPayload.items ?? []);
      setDefaultWarranty(settingsPayload.item?.defaultProductWarranty?.trim() ?? "");
    };
    loadData().catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "create" || !defaultWarranty || warrantyInfo) return;
    setValue("warrantyInfo", defaultWarranty);
  }, [mode, defaultWarranty, warrantyInfo, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    const loadProduct = async () => {
      setLoadingData(true);
      const response = await fetch(`/api/admin/products/${productId}`, { cache: "no-store" });
      const payload = (await response.json()) as { item?: ProductAdminDto; message?: string };
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu sản phẩm.");
        setLoadingData(false);
        return;
      }
      reset({
        ...DEFAULT_VALUES,
        ...payload.item,
        saleEndAt: toDatetimeLocal(payload.item.saleEndAt || ""),
        rememberWarrantyAsDefault: false,
      });
      setAutoSlug(false);
      setLoadingData(false);
      setReady(true);
    };
    loadProduct().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu sản phẩm.");
      setLoadingData(false);
    });
  }, [mode, productId, reset]);

  useEffect(() => {
    if (mode !== "edit" || !productId) {
      setReviewsLoading(false);
      return;
    }
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");
      const response = await fetch(`/api/admin/reviews?productId=${productId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { items?: ProductReviewItem[]; message?: string };
      if (!response.ok) {
        setReviewsError(payload.message ?? "Không thể tải đánh giá sản phẩm.");
      } else {
        setReviews(payload.items ?? []);
      }
      setReviewsLoading(false);
    };
    loadReviews().catch(() => {
      setReviewsError("Không thể tải đánh giá sản phẩm.");
      setReviewsLoading(false);
    });
  }, [mode, productId]);

  const discountPercent = useMemo(() => {
    if (!basePrice || !salePrice || basePrice <= 0 || salePrice <= 0 || salePrice >= basePrice) return 0;
    return Math.round(((basePrice - salePrice) / basePrice) * 100);
  }, [basePrice, salePrice]);

  const addColor = () => {
    const next = colorInput.trim();
    if (!next) return;
    if (colors.includes(next)) {
      setColorInput("");
      return;
    }
    const merged = [...colors, next].slice(0, 5);
    setValue("colors", merged, { shouldDirty: true, shouldValidate: true });
    setColorInput("");
  };

  const removeColor = (target: string) => {
    setValue(
      "colors",
      colors.filter((item) => item !== target),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const addImages = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploadError("");
    setUploadSummary("");
    const remainingSlots = Math.max(0, 15 - images.length);
    if (remainingSlots <= 0) {
      setUploadError("Mỗi sản phẩm chỉ được tải tối đa 15 ảnh.");
      return;
    }
    const selectedFiles = Array.from(fileList);
    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setUploadError("Mỗi sản phẩm chỉ được tải tối đa 15 ảnh.");
    }
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const failedMessages: string[] = [];

      for (const file of acceptedFiles) {
        const isAllowedType = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type);
        if (!isAllowedType) {
          failedMessages.push(`${file.name}: File không đúng định dạng ảnh.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          failedMessages.push(`${file.name}: Ảnh vượt quá 5MB.`);
          continue;
        }
        try {
          const url = await uploadImage(file);
          uploadedUrls.push(url);
        } catch {
          failedMessages.push(`${file.name}: Không thể tải ảnh lên. Vui lòng thử lại.`);
        }
      }

      const next = [...images, ...uploadedUrls].slice(0, 15);
      setValue("images", next, { shouldDirty: true, shouldValidate: true });
      setValue("primaryImage", next[0] ?? "", { shouldDirty: true, shouldValidate: true });

      if (failedMessages.length > 0) {
        setUploadError(failedMessages.slice(0, 3).join(" "));
      }
      if (uploadedUrls.length > 0) {
        setUploadSummary(`Đã tải ${uploadedUrls.length} ảnh thành công.`);
      }
    } catch {
      setUploadError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const target = images[index];
    const next = images.filter((_, idx) => idx !== index);
    setValue("images", next, { shouldDirty: true, shouldValidate: true });
    if (target && target === primaryImage) {
      setValue("primaryImage", next[0] ?? "", { shouldDirty: true, shouldValidate: true });
    }
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const next = [...images];
    const [target] = next.splice(index, 1);
    next.splice(nextIndex, 0, target);
    setValue("images", next, { shouldDirty: true, shouldValidate: true });
    setValue("primaryImage", next[0] ?? "", { shouldDirty: true, shouldValidate: true });
  };

  const setAsPrimary = (url: string) => {
    const next = [url, ...images.filter((item) => item !== url)].slice(0, 15);
    setValue("images", next, { shouldDirty: true, shouldValidate: true });
    setValue("primaryImage", url, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitError("");
    const endpoint = mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
    const response = await fetch(endpoint, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể lưu sản phẩm.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  };

  const resetReviewDraft = () => {
    setReviewUploadError("");
    setReviewDraft({
      rating: 5,
      title: "",
      content: "",
      guestName: "",
      guestEmail: "",
      reviewImages: [],
      status: "PENDING",
    });
  };

  const addReviewImages = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setReviewUploadError("");
    const remainingSlots = Math.max(0, REVIEW_MAX_IMAGES - reviewDraft.reviewImages.length);
    if (remainingSlots <= 0) {
      setReviewUploadError("Mỗi đánh giá chỉ được tải tối đa 5 ảnh.");
      return;
    }
    const selectedFiles = Array.from(fileList);
    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setReviewUploadError("Mỗi đánh giá chỉ được tải tối đa 5 ảnh.");
    }
    setIsReviewUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of acceptedFiles) {
        if (!REVIEW_ALLOWED_TYPES.has(file.type)) {
          setReviewUploadError("File không đúng định dạng ảnh.");
          continue;
        }
        if (file.size > REVIEW_MAX_FILE_SIZE_BYTES) {
          setReviewUploadError("Ảnh vượt quá 5MB.");
          continue;
        }
        try {
          uploadedUrls.push(await uploadReviewImage(file));
        } catch {
          setReviewUploadError("Không thể tải ảnh lên. Vui lòng thử lại.");
        }
      }
      if (!uploadedUrls.length) return;
      setReviewDraft((prev) => ({
        ...prev,
        reviewImages: [...prev.reviewImages, ...uploadedUrls].slice(0, REVIEW_MAX_IMAGES),
      }));
    } finally {
      setIsReviewUploading(false);
    }
  };

  const removeReviewImage = (index: number) => {
    setReviewDraft((prev) => ({
      ...prev,
      reviewImages: prev.reviewImages.filter((_, idx) => idx !== index),
    }));
  };

  const submitReview = async () => {
    if (!productId) return;
    if (!reviewDraft.guestName.trim() || !reviewDraft.content.trim()) {
      setReviewsError("Tên hiển thị và nội dung đánh giá là bắt buộc.");
      return;
    }
    setReviewSubmitting(true);
    setReviewsError("");
    const endpoint = reviewDraft.id ? `/api/admin/reviews/${reviewDraft.id}` : "/api/admin/reviews";
    const method = reviewDraft.id ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating: reviewDraft.rating,
        title: reviewDraft.title,
        content: reviewDraft.content,
        guestName: reviewDraft.guestName,
        guestEmail: reviewDraft.guestEmail,
        status: reviewDraft.status,
        reviewImages: reviewDraft.reviewImages,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { item?: ProductReviewItem; message?: string };
    if (!response.ok || !payload.item) {
      setReviewsError(payload.message ?? "Không thể lưu đánh giá.");
      setReviewSubmitting(false);
      return;
    }
    setReviews((prev) => {
      if (reviewDraft.id) return prev.map((item) => (item.id === payload.item!.id ? payload.item! : item));
      return [payload.item!, ...prev];
    });
    resetReviewDraft();
    setReviewSubmitting(false);
  };

  const editReview = (item: ProductReviewItem) => {
    const reviewImages = Array.isArray(item.reviewImages)
      ? item.reviewImages
      : Array.isArray(item.imageUrls)
        ? item.imageUrls
        : [];
    setReviewDraft({
      id: item.id,
      rating: item.rating,
      title: item.title,
      content: item.content,
      guestName: item.guestName,
      guestEmail: item.guestEmail,
      reviewImages,
      status: item.status,
    });
    setReviewUploadError("");
    setReviewsError("");
  };

  const removeReview = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
    setReviewSubmitting(true);
    setReviewsError("");
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setReviewsError(payload.message ?? "Không thể xóa đánh giá.");
      setReviewSubmitting(false);
      return;
    }
    setReviews((prev) => prev.filter((item) => item.id !== id));
    if (reviewDraft.id === id) resetReviewDraft();
    setReviewSubmitting(false);
  };

  if (!ready || loadingData) {
    return <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Đang tải dữ liệu...</section>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl space-y-4">
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Thông tin cơ bản</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Tên sản phẩm *</span>
            <input {...register("name")} placeholder="Ví dụ: iPhone 15 Pro Max 256GB" className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" />
            {formState.errors.name ? <p className="text-xs text-rose-600">{formState.errors.name.message}</p> : null}
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Đường dẫn slug *</span>
            <div className="flex gap-2">
              <input {...register("slug", { onChange: () => setAutoSlug(false) })} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" />
              <button type="button" onClick={() => setValue("slug", slugify(watch("name")))} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium">Tạo slug</button>
            </div>
            {formState.errors.slug ? <p className="text-xs text-rose-600">{formState.errors.slug.message}</p> : null}
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Mã SKU *</span>
            <div className="flex gap-2">
              <input {...register("sku")} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" />
              <button
                type="button"
                onClick={() => setValue("sku", `SKU-${Date.now().toString().slice(-6)}`, { shouldValidate: true })}
                className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium"
              >
                Tạo SKU
              </button>
            </div>
            {formState.errors.sku ? <p className="text-xs text-rose-600">{formState.errors.sku.message}</p> : null}
          </label>
          <label className="space-y-1"><span className="text-sm font-medium text-zinc-700">Danh mục *</span><select {...register("categoryId")} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"><option value="">Chọn danh mục</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Thương hiệu</span>
            <input
              {...register("brandName")}
              placeholder="Ví dụ: Xiaomi, Samsung, Romoss..."
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
          <input type="hidden" {...register("vendorId")} />
          <label className="space-y-1"><span className="text-sm font-medium text-zinc-700">Trạng thái</span><select {...register("status")} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm">{PRODUCT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}</select></label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Màu sắc (tối đa 5)</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={colorInput}
                onChange={(event) => setColorInput(event.target.value)}
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                placeholder="Ví dụ: Đen titan, Xanh biển..."
              />
              <button type="button" onClick={addColor} className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium sm:shrink-0">
                Thêm màu
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => removeColor(color)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-xs"
                >
                  {color} <span className="text-zinc-500">x</span>
                </button>
              ))}
            </div>
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm"><input type="checkbox" {...register("isFeatured")} className="h-4 w-4" />Nổi bật</label>
            <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm"><input type="checkbox" {...register("isNew")} className="h-4 w-4" />Mới</label>
            <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm"><input type="checkbox" {...register("isBestSeller")} className="h-4 w-4" />Bán chạy</label>
          </div>
        </div>
      </section>

      {mode === "edit" ? (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-zinc-900">Đánh giá sản phẩm</h2>
          <p className="mt-1 text-xs text-zinc-500">Thêm/sửa/xóa review cho đúng sản phẩm hiện tại.</p>
          {reviewsError ? <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{reviewsError}</p> : null}
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              {reviewsLoading ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">Đang tải đánh giá...</p>
              ) : reviews.length ? (
                reviews.map((item) => (
                  <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.guestName} - {item.rating} sao
                      </p>
                      <span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{item.title || "Không có tiêu đề"}</p>
                    <p className="mt-1 text-sm text-zinc-700">{item.content}</p>
                    {(item.reviewImages?.length || item.imageUrls?.length) ? (
                      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {(item.reviewImages ?? item.imageUrls ?? []).slice(0, 5).map((url, idx) => (
                          <div key={`${item.id}-${idx}`} className="relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-white">
                            <MediaImage src={url} alt="Ảnh review" fallbackLabel="Ảnh review" fill className="object-cover" sizes="120px" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700">{REVIEW_STATUS_LABELS[item.status]}</span>
                      <button type="button" onClick={() => editReview(item)} className="h-7 rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700">Sửa</button>
                      <button type="button" onClick={() => removeReview(item.id)} disabled={reviewSubmitting} className="h-7 rounded-md border border-rose-200 px-2.5 text-xs text-rose-700 disabled:opacity-60">Xóa</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">Chưa có đánh giá cho sản phẩm này.</p>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <h3 className="text-sm font-semibold text-zinc-900">{reviewDraft.id ? "Sửa đánh giá" : "Thêm đánh giá mới"}</h3>
              <div className="mt-3 space-y-2">
                <input
                  value={reviewDraft.guestName}
                  onChange={(event) => setReviewDraft((prev) => ({ ...prev, guestName: event.target.value }))}
                  placeholder="Tên hiển thị"
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                />
                <input
                  value={reviewDraft.guestEmail}
                  onChange={(event) => setReviewDraft((prev) => ({ ...prev, guestEmail: event.target.value }))}
                  placeholder="Email (tuỳ chọn)"
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                />
                <input
                  value={reviewDraft.title}
                  onChange={(event) => setReviewDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Tiêu đề"
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                />
                <textarea
                  value={reviewDraft.content}
                  onChange={(event) => setReviewDraft((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Nội dung đánh giá"
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={reviewDraft.rating}
                    onChange={(event) => setReviewDraft((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                    className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                  >
                    <option value={5}>5 sao</option>
                    <option value={4}>4 sao</option>
                    <option value={3}>3 sao</option>
                    <option value={2}>2 sao</option>
                    <option value={1}>1 sao</option>
                  </select>
                  <select
                    value={reviewDraft.status}
                    onChange={(event) =>
                      setReviewDraft((prev) => ({
                        ...prev,
                        status: event.target.value as (typeof REVIEW_STATUS_OPTIONS)[number],
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
                  >
                    {REVIEW_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {REVIEW_STATUS_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className={`rounded-lg border border-dashed p-2.5 transition ${
                    isReviewDragging ? "border-sky-500 bg-sky-50/70" : "border-zinc-300 bg-zinc-50/60"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsReviewDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsReviewDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsReviewDragging(false);
                    addReviewImages(event.dataTransfer.files).catch(() => {});
                  }}
                >
                  <p className="text-xs font-medium text-zinc-700">Ảnh đánh giá</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Tối đa 5 ảnh, JPEG/PNG/WebP/GIF, ≤ 5MB/ảnh.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => reviewImageInputRef.current?.click()}
                      className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700"
                      disabled={isReviewUploading}
                    >
                      Chọn ảnh
                    </button>
                    <span className="text-[11px] text-zinc-500">{reviewDraft.reviewImages.length}/5 ảnh</span>
                    {isReviewUploading ? <span className="text-[11px] font-medium text-sky-700">Đang tải...</span> : null}
                  </div>
                  <input
                    ref={reviewImageInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpg,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => {
                      addReviewImages(event.target.files).catch(() => {});
                      event.currentTarget.value = "";
                    }}
                  />
                  {reviewUploadError ? <p className="mt-1 text-[11px] text-rose-600">{reviewUploadError}</p> : null}
                  {reviewDraft.reviewImages.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {reviewDraft.reviewImages.map((url, index) => (
                        <div key={`${url}-${index}`} className="rounded-md border border-zinc-200 p-1.5">
                          <div className="relative aspect-square overflow-hidden rounded border border-zinc-200 bg-white">
                            <MediaImage src={url} alt="Ảnh đánh giá" fallbackLabel="Ảnh đánh giá" fill className="object-cover" sizes="140px" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeReviewImage(index)}
                            className="mt-1.5 h-7 w-full rounded border border-rose-200 text-[11px] text-rose-700"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => submitReview().catch(() => {})} disabled={reviewSubmitting} className="h-9 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white disabled:opacity-60">
                    {reviewSubmitting ? "Đang lưu..." : reviewDraft.id ? "Cập nhật review" : "Thêm review"}
                  </button>
                  {reviewDraft.id ? (
                    <button type="button" onClick={resetReviewDraft} className="h-9 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700">
                      Hủy sửa
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <h2 className="text-base font-semibold text-zinc-900">Đánh giá sản phẩm</h2>
          <p className="mt-1 text-sm text-zinc-600">Lưu sản phẩm trước, sau đó vào chế độ sửa để thêm/sửa/xóa review cho sản phẩm này.</p>
        </section>
      )}

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Giá & tồn kho</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-zinc-700">Giá gốc</span>
            <input
              type="number"
              step="1000"
              {...register("basePrice", { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
            <p className="text-xs text-zinc-500">{formatCurrency(basePrice ?? 0)}</p>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-zinc-700">Giá bán</span>
            <input
              type="number"
              step="1000"
              {...register("salePrice", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
            <p className="text-xs text-zinc-500">{formatCurrency(salePrice ?? 0)}</p>
            {formState.errors.salePrice ? <p className="text-xs text-rose-600">{formState.errors.salePrice.message}</p> : null}
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-zinc-700">Kết thúc giảm giá</span>
            <input
              type="datetime-local"
              {...register("saleEndAt")}
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
            {formState.errors.saleEndAt ? (
              <p className="text-xs text-rose-600">{formState.errors.saleEndAt.message}</p>
            ) : (
              <p className="text-xs text-zinc-500">Để trống nếu không giới hạn thời gian.</p>
            )}
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-zinc-700">Tồn kho</span>
            <input
              type="number"
              {...register("stockQuantity", { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-sm font-medium text-zinc-700">Số lượng đã bán</span>
            <input
              type="number"
              min={0}
              {...register("soldCount", { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
        </div>
        {discountPercent > 0 ? <p className="mt-2 text-sm font-semibold text-emerald-700">Giảm giá: {discountPercent}%</p> : null}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Bảo hành</h2>
        <textarea {...register("warrantyInfo")} rows={3} placeholder="Ví dụ: Bảo hành 12 tháng, 1 đổi 1 trong 7 ngày nếu lỗi nhà sản xuất." className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <label className="mt-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" {...register("rememberWarrantyAsDefault")} className="h-4 w-4" />Ghi nhớ làm mặc định cho sản phẩm sau</label>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Ảnh sản phẩm</h2>
        <div
          className={`mt-3 rounded-xl border border-dashed p-4 transition sm:p-5 ${
            isDraggingImages ? "border-sky-500 bg-sky-50/70" : "border-zinc-300 bg-zinc-50/60"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingImages(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDraggingImages(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingImages(false);
            addImages(event.dataTransfer.files).catch(() => {});
          }}
        >
          <p className="text-sm font-medium text-zinc-800">Kéo thả ảnh vào đây hoặc bấm để tải ảnh lên</p>
          <p className="mt-1 text-xs text-zinc-500">
            Tối đa 15 ảnh, khuyến nghị 1200x1200px, PNG/JPEG/WebP, dung lượng ≤ 5MB/ảnh
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
            >
              Chọn ảnh
            </button>
            <span className="text-xs text-zinc-500">{images.length}/15 ảnh</span>
            {isUploading ? <span className="text-xs font-medium text-sky-700">Đang tải ảnh...</span> : null}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/png,image/jpg,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              addImages(e.target.files).catch(() => {});
              e.currentTarget.value = "";
            }}
          />
        </div>
        {uploadError ? <p className="mt-2 text-xs text-rose-700">{uploadError}</p> : null}
        {uploadSummary ? <p className="mt-2 text-xs text-emerald-700">{uploadSummary}</p> : null}
        {formState.errors.images ? <p className="mt-2 text-xs text-rose-700">{formState.errors.images.message}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="rounded-xl border border-zinc-200 p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <MediaImage src={url} alt="Ảnh sản phẩm" fallbackLabel="Ảnh sản phẩm" fill className="object-contain p-1" sizes="200px" />
                <span className="absolute right-1 top-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] text-white">#{index + 1}</span>
                {index === 0 ? <span className="absolute left-1 top-1 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] text-white">Ảnh chính</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAsPrimary(url)}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-xs"
                >
                  Ảnh chính
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, "up")}
                  disabled={index === 0}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ↑ Lên
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, "down")}
                  disabled={index === images.length - 1}
                  className="h-8 rounded-md border border-zinc-300 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ↓ Xuống
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="h-8 rounded-md border border-rose-200 px-2 text-xs text-rose-700"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
        <input type="hidden" {...register("primaryImage")} />
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Mô tả sản phẩm</h2>
        <label className="mt-3 block space-y-1"><span className="text-sm font-medium text-zinc-700">Mô tả chi tiết</span><textarea {...register("description")} rows={8} placeholder="Mô tả chi tiết thông số, tính năng, lợi ích..." className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">SEO sản phẩm</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1"><span className="text-sm font-medium text-zinc-700">SEO title</span><input {...register("seoTitle")} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" /><p className="text-xs text-zinc-500">Nên dưới 60 ký tự.</p></label>
          <label className="space-y-1"><span className="text-sm font-medium text-zinc-700">SEO keywords</span><input {...register("seoKeywords")} className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" /></label>
          <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium text-zinc-700">SEO description</span><textarea {...register("seoDescription")} rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /><p className="text-xs text-zinc-500">Nên dưới 160 ký tự.</p></label>
          <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium text-zinc-700">OG image (tuỳ chọn)</span><input {...register("ogImage")} placeholder="https://media.zendo.vn/..." className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm" /><p className="text-xs text-zinc-500">Để trống sẽ fallback từ ảnh đại diện sản phẩm.</p></label>
        </div>
      </section>

      {submitError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p> : null}
      <div className="sticky bottom-3 z-20 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <button type="submit" disabled={formState.isSubmitting || isUploading} className={adminPrimaryButton}>{formState.isSubmitting ? "Đang lưu..." : "Lưu sản phẩm"}</button>
        <button type="submit" disabled={formState.isSubmitting || isUploading} className={adminSecondaryButton}>Lưu và xem ngoài web</button>
        <Link href="/admin/products" className={adminSecondaryButton}>Hủy</Link>
      </div>
    </form>
  );
}

