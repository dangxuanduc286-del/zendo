"use client";

import { useEffect, useRef, useState } from "react";

/** Short-lived in-memory reuse only — no persistence, no public URL. */
const BLOB_CACHE_TTL_MS = 120_000;
const MAX_CACHE_KEYS = 16;

type CacheEntry = { blobUrl: string; expiresAt: number };

const blobCacheByKey = new Map<string, CacheEntry>();
const cacheInsertOrder: string[] = [];

function revokeAndDelete(key: string): void {
  const e = blobCacheByKey.get(key);
  if (e) {
    try {
      URL.revokeObjectURL(e.blobUrl);
    } catch {
      // ignore
    }
    blobCacheByKey.delete(key);
    const idx = cacheInsertOrder.indexOf(key);
    if (idx >= 0) cacheInsertOrder.splice(idx, 1);
  }
}

function trimCacheOldest(extraKeyToSkip?: string): void {
  while (blobCacheByKey.size > MAX_CACHE_KEYS && cacheInsertOrder.length > 0) {
    let victim = cacheInsertOrder[0];
    if (extraKeyToSkip && victim === extraKeyToSkip && cacheInsertOrder.length > 1) {
      victim = cacheInsertOrder[1];
    }
    revokeAndDelete(victim);
  }
}

function readCache(objectKey: string): string | null {
  const e = blobCacheByKey.get(objectKey);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    revokeAndDelete(objectKey);
    return null;
  }
  return e.blobUrl;
}

function writeCache(objectKey: string, blobUrl: string): void {
  const prev = blobCacheByKey.get(objectKey);
  if (prev && prev.blobUrl !== blobUrl) {
    try {
      URL.revokeObjectURL(prev.blobUrl);
    } catch {
      // ignore
    }
  }
  blobCacheByKey.set(objectKey, { blobUrl, expiresAt: Date.now() + BLOB_CACHE_TTL_MS });
  const idx = cacheInsertOrder.indexOf(objectKey);
  if (idx >= 0) cacheInsertOrder.splice(idx, 1);
  cacheInsertOrder.push(objectKey);
  trimCacheOldest(objectKey);
}

export default function AdminKycProxyImage({
  objectKey,
  alt,
  className,
  enabled,
  observerRoot,
}: {
  objectKey: string;
  alt: string;
  className: string;
  /** When false, do not observe/fetch (drawer closed / not ready). */
  enabled: boolean;
  /** Drawer scroll surface; when set, intersection uses it instead of viewport. */
  observerRoot?: Element | null;
}): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    const ioRoot = observerRoot ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        setVisible(hit);
      },
      { root: ioRoot, rootMargin: "48px", threshold: 0.05 },
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [enabled, observerRoot]);

  useEffect(() => {
    if (!enabled || !objectKey.trim()) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    const key = objectKey.trim();
    setError(false);

    let mounted = true;
    const ac = new AbortController();

    async function load(): Promise<void> {
      if (!visible) {
        setBlobUrl(null);
        setLoading(false);
        return;
      }

      const immediate = readCache(key);
      if (immediate && mounted) {
        setBlobUrl(immediate);
        setLoading(false);
        return;
      }

      setLoading(true);
      setBlobUrl(null);
      try {
        const res = await fetch(`/api/admin/media/r2?key=${encodeURIComponent(key)}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("load_failed");
        const blob = await res.blob();
        if (!mounted || ac.signal.aborted) return;
        let url = readCache(key);
        if (!url) {
          url = URL.createObjectURL(blob);
          writeCache(key, url);
        }
        setBlobUrl(url);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [enabled, visible, objectKey]);

  useEffect(() => {
    const k = objectKey.trim();
    if (!k) setBlobUrl(null);
  }, [objectKey]);

  return (
    <div ref={rootRef} className="min-h-[120px]">
      {!visible ? (
        <p className="mt-2 text-xs text-[#64748B]">Cuộn tới đây để tải ảnh (tiết kiệm băng thông).</p>
      ) : loading && !blobUrl ? (
        <div className="mt-2 flex h-44 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
          Đang tải ảnh…
        </div>
      ) : error ? (
        <p className="mt-2 text-xs text-rose-600">Không tải được ảnh. Thử đóng/mở lại hoặc kiểm tra kết nối.</p>
      ) : blobUrl ? (
        /* Blob URL — next/image not applicable for dynamic blob */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={blobUrl} alt={alt} className={className} loading="lazy" decoding="async" />
      ) : (
        <div className="mt-2 h-44 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC]" aria-hidden />
      )}
    </div>
  );
}
