"use client";

import { useEffect, useState, useCallback } from "react";

interface SeoKeywordsFieldProps {
  mainKeyword: string;
  subKeywords: string[];
  onChange(main: string, sub: string[]): void;
  /** Site URL prefix for full URL preview */
  slug?: string;
  /** "post" or "page" */
  kind?: "post" | "page";
  /** For SEO check: title, meta description */
  title?: string;
  metaDescription?: string;
}

export function AdminSeoKeywordsField({
  mainKeyword,
  subKeywords,
  onChange,
  slug,
  kind = "post",
  title,
  metaDescription,
}: SeoKeywordsFieldProps): JSX.Element {
  const [mainInput, setMainInput] = useState(mainKeyword ?? "");
  const [subList, setSubList] = useState<string[]>(subKeywords ?? []);
  const [subInput, setSubInput] = useState("");

  const sync = useCallback(
    (main: string, subs: string[]) => {
      onChange(main, subs);
    },
    [onChange],
  );

  useEffect(() => {
    setMainInput(mainKeyword ?? "");
  }, [mainKeyword]);

  useEffect(() => {
    setSubList(subKeywords ?? []);
  }, [subKeywords]);

  const addSubKeyword = () => {
    const trimmed = subInput.trim();
    if (!trimmed) return;
    if (subList.length >= 5) return;
    if (subList.includes(trimmed)) return;
    const next = [...subList, trimmed];
    setSubList(next);
    setSubInput("");
    sync(mainInput, next);
  };

  const removeSubKeyword = (index: number) => {
    const next = subList.filter((_, i) => i !== index);
    setSubList(next);
    sync(mainInput, next);
  };

  const handleMainChange = (value: string) => {
    setMainInput(value);
    sync(value, subList);
  };

  const handleSubKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubKeyword();
    }
  };

  /** Auto-generate meta keywords string */
  const autoKeywords = (() => {
    const parts: string[] = [];
    if (mainInput.trim()) parts.push(mainInput.trim());
    for (const s of subList) {
      if (s.trim()) parts.push(s.trim());
    }
    return parts.join(", ");
  })();

  /** SEO checks */
  const baseUrl = "https://zendo.vn";
  const fullUrl =
    slug && kind === "post"
      ? `${baseUrl}/bai-viet/${slug}`
      : slug
        ? `${baseUrl}/${slug}`
        : null;

  const checks = {
    inTitle: mainInput.trim()
      ? title?.toLowerCase().includes(mainInput.trim().toLowerCase()) ?? null
      : null,
    inSlug: mainInput.trim()
      ? slug?.toLowerCase().includes(mainInput.trim().toLowerCase().replace(/\s+/g, "-")) ?? null
      : null,
    inMetaDesc: mainInput.trim()
      ? metaDescription?.toLowerCase().includes(mainInput.trim().toLowerCase()) ?? null
      : null,
  };

  const statusIcon = (pass: boolean | null) => {
    if (pass === null) return "";
    return pass ? "🟢" : "🟡";
  };
  const statusText = (pass: boolean | null) => {
    if (pass === null) return "—";
    return pass ? "Tốt" : "Cần tối ưu";
  };

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-sm font-semibold text-zinc-800">SEO</span>
      </div>

      {/* Tu khoa chinh */}
      <div>
        <label className="block text-xs font-medium text-zinc-600">
          Tu khoa chinh <span className="text-rose-500">*</span>
        </label>
        <input
          value={mainInput}
          onChange={(e) => handleMainChange(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          placeholder="vi du: loa bluetooth"
          maxLength={120}
        />
      </div>

      {/* Tu khoa phu */}
      <div>
        <label className="block text-xs font-medium text-zinc-600">
          Tu khoa phu{" "}
          <span className="text-zinc-400">(toi da 5, Enter de them)</span>
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {subList.map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeSubKeyword(i)}
                className="text-zinc-400 hover:text-rose-600"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        {subList.length < 5 && (
          <div className="mt-1 flex gap-1">
            <input
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={handleSubKeyDown}
              className="h-8 flex-1 rounded-md border border-zinc-300 px-2.5 text-sm outline-none focus:border-zinc-500"
              placeholder="Them tu khoa phu..."
              maxLength={120}
            />
            <button
              type="button"
              onClick={addSubKeyword}
              disabled={!subInput.trim() || subList.length >= 5}
              className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              + Them
            </button>
          </div>
        )}
      </div>

      {/* Auto meta keywords */}
      {autoKeywords ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Meta keywords tu dong
          </p>
          <p className="mt-0.5 text-xs text-zinc-700">{autoKeywords}</p>
        </div>
      ) : null}

      {/* SEO check */}
      {slug && mainInput.trim() ? (
        <div>
          {fullUrl ? (
            <div className="rounded-md bg-blue-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
                URL hoan chinh
              </p>
              <p className="mt-0.5 break-all text-xs text-blue-800">{fullUrl}</p>
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-1.5 rounded border border-zinc-100 px-2 py-1.5">
              <span>{statusIcon(checks.inTitle)}</span>
              <span className="text-zinc-500">Title:</span>
              <span
                className={
                  checks.inTitle === false ? "text-amber-700" : "text-zinc-700"
                }
              >
                {statusText(checks.inTitle)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded border border-zinc-100 px-2 py-1.5">
              <span>{statusIcon(checks.inSlug)}</span>
              <span className="text-zinc-500">Slug:</span>
              <span
                className={
                  checks.inSlug === false ? "text-amber-700" : "text-zinc-700"
                }
              >
                {statusText(checks.inSlug)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded border border-zinc-100 px-2 py-1.5">
              <span>{statusIcon(checks.inMetaDesc)}</span>
              <span className="text-zinc-500">Meta desc:</span>
              <span
                className={
                  checks.inMetaDesc === false
                    ? "text-amber-700"
                    : "text-zinc-700"
                }
              >
                {statusText(checks.inMetaDesc)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
