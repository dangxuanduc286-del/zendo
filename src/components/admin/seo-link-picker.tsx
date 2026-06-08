"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminInput, adminLabel, adminCardBody } from "../../lib/admin-ui";

// ─── Types ───────────────────────────────────────────────────────

export type SeoLinkType =
  | "PRODUCT"
  | "CATEGORY"
  | "BRAND"
  | "POST"
  | "PAGE"
  | "COUPON"
  | "LANDING_PAGE";

export interface SeoLinkItem {
  linkType: SeoLinkType;
  referenceId: string;
  title: string;
  slug: string;
  url: string;
  thumbnail: string | null;
  anchorText: string | null;
  sortOrder: number;
}

interface SeoLinkPickerProps {
  selected: SeoLinkItem[];
  onChange: (links: SeoLinkItem[]) => void;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  url: string;
  thumbnail: string | null;
  type: SeoLinkType;
}

// ─── Constants ───────────────────────────────────────────────────

const LINK_TYPE_OPTIONS: { value: SeoLinkType; label: string; icon: string }[] = [
  { value: "PRODUCT", label: "Sản phẩm", icon: "🛒" },
  { value: "CATEGORY", label: "Danh mục", icon: "📂" },
  { value: "BRAND", label: "Thương hiệu", icon: "🏷️" },
  { value: "POST", label: "Bài viết", icon: "📝" },
  { value: "PAGE", label: "Trang nội dung", icon: "📄" },
  { value: "COUPON", label: "Mã giảm giá", icon: "🎫" },
  { value: "LANDING_PAGE", label: "Landing Page", icon: "🚀" },
];

const LANDING_PAGE_OPTIONS: { label: string; slug: string; url: string }[] = [
  { label: "Trang chủ", slug: "trang-chu", url: "/" },
  { label: "Bán chạy", slug: "ban-chay", url: "/ban-chay" },
  { label: "Sản phẩm mới", slug: "san-pham-moi", url: "/san-pham-moi" },
  { label: "Flash Deal", slug: "flash-deal", url: "/flash-deal" },
  { label: "Cửa hàng", slug: "cua-hang", url: "/cua-hang" },
  { label: "Bài viết", slug: "bai-viet", url: "/bai-viet" },
  { label: "Ưu đãi", slug: "uu-dai", url: "/uu-dai" },
  { label: "Cộng tác viên", slug: "cong-tac-vien", url: "/cong-tac-vien" },
];

// ─── Component ───────────────────────────────────────────────────

export default function SeoLinkPicker({
  selected,
  onChange,
}: SeoLinkPickerProps): JSX.Element {
  const [selectedType, setSelectedType] = useState<SeoLinkType>("PRODUCT");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced search ──────────────────────────────────────────
  useEffect(() => {
    if (selectedType === "LANDING_PAGE") {
      // No API call for landing pages — use predefined list
      const q = query.trim().toLowerCase();
      setResults(
        LANDING_PAGE_OPTIONS.filter(
          (lp) => q.length < 2 || lp.label.toLowerCase().includes(q) || lp.slug.includes(q),
        ).map((lp) => ({
          id: lp.slug,
          name: lp.label,
          slug: lp.slug,
          url: lp.url,
          thumbnail: null,
          type: "LANDING_PAGE" as SeoLinkType,
        })),
      );
      setLoading(false);
      setError(null);
      return;
    }

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
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/admin/seo/search?type=${selectedType}&q=${encodeURIComponent(q)}&limit=10`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { items: SearchResult[] };
        setResults(data.items);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Không thể tìm kiếm.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedType]);

  // ── Add link ──────────────────────────────────────────────────
  const handleAdd = useCallback(
    (item: SearchResult) => {
      const newLink: SeoLinkItem = {
        linkType: item.type,
        referenceId: item.id,
        title: item.name,
        slug: item.slug,
        url: item.url,
        thumbnail: item.thumbnail,
        anchorText: null,
        sortOrder: selected.length,
      };
      onChange([...selected, newLink]);
      setQuery("");
      setResults([]);
    },
    [selected, onChange],
  );

  // ── Remove link ───────────────────────────────────────────────
  const handleRemove = useCallback(
    (index: number) => {
      const updated = selected.filter((_, i) => i !== index);
      onChange(updated);
    },
    [selected, onChange],
  );

  // ── Update anchor text ────────────────────────────────────────
  const handleAnchorTextChange = useCallback(
    (index: number, value: string) => {
      const updated = selected.map((link, i) =>
        i === index ? { ...link, anchorText: value || null } : link,
      );
      onChange(updated);
    },
    [selected, onChange],
  );

  // ── Type icon helper ──────────────────────────────────────────
  const getTypeIcon = useCallback((type: SeoLinkType): string => {
    return LINK_TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? "🔗";
  }, []);

  const hasQuery = query.trim().length >= 2 || selectedType === "LANDING_PAGE";

  return (
    <div className="space-y-4">
      <label className={adminLabel}>Liên kết SEO</label>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {LINK_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setSelectedType(opt.value);
              setQuery("");
              setResults([]);
            }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              selectedType === opt.value
                ? "border-sky-200 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="text-base">{opt.icon}</span>
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Search input — only show for non-LANDING_PAGE; LANDING_PAGE filters by typing */}
      <div>
        <label className="text-xs font-medium text-slate-500">
          {selectedType === "LANDING_PAGE" ? "Chọn trang" : `Tìm kiếm ${
            LINK_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label.toLowerCase() ?? ""
          }`}
        </label>
        <input
          type="text"
          className={`${adminInput} mt-1`}
          placeholder={
            selectedType === "LANDING_PAGE"
              ? "Lọc landing page…"
              : "Tìm kiếm… (tối thiểu 2 ký tự)"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Search results */}
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
              {selectedType === "LANDING_PAGE"
                ? "Không có trang phù hợp."
                : "Không tìm thấy kết quả phù hợp."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50"
                    onClick={() => handleAdd(item)}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                      {getTypeIcon(item.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">{item.url}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected links (preview) */}
      {selected.length > 0 && (
        <div className={`${adminCardBody} space-y-3`}>
          <div className="text-xs font-medium text-slate-500">
            Đã chọn ({selected.length} liên kết)
          </div>
          {selected.map((link, index) => (
            <div
              key={`${link.linkType}-${link.referenceId}-${index}`}
              className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                  {getTypeIcon(link.linkType)}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {link.title}
                    </span>
                    <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {LINK_TYPE_OPTIONS.find((o) => o.value === link.linkType)?.label ?? link.linkType}
                    </span>
                  </div>
                  <div className="truncate text-xs text-sky-600">{link.url}</div>

                  {/* Anchor text field */}
                  <div className="mt-2">
                    <label className="text-[10px] font-medium text-slate-400">
                      Anchor Text (để trống = dùng title)
                    </label>
                    <input
                      type="text"
                      className={`${adminInput} mt-0.5 h-9 text-xs`}
                      placeholder={link.title}
                      value={link.anchorText ?? ""}
                      onChange={(e) => handleAnchorTextChange(index, e.target.value)}
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Xoá liên kết"
                  onClick={() => handleRemove(index)}
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
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && !hasQuery && (
        <p className="text-sm text-slate-400">
          Chưa có liên kết nào. Chọn loại liên kết, tìm kiếm và thêm.
        </p>
      )}
    </div>
  );
}
