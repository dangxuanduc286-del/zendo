import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../../components/storefront/empty-state";
import Pagination from "../../../../../components/storefront/pagination";
import ProductGrid from "../../../../../components/storefront/product-grid";
import SectionHeading from "../../../../../components/storefront/section-heading";
import type { ProductCardData } from "../../../../../components/storefront/product-card";
import { resolveMediaUrl } from "../../../../../lib/media";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../../../lib/seo";
import { getWebsiteSettings } from "../../../../../lib/settings";

const PAGE_SIZE = 12;
export const dynamic = "force-dynamic";

type ParamsInput = Promise<{ slug: string }>;
type SearchParamsInput =
  Promise<Record<string, string | string[] | undefined>>;

type CategoryModel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  parentId: string | null;
  children: Array<{ id: string }>;
};

type BrandOption = {
  id: string;
  name: string;
  slug: string;
};

type ProductModel = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  stockQuantity: number;
  soldCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  createdAt: Date;
  brand: BrandOption | null;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseBoolean(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "on";
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parseBrandFilters(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSort(value: string | undefined): "newest" | "price_asc" | "price_desc" | "best_seller" {
  if (value === "price_asc" || value === "price_desc" || value === "best_seller") return value;
  return "newest";
}

function primaryImage(images: ProductModel["images"]): string {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((image) => image.isPrimary) ?? sorted[0];
  return resolveMediaUrl(primary?.url ?? "");
}

function toCardProduct(product: ProductModel): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(product.images),
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    soldCount: product.soldCount ?? 0,
    isFeatured: product.isFeatured,
    isNew: false,
  };
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (Array.isArray(raw)) {
      for (const value of raw) result.append(key, value);
    } else if (raw != null) {
      result.set(key, raw);
    }
  }
  return result;
}

export async function generateMetadata({
  params,
}: {
  params: ParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;
  const db = await getDbClient();

  let category: CategoryModel | null = null;
  if (db) {
    const data = await db.category.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        parentId: true,
        children: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    });
    category = data;
  }

  if (!category) {
    return {
      title: "Danh mục không tồn tại | Zendo.vn",
      robots: { index: false, follow: false },
    };
  }

  return buildDynamicMetadata({
    title: category.seoTitle ?? `${category.name} | Zendo.vn`,
    description:
      category.seoDescription ??
      category.description ??
      `Khám phá sản phẩm ${category.name} mới nhất tại Zendo.vn`,
    path: `/danh-muc/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams: SearchParamsInput;
}): Promise<JSX.Element> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const resolvedSearchParams = await Promise.resolve(searchParams);
    const categorySlug = resolvedParams.slug;
    const websiteSettings = await getWebsiteSettings();

    const minPrice = parsePositiveNumber(firstValue(resolvedSearchParams.minPrice));
    const maxPrice = parsePositiveNumber(firstValue(resolvedSearchParams.maxPrice));
    const inStockOnly = parseBoolean(firstValue(resolvedSearchParams.inStock));
    const featuredOnly = parseBoolean(firstValue(resolvedSearchParams.featured));
    const brandFilters = parseBrandFilters(resolvedSearchParams.brand);
    const sort = parseSort(firstValue(resolvedSearchParams.sort));
    const page = Math.max(1, Number(firstValue(resolvedSearchParams.page) ?? 1) || 1);


    const db = await getDbClient();
    let category: CategoryModel | null = null;
    let products: ProductModel[] = [];
    let totalItems = 0;
    let brandOptions: BrandOption[] = [];

    if (db) {
    const foundCategory = await db.category.findFirst({
      where: { slug: categorySlug, status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        parentId: true,
        children: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    });
    category = foundCategory;

    if (category) {
      const categoryIds = [category.id, ...category.children.map((item) => item.id)];
      const where: Record<string, unknown> = {
        categoryId: { in: categoryIds },
        status: "ACTIVE",
      };

      if (inStockOnly) where.stockQuantity = { gt: 0 };
      if (featuredOnly) where.isFeatured = true;
      if (brandFilters.length) where.brand = { slug: { in: brandFilters } };
      if (minPrice != null || maxPrice != null) {
        where.basePrice = {
          ...(minPrice != null ? { gte: minPrice } : {}),
          ...(maxPrice != null ? { lte: maxPrice } : {}),
        };
      }

      const orderBy =
        sort === "price_asc"
          ? [{ basePrice: "asc" as const }]
          : sort === "price_desc"
            ? [{ basePrice: "desc" as const }]
            : sort === "best_seller"
              ? [{ isBestSeller: "desc" as const }, { updatedAt: "desc" as const }]
              : [{ createdAt: "desc" as const }];

      const skip = (page - 1) * PAGE_SIZE;
      const [rows, count, brandsInCategory] = await Promise.all([
        db.product.findMany({
          where,
          orderBy,
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            salePrice: true,
            stockQuantity: true,
            soldCount: true,
            isFeatured: true,
            isBestSeller: true,
            createdAt: true,
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            images: {
              select: {
                url: true,
                isPrimary: true,
                sortOrder: true,
              },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 3,
            },
          },
        }),
        db.product.count({ where }),
        db.product.findMany({
          where: { categoryId: category.id, status: "ACTIVE", brandId: { not: null } },
          select: {
            brand: {
              select: { id: true, name: true, slug: true },
            },
          },
          distinct: ["brandId"],
        }),
      ]);

      products = rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        basePrice: Number(row.basePrice),
        salePrice: row.salePrice == null ? null : Number(row.salePrice),
        stockQuantity: row.stockQuantity,
        soldCount: row.soldCount ?? 0,
        isFeatured: row.isFeatured,
        isBestSeller: row.isBestSeller,
        createdAt: row.createdAt,
        brand: row.brand,
        images: row.images,
      }));
      totalItems = count;
      brandOptions = brandsInCategory
        .map((item) => item.brand)
        .filter((item): item is BrandOption => Boolean(item))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    }

    if (!category) {
      notFound();
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);


    const queryForPagination = toUrlSearchParams(resolvedSearchParams);
    const makeHref = (targetPage: number) => {
      const paramsForLink = new URLSearchParams(queryForPagination.toString());
      paramsForLink.set("page", String(targetPage));
      const queryString = paramsForLink.toString();
      return queryString ? `/danh-muc/${category.slug}?${queryString}` : `/danh-muc/${category.slug}`;
    };
    const breadcrumbJsonLd = buildBreadcrumbJsonLd([
      { name: "Trang chủ", path: "/" },
      { name: "Danh mục", path: "/cua-hang" },
      { name: category.name, path: `/danh-muc/${category.slug}` },
    ]);

    return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Danh mục", href: "/cua-hang" },
          { label: category.name },
        ]}
      />

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{category.name}</h1>
        {category.description ? (
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">{category.description}</p>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-base font-semibold text-zinc-900">Lọc sản phẩm</h2>
          <form className="mt-4 space-y-4" method="get">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm text-zinc-700">
                <span>Giá từ</span>
                <input
                  name="minPrice"
                  defaultValue={minPrice ?? ""}
                  type="number"
                  min={0}
                  className="h-10 w-full rounded-md border border-zinc-300 px-3 outline-none transition focus:border-zinc-500"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-700">
                <span>Đến</span>
                <input
                  name="maxPrice"
                  defaultValue={maxPrice ?? ""}
                  type="number"
                  min={0}
                  className="h-10 w-full rounded-md border border-zinc-300 px-3 outline-none transition focus:border-zinc-500"
                />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-800">Thương hiệu</legend>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {brandOptions.map((brand) => (
                  <label key={brand.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="brand"
                      value={brand.slug}
                      defaultChecked={brandFilters.includes(brand.slug)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span>{brand.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="inStock"
                value="true"
                defaultChecked={inStockOnly}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span>Còn hàng</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="featured"
                value="true"
                defaultChecked={featuredOnly}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span>Nổi bật</span>
            </label>

            <label className="block space-y-1 text-sm text-zinc-700">
              <span>Sắp xếp</span>
              <select
                name="sort"
                defaultValue={sort}
                className="h-10 w-full rounded-md border border-zinc-300 px-3 outline-none transition focus:border-zinc-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="best_seller">Bán chạy</option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Áp dụng
            </button>
          </form>
        </aside>

        <section>
          <SectionHeading
            title={`Sản phẩm ${category.name}`}
            description={`${totalItems} sản phẩm phù hợp`}
          />

          {products.length ? (
            <>
              <ProductGrid
                products={products.map(toCardProduct)}
                desktopColumns={websiteSettings.productGridColumnsDesktop}
              />
              <Pagination currentPage={safePage} totalPages={totalPages} makeHref={makeHref} />
            </>
          ) : (
            <EmptyState
              title="Không tìm thấy sản phẩm phù hợp"
              description="Hãy điều chỉnh bộ lọc hoặc quay lại sau khi danh mục được cập nhật."
              actionLabel="Xóa bộ lọc"
              actionHref={`/danh-muc/${category.slug}`}
            />
          )}
        </section>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
    );
  } catch (error) {
    throw error;
  }
}
