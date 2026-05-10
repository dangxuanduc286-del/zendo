"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";
import { setGlobalOverlayOpen } from "../../lib/ui-state";

interface StorefrontPopupProps {
  enabled: boolean;
  title: string;
  content: string;
  imageUrl: string;
  link: string;
  delayMs: number;
  frequencyHours: number;
}

const POPUP_STORAGE_KEY = "zendo_popup_last_closed_at";

export default function StorefrontPopup({
  enabled,
  title,
  content,
  imageUrl,
  link,
  delayMs,
  frequencyHours,
}: StorefrontPopupProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const normalizedImage = useMemo(() => resolveMediaUrl(imageUrl), [imageUrl]);
  const safeDelay = Math.max(0, Math.min(30000, Number.isFinite(delayMs) ? delayMs : 2500));
  const safeFrequencyHours = Math.max(1, Math.min(168, Number.isFinite(frequencyHours) ? frequencyHours : 12));

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(POPUP_STORAGE_KEY) || "0";
      const lastClosedAt = Number(raw);
      const eligibleAt = lastClosedAt + safeFrequencyHours * 60 * 60 * 1000;
      if (Number.isFinite(lastClosedAt) && Date.now() < eligibleAt) return;
    } catch {
      // Ignore storage errors to avoid blocking popup flow.
    }
    const timer = window.setTimeout(() => setOpen(true), safeDelay);
    return () => window.clearTimeout(timer);
  }, [enabled, safeDelay, safeFrequencyHours]);

  useEffect(() => {
    if (!enabled) return;
  }, [enabled, safeDelay, safeFrequencyHours, normalizedImage, link]);

  useEffect(() => {
    setGlobalOverlayOpen(Boolean(enabled && open));
  }, [enabled, open]);

  useEffect(() => {
    return () => {
      setGlobalOverlayOpen(false);
    };
  }, []);

  if (!enabled || !open) return null;

  const handleClose = () => {
    try {
      localStorage.setItem(POPUP_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore localStorage failures.
    }
    setGlobalOverlayOpen(false);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {normalizedImage ? (
          <div className="relative aspect-[16/9] w-full">
            <MediaImage
              src={normalizedImage}
              alt={title || "Popup"}
              fallbackLabel="Popup"
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="space-y-3 p-4">
          {title.trim() ? <h3 className="text-base font-bold text-slate-900">{title}</h3> : null}
          {content.trim() ? <p className="text-sm leading-relaxed text-slate-600">{content}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
            >
              Đóng
            </button>
            {link.trim() ? (
              <Link
                href={link}
                onClick={handleClose}
                className="inline-flex h-9 items-center rounded-lg bg-[var(--z-cta)] px-3 text-sm font-semibold text-white"
              >
                Xem ngay
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
