import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import ProductGrid from "../../../../components/storefront/product-grid";
import SectionHeading from "../../../../components/storefront/section-heading";
import type { ProductCardData } from "../../../../components/storefront/product-card";
import { resolveMediaUrl } from "../../../../lib/media";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../../lib/seo";
import { getWebsiteSettings } from "../../../../lib/settings";

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
  const [websiteSettings, db] = await Promise.all([getWebsiteSettings(), getDbClient()]);
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
            take: 3,
          },
        },
      })
    : [];

  const products: ProductCardData[] = rows.map((row) => toCardProduct(row as StoreProductModel));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Cửa hàng", path: "/cua-hang" },
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Cửa hàng" },
        ]}
      />

      <section>
        <SectionHeading title="Cửa hàng" description={`${products.length} sản phẩm đang mở bán`} />
        <ProductGrid products={products} desktopColumns={websiteSettings.productGridColumnsDesktop} />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}

