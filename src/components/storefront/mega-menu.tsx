import Link from "next/link";
import type { Category } from "@prisma/client";
import { TopbarSupportButton } from "../layout/topbar-support-button";

type MenuCategory = Pick<Category, "id" | "name" | "slug"> & {
  children?: Array<Pick<Category, "id" | "name" | "slug">>;
};

interface MegaMenuProps {
  categories: MenuCategory[];
}

export default function MegaMenu({ categories }: MegaMenuProps): JSX.Element {
  return (
    <nav aria-label="Danh mục sản phẩm" className="overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1.5">
        {categories[0]?.slug ? (
          <li>
            <Link
              href={`/danh-muc/${categories[0].slug}`}
              className="inline-flex rounded-md px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Danh mục
            </Link>
          </li>
        ) : null}
        <li>
          <Link
            href="/cua-hang"
            className="inline-flex rounded-md px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Cửa hàng
          </Link>
        </li>
        <li>
          <Link
            href="/bai-viet"
            className="inline-flex rounded-md px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Bài viết
          </Link>
        </li>
        <li>
          <TopbarSupportButton variant="megaMenu" />
        </li>
        <li>
          <Link
            href="/"
            className="inline-flex rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Tất cả
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/danh-muc/${category.slug}`}
              className="inline-flex rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
