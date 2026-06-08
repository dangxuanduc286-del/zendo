"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { adminInput, adminLabel, adminCardBody } from "../../lib/admin-ui";

// ─── Types ───────────────────────────────────────────────────────

export interface SeoProductPickerItem {
  productId: string;
  sortOrder: number;
  product: {
    name: string;
    slug: string;
    price: number;
    imageUrl: string;
  };
}

export interface SeoProductPickerValue {
  productId: string;
  sortOrder: number;
}

interface SeoProductPickerProps {
  selected: SeoProductPickerItem[];
  onChange: (items: SeoProductPickerValue[]) => void;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
}

// ─── Component ───────────────────────────────────────────────────

export default function SeoProductPicker({
  selected,
  onChange,
}: SeoProductPickerProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search ──────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/admin/seo/search?type=PRODUCT&q=${encodeURIComponent(q)}&limit=10`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { items: SearchResult[] };
        // Filter out already selected
        const selectedIds = new Set(selected.map((s) => s.productId));
        setResults(data.items.filter((item) => !selectedIds.has(item.id)));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Không thể tìm kiếm sản phẩm.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  // ── Add product ───────────────────────────────────────────────
  const handleAdd = useCallback(
    (item: SearchResult) => {
      const newItem: SeoProductPickerItem = {
        productId: item.id,
        sortOrder: selected.length,
        product: {
          name: item.name,
          slug: item.slug,
          price: 0,
          imageUrl: item.thumbnail ?? "",
        },
      };
      onChange([...selected.map((s) => ({ productId: s.productId, sortOrder: s.sortOrder })), { productId: newItem.productId, sortOrder: newItem.sortOrder }]);
      setQuery("");
      setResults([]);
    },
    [selected, onChange],
  );

  // ── Remove product ────────────────────────────────────────────
  const handleRemove = useCallback(
    (productId: string) => {
      const updated = selected
        .filter((s) => s.productId !== productId)
        .map((s, i) => ({ productId: s.productId, sortOrder: i }));
      onChange(updated);
    },
    [selected, onChange],
  );

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) return;
      const items = [...selected];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(dropIndex, 0, moved);
      onChange(items.map((s, i) => ({ productId: s.productId, sortOrder: i })));
      setDragIndex(null);
    },
    [dragIndex, selected, onChange],
  );

  // ── Know whether user is typing ──────────────────────────────
  const hasQuery = query.trim().length >= 2;

  return (
    <div className="space-y-3">
      <label className={adminLabel}>Sản phẩm liên quan (SEO)</label>

      {/* Search input */}
      <input
        type="text"
        className={adminInput}
        placeholder="Tìm sản phẩm… (tối thiểu 2 ký tự)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Search results dropdown */}
      {hasQuery && (
        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-6 text-sm text-slate-500">
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang tìm kiếm…
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-sm text-rose-600">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
                    onClick={() => handleAdd(item)}
                  >
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          Ảnh
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">/{item.slug}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected products (sortable list) */}
      {selected.length > 0 && (
        <div className={`${adminCardBody} space-y-2`}>
          <div className="text-xs font-medium text-slate-500">
            Đã chọn ({selected.length} sản phẩm) — kéo thả để sắp xếp
          </div>
          {selected.map((item, index) => (
            <div
              key={item.productId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                dragIndex === index
                  ? "border-sky-300 bg-sky-50 opacity-60"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {/* Drag handle */}
              <span className="cursor-grab text-slate-400 hover:text-slate-600" title="Kéo để sắp xếp">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="4" r="1.5" />
                  <circle cx="11" cy="4" r="1.5" />
                  <circle cx="5" cy="8" r="1.5" />
                  <circle cx="11" cy="8" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="11" cy="12" r="1.5" />
                </svg>
              </span>

              {/* Thumbnail */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {item.product.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    SP
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">
                  {item.product.name}
                </div>
                <div className="truncate text-xs text-slate-500">/{item.product.slug}</div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Xoá sản phẩm"
                onClick={() => handleRemove(item.productId)}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && !hasQuery && (
        <p className="text-sm text-slate-400">
          Chưa có sản phẩm nào được chọn. Tìm kiếm và thêm sản phẩm liên quan.
        </p>
      )}
    </div>
  );
}
