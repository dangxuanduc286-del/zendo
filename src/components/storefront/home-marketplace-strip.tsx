import Link from "next/link";

type StripCategory = { name: string; slug: string };

function IconFlash(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFlame(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M12 21c-3.6 0-6.5-2.7-6.5-6.3 0-2.2 1.2-4.2 3-5.4.3 2.1 1.8 3.5 3.5 4.1-.6-2.3.2-4.8 2.3-6.9 3.1 2.4 4.2 5.3 4.2 8.2C18.5 18.3 15.6 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGift(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8V21M3 12h18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8H8.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8Zm0 0h3.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M13 2 10 10h6l-9 12 3-9H6l7-11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoryGlyph({ index }: { index: number }): JSX.Element {
  const common = "h-5 w-5 text-current sm:h-6 sm:w-6";
  if (index % 6 === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M9.2 4h5.6l.6 3.2 3 2.1-2.8 10.7H8.4L5.6 9.3l3-2.1L9.2 4Zm1.3 3.2h3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (index % 6 === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 19h6M12 16v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (index % 6 === 2) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M4 11 12 5l8 6v9H4v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (index % 6 === 3) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M4 13.2V12a8 8 0 0 1 16 0v1.2M5.8 13.2h3.4a1.2 1.2 0 0 1 1.2 1.2v2a1.2 1.2 0 0 1-1.2 1.2H6.8a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1Zm9 0h3.4a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1h-2.4a1.2 1.2 0 0 1-1.2-1.2v-2a1.2 1.2 0 0 1 1.2-1.2Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (index % 6 === 4) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M7 8h10l-1 11H8L7 8Zm2-1.5V6a3 3 0 0 1 6 0v.5M10 12h4m-5 3h6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

const SHORTCUTS: Array<{
  href: string;
  label: string;
  Icon: () => JSX.Element;
}> = [
  {
    href: "/#flash-sale-products-heading",
    label: "Flash sale",
    Icon: IconFlash,
  },
  {
    href: "/#featured-products-heading",
    label: "Deal hot",
    Icon: IconFlame,
  },
  {
    href: "/bai-viet",
    label: "Voucher",
    Icon: IconGift,
  },
  {
    href: "/#new-products-heading",
    label: "Mới về",
    Icon: IconSpark,
  },
];

export default function HomeMarketplaceStrip({ categories }: { categories: StripCategory[] }): JSX.Element {
  const tiles =
    categories.length > 0
      ? [...categories.slice(0, 5), { name: "Xem tất cả", slug: "__all__" }]
      : [
          { name: "Điện tử", slug: "__placeholder__" },
          { name: "Phụ kiện", slug: "__placeholder__" },
          { name: "Nhà cửa", slug: "__placeholder__" },
          { name: "Đời sống", slug: "__placeholder__" },
          { name: "Thiết bị", slug: "__placeholder__" },
          { name: "Xem tất cả", slug: "__all__" },
        ];

  const CATEGORY_LABELS = ["Làm đẹp", "Điện tử", "Nhà cửa/Đời sống", "Phụ kiện", "Thực phẩm/Bách hóa", "Xem tất cả"];

  return (
    <section id="uu-dai" className="scroll-mt-28 space-y-4 sm:space-y-5">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-2 py-2 text-center shadow-sm transition hover:border-[#2563EB]/25 hover:shadow-md sm:flex-row sm:justify-start sm:gap-2.5 sm:rounded-2xl sm:p-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FDBA74] bg-[#FFF7ED] text-[#F59E0B]"
            >
              <item.Icon />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold leading-tight text-[#0F172A]">{item.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-[#0F172A] sm:text-base">Danh mục ngành hàng</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {tiles.map((cat, index) => {
            const isAll = cat.slug === "__all__";
            const isPh = cat.slug === "__placeholder__";
            const href = isAll ? "/cua-hang" : isPh ? "/cua-hang" : `/danh-muc/${cat.slug}`;
            const displayLabel = CATEGORY_LABELS[index] ?? cat.name;
            return (
              <Link
                key={`${cat.name}-${index}`}
                href={href}
                className="flex flex-col items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-1.5 py-2.5 text-center shadow-sm transition hover:border-[#2563EB]/25 hover:shadow-md sm:rounded-2xl sm:py-3.5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] sm:h-11 sm:w-11">
                  {isAll ? <CategoryGlyph index={5} /> : <CategoryGlyph index={index} />}
                </span>
                <span className="line-clamp-2 min-h-7 w-full text-[10px] font-semibold leading-tight text-[#334155] sm:min-h-8 sm:text-[11px]">
                  {displayLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
