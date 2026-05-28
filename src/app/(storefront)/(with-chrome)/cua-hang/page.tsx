import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import ProductGrid from "../../../../components/storefront/product-grid";
import SectionHeading from "../../../../components/storefront/section-heading";
import type { ProductCardData } from "../../../../components/storefront/product-card";
import { resolveMediaUrl } from "../../../../lib/media";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../../lib/seo";
import { getThemeSettings, getWebsiteSettings } from "../../../../lib/settings";
import { MARKETING_FRAME } from "../../../../lib/storefront-frame";

type StoreProductModel = {
  id: string;
  name: string;
  slug: string;
  basePrice: unknown;
  salePrice: unknown;
  soldCount: number;
  isFeatured: boolean;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
};

export const dynamic = "force-dynamic";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
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
  const salePriceValue =
    product.salePrice == null ? null : Number(product.salePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImage(product.images),
    basePrice: Number(product.basePrice),
    salePrice: Number.isFinite(salePriceValue as number) ? salePriceValue : null,
    soldCount: product.soldCount ?? 0,
    isFeatured: product.isFeatured,
    isNew: false,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return buildDynamicMetadata({
    title: "Cửa hàng | Zendo.vn",
    description: "Khám phá tất cả sản phẩm đang bán tại Zendo.vn.",
    path: "/cua-hang",
  });
}

export default async function CuaHangPage(): Promise<JSX.Element> {
  const [websiteSettings, themeSettings, db] = await Promise.all([
    getWebsiteSettings(),
    getThemeSettings(),
    getDbClient(),
  ]);
  const rows = db
    ? await db.product.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ updatedAt: "desc" }],
        take: 120,
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          soldCount: true,
          isFeatured: true,
          images: {
            select: { url: true, isPrimary: true, sortOrder: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
        },
      })
    : [];

  const products: ProductCardData[] = rows.map((row) => toCardProduct(row as StoreProductModel));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Cửa hàng", path: "/cua-hang" },
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
          { label: "Cửa hàng" },
        ]}
      />

      <section className={productSectionClass}>
        <SectionHeading title="Cửa hàng" description={`${products.length} sản phẩm đang mở bán`} />
        <ProductGrid products={products} {...productGridProps} />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}

