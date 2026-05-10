import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  makeHref: (page: number) => string;
}

function pageRange(current: number, total: number): number[] {
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  makeHref,
}: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) return null;

  const safeCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  const pages = pageRange(safeCurrent, totalPages);
  const prev = Math.max(1, safeCurrent - 1);
  const next = Math.min(totalPages, safeCurrent + 1);


  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <Link
        href={makeHref(prev)}
        aria-disabled={safeCurrent === 1}
        className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition ${
          safeCurrent === 1
            ? "pointer-events-none border-zinc-200 text-zinc-400"
            : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
        }`}
      >
        Truoc
      </Link>

      {pages.map((page) => {
        const active = page === safeCurrent;
        return (
          <Link
            key={page}
            href={makeHref(page)}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            }`}
          >
            {page}
          </Link>
        );
      })}

      <Link
        href={makeHref(next)}
        aria-disabled={safeCurrent === totalPages}
        className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition ${
          safeCurrent === totalPages
            ? "pointer-events-none border-zinc-200 text-zinc-400"
            : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
        }`}
      >
        Sau
      </Link>
    </nav>
  );
}
