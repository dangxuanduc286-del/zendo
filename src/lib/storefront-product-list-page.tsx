import Breadcrumbs from "../components/storefront/breadcrumbs";
import ProductGrid from "../components/storefront/product-grid";
import SectionHeading from "../components/storefront/section-heading";
import type { ProductCardData } from "../components/storefront/product-card";
import { resolveMediaUrl } from "./media";
import { buildBreadcrumbJsonLd } from "./seo";
import { getThemeSettings, getWebsiteSettings } from "./settings";
import { MARKETING_FRAME } from "./storefront-frame";

type StoreProductModel = {
  id: string;
  name: string;
  slug: string;
  basePrice: unknown;
  salePrice: unknown;
  soldCount: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
};

type ProductWhereInput = {
  status: "ACTIVE";
  isNew?: boolean;
  isBestSeller?: boolean;
  salePrice?: { not: null };
};

type ProductOrderByInput = Array<Record<string, "asc" | "desc">>;

export type StorefrontProductListConfig = {
  title: string;
  description: string;
  path: string;
  emptyDescription?: string;
  where: ProductWhereInput;
  orderBy: ProductOrderByInput;
  flashSaleOnly?: boolean;
};

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function primaryImage(images: StoreProductModel["images"]): string {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((image) => image.isPrimary) ?? sorted[0];
  return resolveMediaUrl(primary?.url ?? "");
}

function toCardProduct(product: StoreProductModel): ProductCardData {
  const salePriceValue = product.salePrice == null ? null : Number(product.salePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(product.images),
    basePrice: Number(product.basePrice),
    salePrice: Number.isFinite(salePriceValue as number) ? salePriceValue : null,
    soldCount: product.soldCount ?? 0,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    isFlashSale: product.salePrice != null && Number(product.salePrice) > 0 && Number(product.salePrice) < Number(product.basePrice),
  };
}

function isFlashSaleProduct(product: StoreProductModel): boolean {
  const salePrice = product.salePrice == null ? null : Number(product.salePrice);
  const basePrice = Number(product.basePrice);
  return salePrice != null && Number.isFinite(salePrice) && Number.isFinite(basePrice) && salePrice > 0 && salePrice < basePrice;
}

export async function renderStorefrontProductListPage(config: StorefrontProductListConfig): Promise<JSX.Element> {
  const [websiteSettings, themeSettings, db] = await Promise.all([
    getWebsiteSettings(),
    getThemeSettings(),
    getDbClient(),
  ]);

  const rows = db
    ? await db.product.findMany({
        where: config.where,
        orderBy: config.orderBy,
        take: 120,
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          soldCount: true,
          isFeatured: true,
          isNew: true,
          isBestSeller: true,
          images: {
            select: { url: true, isPrimary: true, sortOrder: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
        },
      })
    : [];

  const filteredRows = config.flashSaleOnly ? rows.filter((row) => isFlashSaleProduct(row as StoreProductModel)) : rows;
  const products: ProductCardData[] = filteredRows.map((row) => toCardProduct(row as StoreProductModel));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: config.title, path: config.path },
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
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: config.title },
        ]}
      />

      <section className={productSectionClass}>
        <SectionHeading
          title={config.title}
          description={products.length > 0 ? config.description : (config.emptyDescription ?? config.description)}
        />
        <ProductGrid products={products} {...productGridProps} />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
