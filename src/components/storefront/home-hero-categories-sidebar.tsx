"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { storefrontSectionTitleTypography } from "./storefront-typography";

type HomeHeroCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

type CategoryKind = "electronics" | "accessories" | "appliances" | "home" | "all";

type CategoryTarget = {
  kind: CategoryKind;
  label: string;
  matches: (category: HomeHeroCategory) => boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTerms(category: HomeHeroCategory, ...terms: string[]): boolean {
  const name = normalize(category.name);
  const slug = normalize(category.slug);
  return terms.some((term) => name.includes(term) || slug.includes(term));
}

const CATEGORY_TARGETS: CategoryTarget[] = [
  {
    kind: "electronics",
    label: "Điện tử",
    matches: (category) => {
      const name = normalize(category.name);
      const slug = normalize(category.slug);
      const looksLikeAppliance = name.includes("dien gia dung") || slug.includes("dien gia dung") || name.includes("dien may");
      return !looksLikeAppliance && (name === "dien tu" || slug === "dien tu" || matchesTerms(category, "cong nghe", "thiet bi dien tu"));
    },
  },
  {
    kind: "accessories",
    label: "Phụ kiện",
    matches: (category) => matchesTerms(category, "phu kien", "tai nghe", "dong ho", "cap sac"),
  },
  {
    kind: "appliances",
    label: "Điện tử / Điện gia dụng",
    matches: (category) => matchesTerms(category, "dien tu dien gia dung", "dien gia dung", "dien may", "tivi", "tu lanh", "may giat"),
  },
  {
    kind: "home",
    label: "Nhà cửa / Đời sống",
    matches: (category) => matchesTerms(category, "nha cua", "doi song", "do gia dung"),
  },
];

function CategoryIcon({ kind }: { kind: CategoryKind }): JSX.Element {
  const common = "h-6 w-6 text-current";

  if (kind === "electronics") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="3.5" y="5" width="11" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 17h6M10 13v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="16.5" y="7" width="4" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M18.1 14.7h.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "accessories") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M5 13v-1a7 7 0 0 1 14 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 13h3v5H6.5A1.5 1.5 0 0 1 5 16.5V13ZM19 13h-3v5h1.5a1.5 1.5 0 0 0 1.5-1.5V13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14.5 19.5h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "appliances") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="3.75" y="4.25" width="7.5" height="15.5" rx="1.7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 8h3M7.5 16.5h.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="13.25" y="5.25" width="7" height="13.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.3 8.5h2.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16.75" cy="14.5" r="2.25" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="m3.5 10 8.5-6.5 8.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10v9h12v-9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeHeroCategoriesSidebar({
  categories,
}: {
  categories: HomeHeroCategory[];
}): JSX.Element {
  const pathname = usePathname();

  const orderedCategories = useMemo(() => {
    const pickedIds = new Set<string>();

    return CATEGORY_TARGETS.flatMap((target) => {
      const category = categories.find((candidate) => !pickedIds.has(candidate.id) && target.matches(candidate));
      if (!category) {
        return [];
      }
      pickedIds.add(category.id);
      return [{ category, target }];
    });
  }, [categories]);

  return (
    <aside
      aria-labelledby="home-hero-categories-title"
      className="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.38)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex min-h-10 items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-1.5">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1D4ED8]">
            <CategoryIcon kind="all" />
          </span>
          <h3 id="home-hero-categories-title" className="truncate text-[14px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
            Danh mục sản phẩm
          </h3>
        </div>

        <nav aria-label="Danh mục sản phẩm nổi bật" className="flex-1 px-2 py-1.5">
          <ul className="flex h-full min-h-0 flex-col justify-between gap-1">
            {orderedCategories.map(({ category, target }) => {
              const href = `/danh-muc/${category.slug}`;
              const isActive = pathname === href;
              return (
                <li key={category.id}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-1 text-slate-800 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#93C5FD] ${
                      isActive ? "bg-[#DBEAFE] text-[#1D4ED8] shadow-sm" : ""
                    }`}
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition duration-200 group-hover:bg-white group-hover:text-[#1D4ED8] group-hover:shadow-sm">
                      <CategoryIcon kind={target.kind} />
                    </span>
                    <span className={`min-w-0 text-[14px] leading-5 ${storefrontSectionTitleTypography}`}>{target.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/cua-hang"
                className="group flex min-h-11 items-center gap-3 rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-white px-2.5 py-1 text-[#1D4ED8] shadow-sm outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[#60A5FA] hover:from-[#DBEAFE] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#93C5FD]"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-white text-[#1D4ED8] shadow-sm">
                  <CategoryIcon kind="all" />
                </span>
                <span className="min-w-0 text-[14px] font-bold leading-5 tracking-[-0.01em]">Xem tất cả danh mục</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
