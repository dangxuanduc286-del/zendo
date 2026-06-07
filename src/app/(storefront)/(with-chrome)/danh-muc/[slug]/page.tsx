import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../../components/storefront/empty-state";
import Pagination from "../../../../../components/storefront/pagination";
import ProductGrid from "../../../../../components/storefront/product-grid";
import type { ProductCardData } from "../../../../../components/storefront/product-card";
import { resolveMediaUrl } from "../../../../../lib/media";
import { buildBreadcrumbJsonLd, buildDynamicMetadata, buildFaqPageJsonLd, buildItemListJsonLd } from "../../../../../lib/seo";
import { getThemeSettings, getWebsiteSettings } from "../../../../../lib/settings";
import { MARKETING_FRAME } from "../../../../../lib/storefront-frame";
import { getProductReviewMetricsMap, type ProductReviewMetrics } from "../../../../../lib/storefront/product-review-metrics";

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
  children: Array<{ id: string; name: string; slug: string; description: string | null }>;
  parent: { id: string; name: string; slug: string; description: string | null } | null;
};

type RelatedCategoryModel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type RelatedArticleModel = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
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

function toCardProduct(product: ProductModel, metrics?: ProductReviewMetrics): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(product.images),
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    soldCount: product.soldCount ?? 0,
    stockQuantity: product.stockQuantity,
    ratingAverage: metrics?.ratingAverage ?? null,
    reviewCount: metrics?.reviewCount ?? 0,
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
  searchParams,
}: {
  params: ParamsInput;
  searchParams: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const slug = resolvedParams.slug;
  const page = Math.max(1, Number(firstValue(resolvedSearchParams.page) ?? 1) || 1);
  const indexableParams = new Set(["page"]);
  const hasFilterOrSortParams = Object.keys(resolvedSearchParams).some((key) => !indexableParams.has(key));
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
        children: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, slug: true, description: true },
        },
        parent: { select: { id: true, name: true, slug: true, description: true } },
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
    title: page > 1 ? `${category.seoTitle ?? category.name} - Trang ${page} | Zendo.vn` : category.seoTitle ?? `${category.name} | Zendo.vn`,
    description:
      category.seoDescription ??
      category.description ??
      `Khám phá sản phẩm ${category.name} mới nhất tại Zendo.vn`,
    path: page > 1 && !hasFilterOrSortParams ? `/danh-muc/${category.slug}?page=${page}` : `/danh-muc/${category.slug}`,
    noIndex: hasFilterOrSortParams,
    robotsFollow: true,
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
    const [websiteSettings, themeSettings] = await Promise.all([
      getWebsiteSettings(),
      getThemeSettings(),
    ]);

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
    let relatedCategories: RelatedCategoryModel[] = [];
    let relatedArticles: RelatedArticleModel[] = [];
    let relatedProducts: ProductModel[] = [];
    let reviewMetricsMap = new Map<string, ProductReviewMetrics>();

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
        children: {
          where: { status: "PUBLISHED" },
          select: { id: true, name: true, slug: true, description: true },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
          take: 8,
        },
        parent: { select: { id: true, name: true, slug: true, description: true } },
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
      const relatedCategoryWhere = category.parentId
        ? { parentId: category.parentId, status: "PUBLISHED" as const, id: { not: category.id } }
        : { parentId: category.id, status: "PUBLISHED" as const };

      const [rows, count, brandsInCategory, relatedCategoryRows, relatedArticleRows, relatedProductRows] = await Promise.all([
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
              take: 1,
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
        db.category.findMany({
          where: relatedCategoryWhere,
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
          take: 8,
          select: { id: true, name: true, slug: true, description: true },
        }),
        db.post.findMany({
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          take: 4,
          select: { id: true, title: true, slug: true, excerpt: true, content: true },
        }),
        db.product.findMany({
          where: { categoryId: { in: categoryIds }, status: "ACTIVE", isFeatured: true },
          orderBy: [{ soldCount: "desc" }, { updatedAt: "desc" }],
          take: 4,
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
            brand: { select: { id: true, name: true, slug: true } },
            images: {
              select: { url: true, isPrimary: true, sortOrder: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
          },
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
      relatedCategories = relatedCategoryRows;
      relatedArticles = relatedArticleRows;
      relatedProducts = relatedProductRows.map((row) => ({
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
      reviewMetricsMap = await getProductReviewMetricsMap(db, [...products, ...relatedProducts].map((product) => product.id));
    }
    }

    if (!category) {
      notFound();
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);


    const categoryDescription = category.description?.trim() ?? "";
    const seoIntro =
      categoryDescription ||
      `Khám phá danh mục ${category.name} tại Zendo.vn với các lựa chọn được cập nhật thường xuyên, giá tốt và hỗ trợ mua hàng thuận tiện.`;
    const seoContent = categoryDescription
      ? `${categoryDescription} Zendo.vn liên tục cập nhật sản phẩm trong danh mục ${category.name}, giúp bạn dễ dàng so sánh lựa chọn phù hợp theo nhu cầu mua sắm.`
      : `Danh mục ${category.name} tổng hợp các sản phẩm đang kinh doanh tại Zendo.vn. Bạn có thể dùng bộ lọc thương hiệu, khoảng giá, tình trạng còn hàng và sắp xếp theo sản phẩm mới hoặc bán chạy để tìm lựa chọn phù hợp.`;
    const faqItems = [
      {
        question: `Danh mục ${category.name} có những sản phẩm nào?`,
        answer: products.length
          ? `Danh mục ${category.name} hiện có ${totalItems} sản phẩm đang hoạt động trên Zendo.vn, bao gồm ${products
              .slice(0, 3)
              .map((product) => product.name)
              .join(", ")}.`
          : `Danh mục ${category.name} hiển thị các sản phẩm đang hoạt động trên Zendo.vn và được cập nhật theo dữ liệu hiện có.`,
      },
      {
        question: `Làm sao để chọn sản phẩm phù hợp trong ${category.name}?`,
        answer: brandOptions.length
          ? `Bạn có thể dùng bộ lọc giá, tình trạng còn hàng, sắp xếp sản phẩm và lọc theo thương hiệu hiện có như ${brandOptions
              .slice(0, 4)
              .map((brand) => brand.name)
              .join(", ")}.`
          : "Bạn có thể dùng bộ lọc giá, tình trạng còn hàng và sắp xếp theo sản phẩm mới hoặc bán chạy.",
      },
      ...(relatedCategories.length
        ? [
            {
              question: `Có danh mục nào liên quan đến ${category.name}?`,
              answer: `Một số danh mục liên quan đang được công khai gồm ${relatedCategories
                .slice(0, 4)
                .map((item) => item.name)
                .join(", ")}.`,
            },
          ]
        : []),
      ...(relatedArticles.length
        ? [
            {
              question: `Có bài viết nào hỗ trợ chọn mua ${category.name}?`,
              answer: `Bạn có thể tham khảo các bài viết đang được công khai như ${relatedArticles
                .slice(0, 3)
                .map((item) => item.title)
                .join(", ")}.`,
            },
          ]
        : []),
    ];

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
    const categoryItemListJsonLd = buildItemListJsonLd({
      name: `${category.name} - Zendo.vn`,
      path: `/danh-muc/${category.slug}`,
      items: products.map((product) => {
        const image = resolveMediaUrl(primaryImage(product.images));
        return {
          name: product.name,
          path: `/san-pham/${product.slug}`,
          image: image || undefined,
          price: Number(product.salePrice ?? product.basePrice),
          currency: websiteSettings.currency || "VND",
        };
      }),
    });
    const faqJsonLd = buildFaqPageJsonLd(faqItems);
    const productGridProps = {
      buyNowLabel: themeSettings.productDetailPrimaryButtonText?.trim() || "Mua ngay",
      addToCartLabel: "",
      buttonMode: themeSettings.productCardButtonMode,
      primaryColor: themeSettings.primaryColor || "#2563EB",
      secondaryColor: themeSettings.secondaryColor || "#0F172A",
      desktopColumns: Math.min(5, websiteSettings.productGridColumnsDesktop),
    } as const;

    return (
    <div className={`${MARKETING_FRAME} py-6`}>
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Danh mục", href: "/cua-hang" },
          { label: category.name },
        ]}
      />

      <section className="mb-6 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Danh mục sản phẩm</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{category.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">{seoIntro}</p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[243px_1fr]">
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

        <section
          aria-label="Danh sách sản phẩm"
          className="rounded-[18px] border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
        >
          {products.length ? (
            <>
              <ProductGrid
                products={products.map((product) => toCardProduct(product, reviewMetricsMap.get(product.id)))}
                {...productGridProps}
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

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-zinc-900">Kinh nghiệm chọn mua {category.name}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">{seoContent}</p>
          <dl className="mt-5 space-y-4">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-xl bg-zinc-50 p-4">
                <dt className="text-sm font-semibold text-zinc-900">{item.question}</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
          {relatedProducts.length ? (
            <div className="mt-5 rounded-xl border border-zinc-100 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Sản phẩm liên quan trong FAQ</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedProducts.map((product) => (
                  <Link key={product.id} href={`/san-pham/${product.slug}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
                    {product.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <aside className="space-y-6">
          {relatedCategories.length ? (
            <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-zinc-900">Danh mục liên quan</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedCategories.map((item) => (
                  <Link key={item.id} href={`/danh-muc/${item.slug}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
                    {item.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {relatedArticles.length ? (
            <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-zinc-900">Bài viết liên quan</h2>
              <div className="mt-3 space-y-3">
                {relatedArticles.map((item) => (
                  <article key={item.id}>
                    <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
                      <Link href={`/bai-viet/${item.slug}`} className="transition hover:text-zinc-700">{item.title}</Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{item.excerpt ?? item.content.slice(0, 120)}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>

      {relatedProducts.length ? (
        <section className="mt-8 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold text-zinc-900">Sản phẩm nổi bật trong {category.name}</h2>
          <div className="mt-4">
            <ProductGrid products={relatedProducts.map((product) => toCardProduct(product, reviewMetricsMap.get(product.id)))} {...productGridProps} />
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryItemListJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
    </div>
    );
  } catch (error) {
    throw error;
  }
}
