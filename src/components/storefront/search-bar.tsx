"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  compact?: boolean;
  placeholder?: string;
  /** Merged onto the root form (e.g. min-w-0 flex-1 for header layout). */
  className?: string;
  /** Hide the separate submit button (app-style search input). */
  hideSubmitButton?: boolean;
  /** Optional id override for accessibility. */
  inputId?: string;
}

export default function SearchBar({
  compact = false,
  placeholder = "Tìm sản phẩm, danh mục, thương hiệu...",
  className = "",
  hideSubmitButton = false,
  inputId = "storefront-search",
}: SearchBarProps): JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;

    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex min-w-0 w-full items-center gap-1.5 border border-[#E2E8F0] bg-white p-0.5 shadow-sm ring-1 ring-[#E2E8F0]/70 transition-[box-shadow,border-color] focus-within:border-[#2563EB]/40 focus-within:shadow-md focus-within:ring-2 focus-within:ring-[#2563EB]/15 sm:gap-2 ${
        compact && hideSubmitButton ? "rounded-2xl" : "rounded-xl"
      } ${className}`.trim()}
      role="search"
      aria-label="Tìm kiếm sản phẩm"
    >
      <label htmlFor={inputId} className="sr-only">
        Tìm kiếm sản phẩm
      </label>
      {hideSubmitButton ? (
        <button
          type="submit"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#64748B] transition hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
          aria-label="Tìm kiếm"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]" aria-hidden>
            <path
              d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium leading-none text-slate-800 outline-none transition placeholder:text-slate-500/90 focus:ring-0 ${
          compact
            ? hideSubmitButton
              ? "h-10 px-2.5 sm:h-10 sm:px-3"
              : "h-9 px-2.5 sm:h-10 sm:px-3"
            : "h-10 px-3 sm:h-11 sm:px-3.5"
        }`}
      />
      {!hideSubmitButton ? (
        <button
          type="submit"
          className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-semibold leading-none text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600 whitespace-nowrap ${
            compact ? "h-10 px-3" : "h-10 px-3 sm:h-11 sm:px-3.5"
          }`}
        >
          Tìm
        </button>
      ) : null}
    </form>
  );
}
