"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type MenuParent = {
  id: string;
  name: string;
  slug: string;
  children?: Array<{ id: string; name: string; slug: string }>;
};

interface HeaderDesktopCategoryMenuProps {
  categories: MenuParent[];
  danhMucHref: string;
  navItemClass: string;
}

export default function HeaderDesktopCategoryMenu({
  categories,
  danhMucHref,
  navItemClass,
}: HeaderDesktopCategoryMenuProps): JSX.Element {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const firstParent = categories[0];
  const activeParent = categories.find((p) => p.id === activeParentId) ?? firstParent ?? null;
  const activeChildren = activeParent?.children ?? [];

  const categoryIdsKey = categories.map((c) => c.id).join("|");

  useEffect(() => {
    setPanelOpen(false);
    setActiveParentId(null);
  }, [categoryIdsKey]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setActiveParentId(null);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const el = rootRef.current;
      if (!el || !(event.target instanceof Node) || el.contains(event.target)) return;
      closePanel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen, closePanel]);

  useEffect(() => {
    if (!panelOpen) return;
    if (activeParentId) return;
    if (firstParent?.id) setActiveParentId(firstParent.id);
  }, [panelOpen, activeParentId, firstParent?.id]);

  if (!categories.length) {
    return (
      <Link href={danhMucHref} className={navItemClass}>
        Danh mục
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </Link>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setPanelOpen(true)}
      onMouseLeave={() => {
        closePanel();
      }}
    >
      <button
        type="button"
        className={navItemClass}
        aria-expanded={panelOpen}
        aria-haspopup="true"
        onClick={() => setPanelOpen((open) => !open)}
      >
        Danh mục
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {panelOpen ? (
        <div className="absolute right-0 top-full z-50 pt-1.5">
          <div
            className="flex w-[min(92vw,440px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            role="menu"
            aria-label="Danh mục sản phẩm"
          >
          <ul className="max-h-[min(70vh,360px)] w-[46%] shrink-0 overflow-y-auto border-r border-zinc-100 py-2">
            {categories.map((parent) => {
              const isActive = activeParent?.id === parent.id;
              return (
                <li key={parent.id}>
                  <div className="flex items-stretch">
                    <Link
                      href={`/danh-muc/${parent.slug}`}
                      className={`flex-1 px-3 py-2.5 text-sm font-semibold leading-none transition hover:bg-zinc-50 ${
                        isActive ? "bg-zinc-50 text-zinc-900" : "text-zinc-800"
                      }`}
                      onMouseEnter={() => setActiveParentId(parent.id)}
                      onFocus={() => setActiveParentId(parent.id)}
                    >
                      {parent.name}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="max-h-[min(70vh,360px)] min-h-[120px] flex-1 overflow-y-auto p-3">
            {activeChildren.length ? (
              <ul className="space-y-1" aria-label={`Danh mục con ${activeParent?.name ?? ""}`}>
                {activeChildren.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/danh-muc/${child.slug}`}
                      className="block rounded-lg px-2 py-1.5 text-sm font-medium leading-none text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                      role="menuitem"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 py-2 text-sm leading-snug text-zinc-500">Chưa có danh mục con.</p>
            )}
            <Link
              href={danhMucHref}
              className="mt-3 inline-flex text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
            >
              Xem danh mục đầu tiên
            </Link>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
