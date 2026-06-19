"use client";

import Image from "next/image";
import type { PremiumFreeshipPopupConfig } from "../types/premium-freeship-popup";

export function PremiumFreeshipPopupView({
  config,
  onAccept,
  onClose,
}: {
  config: PremiumFreeshipPopupConfig;
  onAccept: () => void;
  onClose: () => void;
}): JSX.Element {
  const hasImage = Boolean(config.imageUrl?.trim());
  const hasPopupLink = Boolean(config.popupLinkUrl?.trim());
  const imageElement = hasImage ? (
    hasPopupLink ? (
      <a href={config.popupLinkUrl} target="_blank" rel="noopener noreferrer" aria-label={config.title || config.headline} className="block">
        <Image src={config.imageUrl} alt={config.title || config.headline} width={520} height={260} className="h-auto w-full object-cover" sizes="(max-width: 640px) 100vw, 520px" />
      </a>
    ) : (
      <Image src={config.imageUrl} alt={config.title || config.headline} width={520} height={260} className="h-auto w-full object-cover" sizes="(max-width: 640px) 100vw, 520px" />
    )
  ) : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-md">
      <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.16)] ring-1 ring-black/5 backdrop-blur-xl">
        {imageElement}
        <div className="p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{config.title}</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{config.headline}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{config.description}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">{config.subline}</p>

          <div className="mt-6 rounded-[20px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Freeship Premium</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Đơn từ {config.minOrderValue.toLocaleString("vi-VN")}đ</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-900">{config.freeshipValue.toLocaleString("vi-VN")}đ</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-medium text-slate-600 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">✓ Freeship toàn quốc</div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">✓ Hàng chính hãng</div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">✓ Đổi trả dễ dàng</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onAccept} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold tracking-[0.08em] text-white transition hover:bg-slate-800">
              {config.ctaLabel}
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              {config.secondaryCtaLabel}
            </button>
          </div>
          <div className="mt-4 text-center text-[11px] text-slate-500">Ưu đãi tự động ẩn trong 12 giờ sau khi đóng hoặc nhận.</div>
        </div>
      </div>
    </div>
  );
}
