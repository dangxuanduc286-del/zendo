"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import MediaImage from "../shared/media-image";

type UploadKind =
  | "logo"
  | "favicon"
  | "og"
  | "banner"
  | "product"
  | "category"
  | "brand"
  | "post"
  | "theme";

interface AdminImageUploadFieldProps {
  label: string;
  value: string;
  kind: UploadKind;
  onChange: (nextUrl: string) => void;
  hint?: string;
  previewClassName?: string;
  previewFrameClassName?: string;
  previewImageClassName?: string;
  /** Ưu tiên hơn class (object-fit / object-position) để preview khớp storefront. */
  previewImageStyle?: CSSProperties;
  previewSizes?: string;
  previewOverlay?: ReactNode;
  /** 1–100, truyền xuống Next Image khi xem trước (mặc định không set = default Next). */
  quality?: number;
  accept?: string;
  version?: string;
  clearLabel?: string;
}

async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.message ?? "Upload ảnh thất bại.");
  }
  return payload.url;
}

export default function AdminImageUploadField({
  label,
  value,
  kind,
  onChange,
  hint,
  previewClassName = "h-24 w-40",
  previewFrameClassName = "",
  previewImageClassName = "object-contain p-1",
  previewImageStyle,
  previewSizes = "160px",
  previewOverlay,
  quality,
  accept = "image/png,image/jpg,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon",
  version = "",
  clearLabel = "Xóa ảnh",
}: AdminImageUploadFieldProps): JSX.Element {
  const previewSrc = (() => {
    if (!value) return "";
    const normalizedVersion = version.trim();
    if (!normalizedVersion) return value;
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}v=${encodeURIComponent(normalizedVersion)}`;
  })();

  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const url = await uploadImage(file, kind);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể upload ảnh.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleUpload(event.target.files?.[0]);
  };

  const onDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    await handleUpload(file);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-3 text-center text-xs transition ${
          dragging ? "border-[#94A3B8] bg-slate-100 text-[#0F172A]" : "border-[#CBD5E1] text-[#64748B] hover:border-[#94A3B8]"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />
        <span className="font-medium">{isUploading ? "Đang tải lên..." : "Kéo thả ảnh hoặc chọn tệp"}</span>
        <span className="mt-1">Chỉ nhận ảnh, lưu trực tiếp lên media.zendo.vn</span>
      </label>

      <div
        className={`relative overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC] ${previewClassName} ${previewFrameClassName}`}
      >
        {previewSrc ? (
          <MediaImage
            src={previewSrc}
            alt={label}
            fallbackLabel={label}
            fill
            className={previewImageClassName}
            {...(previewImageStyle ? { style: previewImageStyle } : {})}
            sizes={previewSizes}
            {...(typeof quality === "number" && quality >= 1 && quality <= 100 ? { quality } : {})}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">Chưa có ảnh</div>
        )}
        {previewOverlay ? <div className="pointer-events-none absolute inset-0">{previewOverlay}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
          disabled={isUploading}
        >
          Chọn ảnh
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700 hover:border-zinc-400"
        >
          {clearLabel}
        </button>
      </div>

      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
