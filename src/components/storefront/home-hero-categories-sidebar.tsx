"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MediaImage from "../shared/media-image";

type HomeHeroCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

const PRIORITY_KEYS = [
  "phu kien",
  "lam dep",
  "dien tu",
  "nha cua doi song",
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function FallbackCategoryIcon({ name }: { name: string }): JSX.Element {
  const n = normalize(name);
  const common = "h-[18px] w-[18px] text-slate-500";
  const has = (...terms: string[]) => terms.some((term) => n.includes(term));

  if (has("dien tu dien gia dung", "dien may", "dien gia dung")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M9 3v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M15 3v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9 7h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 10v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9 18h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (has("phu kien", "cap", "tai nghe")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M9 7h6v3a3 3 0 1 1-6 0V7Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 13v4M14 13v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (has("lam dep", "cham soc", "my pham")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M12 3 9.8 8.4 4 9.2l4.3 3.8L7 19l5-3 5 3-1.3-6 4.3-3.8-5.8-.8L12 3Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (has("thuc pham", "bach hoa", "tap hoa", "sieu thi")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M6 8h13l-1.4 8.2a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.6L5.7 4.8A1 1 0 0 0 4.7 4H3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="20" r="1.2" fill="currentColor" />
        <circle cx="16" cy="20" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (has("nha cua", "doi song")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="m3 10 9-7 9 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M6 10v10h12V10" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (has("gia dung", "do bep", "nha bep")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M7 5h10v4H7z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 9v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (has("thoi trang", "quan ao", "trang phuc")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="m8 5 4 2 4-2 3 3-3 2v9H8v-9L5 8l3-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (has("dien tu", "cong nghe", "thiet bi")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="7" y="3.5" width="10" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 6h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ToggleIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d={expanded ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomeHeroCategoriesSidebar({
  categories,
}: {
  categories: HomeHeroCategory[];
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const prepared = useMemo(() => {
    const withPriority = categories.map((category) => ({ category }));

    const primary: typeof withPriority = [];
    for (const key of PRIORITY_KEYS) {
      const found = withPriority.find((item) => normalize(item.category.name).includes(key));
      if (found && !primary.some((item) => item.category.id === found.category.id)) {
        primary.push(found);
      }
    }

    for (const item of withPriority) {
      if (primary.length >= 4) break;
      if (!primary.some((picked) => picked.category.id === item.category.id)) {
        primary.push(item);
      }
    }

    const primaryIds = new Set(primary.map((item) => item.category.id));
    const hidden = withPriority.filter((item) => !primaryIds.has(item.category.id));
    return {
      primary: primary.slice(0, 4).map((item) => item.category),
      hidden: hidden.map((item) => item.category),
    };
  }, [categories]);

  const shown = expanded ? [...prepared.primary, ...prepared.hidden] : prepared.primary;
  const canToggle = prepared.hidden.length > 0;
  const isCollapsed = !expanded;

  return (
    <aside className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.28)]">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-[15px] w-[15px] text-slate-600" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <h3 className="truncate text-[13px] font-semibold leading-5 text-slate-900">Danh mục sản phẩm</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1.5">
          <div className={isCollapsed ? "flex h-full flex-col justify-evenly gap-1" : "space-y-0.5"}>
            {shown.map((cat) => {
              const href = `/danh-muc/${cat.slug}`;
              const imageUrl = cat.imageUrl || "";
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-800 transition-colors hover:bg-[#F3F8FF] hover:text-[#1D4ED8] ${
                    isCollapsed ? "min-h-0 flex-1" : ""
                  }`}
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-[#EFF6FF] transition group-hover:bg-[#DBEAFE]">
                    {imageUrl ? (
                      <MediaImage src={imageUrl} alt={cat.name} width={32} height={32} className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <FallbackCategoryIcon name={cat.name} />
                    )}
                  </span>
                  <span className="min-w-0 truncate text-[12px] font-medium leading-5">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 p-2">
          {canToggle ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            >
              <span>{expanded ? "Thu gọn danh mục" : "Xem tất cả danh mục"}</span>
              <ToggleIcon expanded={expanded} />
            </button>
          ) : (
            <Link
              href="/cua-hang"
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            >
              <span>Xem tất cả danh mục</span>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M3 5h8v8H3zM13 5h8v8h-8zM3 15h8v8H3zM13 15h8v8h-8z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
