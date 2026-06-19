"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { savePremiumFreeshipPopupConfigAction } from "./actions/premium-freeship-popup-actions";
import { DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG } from "./constants/premium-freeship-popup";
import { normalizePremiumFreeshipPopupConfig } from "./premium-freeship-popup-persistence";
import type { PremiumFreeshipPopupConfig } from "./types/premium-freeship-popup";

const PREMIUM_FREESHIP_POPUP_IMAGE_RECOMMENDATION = {
  size: "520 × 260 px",
  ratio: "2:1",
  maxFileSize: "4MB",
  formats: "JPG, JPEG, PNG, WEBP",
} as const;

async function uploadPopupImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "banner");
  formData.append("folder", "images/premium-freeship-popup");

  const response = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
  const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Upload ảnh thất bại.");
  }
  if (!payload?.url) {
    throw new Error("Upload ảnh thất bại.");
  }
  return payload.url;
}

export default function PremiumFreeshipAdmin({
  initialConfig,
}: {
  initialConfig?: unknown;
}): JSX.Element {
  const normalizedInitialConfig = normalizePremiumFreeshipPopupConfig(initialConfig ?? DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG);
  const [draft, setDraft] = useState<PremiumFreeshipPopupConfig>(() => normalizedInitialConfig);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "success" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });
  const previewImageUrl = useMemo(() => draft.imageUrl.trim(), [draft.imageUrl]);
  const previewPopupLinkUrl = useMemo(() => draft.popupLinkUrl.trim(), [draft.popupLinkUrl]);

  const onSave = async (): Promise<void> => {
    setStatus({ kind: "saving", message: "Đang lưu cấu hình..." });
    const result = await savePremiumFreeshipPopupConfigAction(draft);
    setStatus(result.ok ? { kind: "success", message: result.message } : { kind: "error", message: result.message });
  };

  const onPickImage = (): void => fileInputRef.current?.click();
  const onDeleteImage = (): void => setDraft((current) => ({ ...current, imageUrl: "" }));

  const onUploadSelected = async (file: File): Promise<void> => {
    setStatus({ kind: "saving", message: "Đang upload ảnh..." });
    try {
      const url = await uploadPopupImage(file);
      setDraft((current) => ({ ...current, imageUrl: url }));
      setStatus({ kind: "success", message: "Đã upload ảnh popup." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Upload ảnh thất bại." });
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Premium Freeship Popup</h3>
        <p className="mt-1 text-xs text-slate-500">Cấu hình riêng biệt cho popup Freeship 30.000đ.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Ảnh Popup</h4>
            <p className="text-xs text-slate-500">Hỗ trợ JPG, JPEG, PNG, WEBP. Không upload ảnh sẽ giữ nguyên layout popup hiện tại.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPickImage} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              Upload / đổi ảnh
            </button>
            <button
              type="button"
              onClick={onDeleteImage}
              disabled={!previewImageUrl}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa ảnh
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onUploadSelected(file);
          }}
        />
        {previewImageUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Image src={previewImageUrl} alt="Preview ảnh popup" width={520} height={260} className="h-auto w-full object-cover" sizes="(max-width: 640px) 100vw, 520px" />
            <p className="break-all border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{previewImageUrl}</p>
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
            Chưa có ảnh popup. Popup sẽ hiển thị giao diện hiện tại.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Thông số kỹ thuật ảnh khuyến nghị</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p><span className="font-medium text-slate-700">Kích thước khuyến nghị:</span> {PREMIUM_FREESHIP_POPUP_IMAGE_RECOMMENDATION.size}</p>
            <p><span className="font-medium text-slate-700">Tỷ lệ:</span> {PREMIUM_FREESHIP_POPUP_IMAGE_RECOMMENDATION.ratio}</p>
            <p><span className="font-medium text-slate-700">Dung lượng tối đa:</span> {PREMIUM_FREESHIP_POPUP_IMAGE_RECOMMENDATION.maxFileSize}</p>
            <p><span className="font-medium text-slate-700">Định dạng:</span> {PREMIUM_FREESHIP_POPUP_IMAGE_RECOMMENDATION.formats}</p>
          </div>
        </div>
      </div>

      <label className="space-y-1 text-sm">
        <span>Liên kết khi click ảnh</span>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          type="url"
          placeholder="https://zendo.vn/khuyen-mai"
          value={draft.popupLinkUrl}
          onChange={(e) => setDraft((current) => ({ ...current, popupLinkUrl: e.target.value }))}
        />
        <p className="break-all text-xs text-slate-500">Preview URL: {previewPopupLinkUrl || "Chưa có liên kết"}</p>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => setDraft((current) => ({ ...current, enabled: e.target.checked }))}
        />
        Bật popup
      </label>
      <label className="space-y-1 text-sm">
        <span>Tiêu đề</span>
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Headline</span>
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={draft.headline} onChange={(e) => setDraft((current) => ({ ...current, headline: e.target.value }))} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Mô tả</span>
        <textarea className="min-h-[92px] w-full rounded-lg border border-slate-200 px-3 py-2" value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Số tiền freeship</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2" type="number" value={draft.freeshipAmount} onChange={(e) => setDraft((current) => ({ ...current, freeshipAmount: Number(e.target.value) || 0 }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Đơn hàng tối thiểu</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2" type="number" value={draft.minimumOrder} onChange={(e) => setDraft((current) => ({ ...current, minimumOrder: Number(e.target.value) || 0 }))} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Delay hiển thị (giây)</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2" type="number" value={draft.delaySeconds} onChange={(e) => setDraft((current) => ({ ...current, delaySeconds: Number(e.target.value) || 0 }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Nhắc lại sau (giờ)</span>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2" type="number" value={draft.repeatHours} onChange={(e) => setDraft((current) => ({ ...current, repeatHours: Number(e.target.value) || 0 }))} />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span>Nút chính</span>
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={draft.primaryButtonText} onChange={(e) => setDraft((current) => ({ ...current, primaryButtonText: e.target.value }))} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Nút phụ</span>
        <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={draft.secondaryButtonText} onChange={(e) => setDraft((current) => ({ ...current, secondaryButtonText: e.target.value }))} />
      </label>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={draft.showFor === "all"} onChange={() => setDraft((current) => ({ ...current, showFor: "all", mobileOnly: false, desktopOnly: false }))} />
          Tất cả
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={draft.showFor === "mobile"} onChange={() => setDraft((current) => ({ ...current, showFor: "mobile", mobileOnly: true, desktopOnly: false }))} />
          Mobile
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={draft.showFor === "desktop"} onChange={() => setDraft((current) => ({ ...current, showFor: "desktop", mobileOnly: false, desktopOnly: true }))} />
          Desktop
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
        {status.message ? <p className={`text-sm ${status.kind === "error" ? "text-rose-600" : "text-emerald-600"}`}>{status.message}</p> : null}
      </div>
      <p className="text-xs text-slate-500">
        Mặc định: {DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG.delaySeconds}s · {DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG.repeatHours}h · {DEFAULT_PREMIUM_FREESHIP_POPUP_CONFIG.minimumOrder.toLocaleString("vi-VN")}đ
      </p>
    </section>
  );
}
