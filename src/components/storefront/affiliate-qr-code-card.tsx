"use client";

import { Download, Maximize2, Share2, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useState } from "react";


export default memo(function AffiliateQrCodeCard(props: { url: string; label?: string }): JSX.Element | null {
  const uid = useId();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const url = props.url.trim();
  const safeId = `aff-qr-${uid.replace(/:/g, "")}`;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setErr("");
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(url, {
          width: 220,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
          errorCorrectionLevel: "M",
        }),
      )
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setErr("Không tạo được QR.");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const onDownload = useCallback(() => {
    if (!dataUrl) return;    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `zendo-affiliate-qr.png`;
    a.click();
  }, [dataUrl]);

  const onShare = useCallback(async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "QR / link Zendo", text: url, url });
      } catch {
        /* ignore */
      }
      return;
    }
    void navigator.clipboard?.writeText(url);
  }, [url]);

  if (!url) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:rounded-2xl sm:p-3.5">
        <p className="text-xs font-bold tracking-tight text-slate-900">{props.label ?? "QR link"}</p>
        <p className="mt-0.5 line-clamp-2 break-all text-[10px] text-slate-500">{url}</p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img id={safeId} src={dataUrl} alt="QR affiliate" className="h-36 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:h-40 sm:w-40" />
          ) : err ? (
            <p className="text-xs text-rose-600">{err}</p>
          ) : (
            <div className="h-36 w-36 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none sm:h-40 sm:w-40" />
          )}
          <div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto sm:flex-col sm:justify-start">
            <button
              type="button"
              disabled={!dataUrl}
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Tải PNG
            </button>
            <button
              type="button"
              disabled={!dataUrl}
              onClick={() => void onShare()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Chia sẻ
            </button>
            <button
              type="button"
              disabled={!dataUrl}
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 lg:hidden"
            >
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Toàn màn hình
            </button>
          </div>
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden" role="dialog" aria-modal="true" aria-label="QR toàn màn hình">
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)} aria-label="Đóng" />
          <div className="relative max-h-[88vh] overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">QR nhanh</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="mt-4 flex flex-col items-center">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="" className="max-h-[55vh] w-auto max-w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-inner" />
              ) : (
                <div className="h-64 w-64 animate-pulse rounded-2xl bg-slate-100" />
              )}
              <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
                <button
                  type="button"
                  disabled={!dataUrl}
                  onClick={() => {
                    onDownload();
                    setSheetOpen(false);
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Tải PNG
                </button>
                <button
                  type="button"
                  disabled={!dataUrl}
                  onClick={() => void onShare()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 disabled:opacity-40"
                >
                  <Share2 className="h-4 w-4" />
                  Chia sẻ link
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});
