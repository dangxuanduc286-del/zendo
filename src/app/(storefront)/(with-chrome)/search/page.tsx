import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import ProductGrid from "../../../../components/storefront/product-grid";
import SectionHeading from "../../../../components/storefront/section-heading";
import type { ProductCardData } from "../../../../components/storefront/product-card";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../../lib/seo";
import { getThemeSettings, getWebsiteSettings } from "../../../../lib/settings";
import { MARKETING_FRAME } from "../../../../lib/storefront-frame";
import { getProductReviewMetricsMap, type ProductReviewMetrics } from "../../../../lib/storefront/product-review-metrics";
import { resolveMediaUrl } from "../../../../lib/media";

export const dynamic = "force-dynamic";

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

type SearchProductRow = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: unknown;
  salePrice: unknown;
  stockQuantity: number;
  soldCount: number;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function primaryImage(images: SearchProductRow["images"]): string {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((image) => image.isPrimary) ?? sorted[0];
  return resolveMediaUrl(primary?.url ?? "");
}

function toCardProduct(product: SearchProductRow, metrics?: ProductReviewMetrics): ProductCardData {
  const salePriceValue = product.salePrice == null ? null : Number(product.salePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(product.images),
    basePrice: Number(product.basePrice),
    salePrice: Number.isFinite(salePriceValue as number) ? salePriceValue : null,
    soldCount: product.soldCount ?? 0,
    stockQuantity: product.stockQuantity,
    ratingAverage: metrics?.ratingAverage ?? null,
    reviewCount: metrics?.reviewCount ?? 0,
    isFeatured: false,
    isNew: false,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParamsInput }): Promise<Metadata> {
  const resolved = await Promise.resolve(searchParams);
  const keyword = firstValue(resolved.q).trim();
  const title = keyword ? `Kết quả tìm kiếm cho “${keyword}” | Zendo.vn` : "Tìm kiếm sản phẩm | Zendo.vn";
  const description = keyword
    ? `Tìm kiếm sản phẩm phù hợp với từ khóa “${keyword}” trên Zendo.vn.`
    : "Tìm kiếm sản phẩm trên Zendo.vn.";

  return buildDynamicMetadata({
    title,
    description,
    path: "/search",
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParamsInput }): Promise<JSX.Element> {
  const resolved = await searchParams;
  const keyword = firstValue(resolved.q).trim();
  const normalizedKeyword = normalizeSearchText(keyword);
  const [websiteSettings, themeSettings, db] = await Promise.all([
    getWebsiteSettings(),
    getThemeSettings(),
    getDbClient(),
  ]);

  let products: ProductCardData[] = [];
  if (db && normalizedKeyword) {
    const rows = (await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        basePrice: true,
        salePrice: true,
        stockQuantity: true,
        soldCount: true,
        images: {
          select: { url: true, isPrimary: true, sortOrder: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    })) as SearchProductRow[];

    const scored = rows
      .map((row) => {
        const haystack = normalizeSearchText([row.name, row.slug, row.shortDescription ?? ""].join(" "));
        const score = haystack.includes(normalizedKeyword)
          ? 3
          : normalizeSearchText(row.name).includes(normalizedKeyword)
            ? 4
            : normalizeSearchText(row.slug).includes(normalizedKeyword)
              ? 2
              : normalizeSearchText(row.shortDescription ?? "").includes(normalizedKeyword)
                ? 1
                : 0;
        return { row, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 48);

    const metricsMap = await getProductReviewMetricsMap(db, scored.map((item) => item.row.id));
    products = scored.map(({ row }) => toCardProduct(row, metricsMap.get(row.id)));
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Tìm kiếm", path: "/search" },
  ]);

  const productSectionClass = "rounded-[18px] border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-5 lg:p-7";
  const productGridProps = {
    buyNowLabel: themeSettings.productDetailPrimaryButtonText?.trim() || "Mua ngay",
    addToCartLabel: "",
    buttonMode: themeSettings.productCardButtonMode,
    primaryColor: themeSettings.primaryColor || "#2563EB",
    secondaryColor: themeSettings.secondaryColor || "#0F172A",
    desktopColumns: websiteSettings.productGridColumnsDesktop,
  } as const;

  return (
    <div className={`${MARKETING_FRAME} py-6`}>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Tìm kiếm" }]} />

      <section className={productSectionClass}>
        <SectionHeading
          title={keyword ? `Kết quả tìm kiếm cho: “${keyword}”` : "Tìm kiếm sản phẩm"}
          description={
            keyword
              ? products.length
                ? `Tìm thấy ${products.length} sản phẩm phù hợp.`
                : "Không tìm thấy sản phẩm phù hợp."
              : "Nhập từ khóa để tìm sản phẩm, danh mục hoặc thương hiệu."
          }
        />
        {keyword ? <ProductGrid products={products} {...productGridProps} /> : null}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </div>
  );
}
