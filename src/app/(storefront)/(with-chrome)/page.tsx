import Link from "next/link";
import type { Metadata } from "next";
import { resolveMediaUrl, sanitizePostThumbnailUrl } from "../../../lib/media";
import HomeHeroMarketplace from "../../../components/storefront/home-hero-marketplace";
import ProductGrid from "../../../components/storefront/product-grid";
import SectionHeading from "../../../components/storefront/section-heading";
import SiteFooter from "../../../components/storefront/site-footer";
import MediaImage from "../../../components/shared/media-image";
import type { ProductCardData } from "../../../components/storefront/product-card";
import { getThemeSettings, getWebsiteSettings } from "../../../lib/settings";
import { buildBreadcrumbJsonLd, buildDynamicMetadata } from "../../../lib/seo";
import { STOREFRONT_FRAME } from "../../../lib/storefront-frame";
import {
  loadStorefrontHomeData,
  type HomeProductMetrics,
  type HomeProductRow,
} from "../../../lib/storefront/storefront-home-data";

export const revalidate = 120;

const HOME_SEO_FALLBACK_TITLE = "Zendo.vn - Mua sắm điện tử, gia dụng, phụ kiện chính hãng";
const HOME_SEO_FALLBACK_DESCRIPTION =
  "Zendo.vn cung cấp sản phẩm điện tử, đồ gia dụng, phụ kiện, hàng thiết yếu chính hãng, giá tốt, giao nhanh toàn quốc, hỗ trợ COD.";

export async function generateMetadata(): Promise<Metadata> {
  const website = await getWebsiteSettings();
  const title = website.defaultSeoTitle.trim() || HOME_SEO_FALLBACK_TITLE;
  const description = website.defaultSeoDescription.trim() || HOME_SEO_FALLBACK_DESCRIPTION;
  return buildDynamicMetadata({
    title,
    description,
    path: "/",
    image: "",
  });
}

function HomeHeroVisualFallback(): JSX.Element {
  return (
    <div className="absolute inset-0 flex items-stretch justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-white to-amber-50">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(37,99,235,0.14), transparent 42%), radial-gradient(circle at 82% 18%, rgba(245,158,11,0.16), transparent 38%)",
        }}
      />
      <div className="relative z-[1] flex w-full max-w-5xl items-end justify-center gap-2.5 px-3 pb-5 pt-10 sm:gap-4 sm:px-6 sm:pb-8 sm:pt-12">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-[30%] max-w-[220px] flex-none rounded-2xl border border-white/90 bg-white/95 p-2.5 shadow-md shadow-slate-900/8 sm:rounded-3xl sm:p-3.5 sm:shadow-lg sm:shadow-slate-900/10 sm:backdrop-blur-sm"
          >
            <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/90" />
            <div className="mt-2.5 space-y-1.5 px-0.5">
              <div className="h-2 w-full max-w-[85%] rounded-full bg-slate-200/90" />
              <div className="h-2 w-full max-w-[55%] rounded-full bg-slate-100" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
              <div className="h-2.5 w-12 rounded-full bg-amber-200/80" />
              <div className="h-2.5 w-8 rounded-full bg-blue-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toCardProduct(product: HomeProductRow, metrics?: HomeProductMetrics): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: resolveMediaUrl(product.imageUrl ?? ""),
    basePrice: Number(product.basePrice),
    salePrice: product.salePrice == null ? null : Number(product.salePrice),
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    brandName: null,
    stockQuantity: product.stockQuantity,
    soldCount: product.soldCount ?? 0,
    ratingAverage: metrics?.ratingAverage ?? null,
    reviewCount: metrics?.reviewCount ?? 0,
  };
}

export default async function StorefrontHomePage(): Promise<JSX.Element> {
  const [websiteSettings, themeSettings, homeData] = await Promise.all([
    getWebsiteSettings(),
    getThemeSettings(),
    loadStorefrontHomeData(),
  ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
  ]);

  const { categoryRows, productRows, postRows, metricsMap } = homeData;

  const categories = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: resolveMediaUrl(row.imageUrl ?? ""),
    productCount: row._count.products,
  }));

  const allSectionProducts = productRows;
  const featuredProducts = allSectionProducts.filter((product) => product.isFeatured).slice(0, 8);
  const newestProducts = allSectionProducts.filter((product) => product.isNew).slice(0, 8);
  const bestSellerProducts = allSectionProducts.filter((product) => product.isBestSeller).slice(0, 8);

  const featured: ProductCardData[] = featuredProducts.map((product) => toCardProduct(product, metricsMap.get(product.id)));
  const newest: ProductCardData[] = newestProducts.map((product) => toCardProduct(product, metricsMap.get(product.id)));
  const bestSeller: ProductCardData[] = bestSellerProducts.map((product) => toCardProduct(product, metricsMap.get(product.id)));

  const flash: ProductCardData[] = [...featured, ...newest, ...bestSeller].filter(
    (product) => Number(product.salePrice ?? 0) > 0 && Number(product.salePrice) < Number(product.basePrice),
  );
  const flashProducts = flash.map((product) => ({ ...product, isFlashSale: true }));

  const posts = postRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? row.content.slice(0, 160),
    thumbnailUrl: sanitizePostThumbnailUrl(row.thumbnailUrl ?? ""),
  }));
  const postLinks = posts.map((post) => ({ title: post.title, href: `/bai-viet/${post.slug}` }));
  const categoryLinks = categories.map((category) => ({
    label: category.name,
    href: `/danh-muc/${category.slug}`,
  }));

  const socialLinks = websiteSettings.socialLinks;

  const productSectionClass = "rounded-[18px] border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-5 lg:p-7";
  const sharedProductGridProps = {
    buyNowLabel: themeSettings.productDetailPrimaryButtonText?.trim() || "Mua ngay",
    addToCartLabel: "",
    buttonMode: themeSettings.productCardButtonMode,
    primaryColor: themeSettings.primaryColor || "#2563EB",
    secondaryColor: themeSettings.secondaryColor || "#0F172A",
    ctaColor: "#F59E0B",
    desktopColumns: websiteSettings.productGridColumnsDesktop,
  } as const;

  return (
    <div className="min-h-screen bg-[var(--z-bg)] text-[var(--z-text-main)]">
      <main className={`${STOREFRONT_FRAME} space-y-8 pb-10 pt-3 sm:space-y-10 sm:pb-12 sm:pt-5 lg:space-y-12 lg:pb-12 lg:pt-6`}>
        {themeSettings.showHeroBanner ? (
          <HomeHeroMarketplace
            themeSettings={themeSettings}
            categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl ?? null }))}
            fallback={
              <div className="relative aspect-[16/9] w-full">
                <HomeHeroVisualFallback />
              </div>
            }
          />
        ) : null}

        {themeSettings.enableFeaturedSection ? (
        <section
          aria-labelledby="featured-products-heading"
          className={productSectionClass}
        >
          <SectionHeading
            id="featured-products-heading"
            title="Sản phẩm nổi bật"
            description="Lựa chọn được yêu thích bởi nhiều khách hàng."
            actionLabel="Xem thêm →"
            actionHref="/cua-hang"
          />
          <ProductGrid products={featured} {...sharedProductGridProps} />
        </section>
        ) : null}

        {themeSettings.enableNewSection ? (
        <section
          aria-labelledby="new-products-heading"
          className={productSectionClass}
        >
          <SectionHeading
            id="new-products-heading"
            title="Sản phẩm mới"
            description="Cập nhật xu hướng và sản phẩm mới nhất từ Zendo."
            actionLabel="Xem thêm →"
            actionHref="/san-pham-moi"
          />
          <ProductGrid products={newest} {...sharedProductGridProps} />
        </section>
        ) : null}

        {themeSettings.enableBestSellerSection ? (
        <section
          aria-labelledby="best-seller-products-heading"
          className={productSectionClass}
        >
          <SectionHeading
            id="best-seller-products-heading"
            title="Bán chạy"
            description="Danh sách sản phẩm có doanh số tốt nhất."
            actionLabel="Xem thêm →"
            actionHref="/ban-chay"
          />
          <ProductGrid products={bestSeller} {...sharedProductGridProps} />
        </section>
        ) : null}

        {themeSettings.enableFlashSaleSection ? (
          <section aria-labelledby="flash-sale-products-heading" className={productSectionClass}>
            <SectionHeading
              id="flash-sale-products-heading"
              title="Flash Sale"
              description="Ưu đãi giới hạn thời gian với mức giá tốt mỗi ngày."
              actionLabel="Xem thêm →"
              actionHref="/flash-deal"
            />
            <ProductGrid products={flashProducts} {...sharedProductGridProps} />
          </section>
        ) : null}

        {themeSettings.enableBlogSection ? (
        <section
          aria-labelledby="blog-heading"
          className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7"
        >
          <SectionHeading
            id="blog-heading"
            title="Tư vấn mua sắm"
            description="Cập nhật kiến thức và kinh nghiệm mua sắm hữu ích."
            actionLabel="Xem thêm →"
            actionHref="/bai-viet"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <Link href={`/bai-viet/${post.slug}`} className="block">
                  <div className="relative aspect-[16/10] bg-zinc-100">
                    {post.thumbnailUrl ? (
                      <MediaImage
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fallbackLabel={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </Link>
                <div className="space-y-2.5 p-4 sm:p-5">
                  <h3 className="line-clamp-2 text-lg font-semibold text-zinc-900">
                    <Link href={`/bai-viet/${post.slug}`}>{post.title}</Link>
                  </h3>
                  {post.excerpt ? (
                    <p className="line-clamp-3 text-sm leading-6 text-zinc-600 sm:text-base">{post.excerpt}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

      </main>

      <SiteFooter
        websiteSettings={websiteSettings}
        socialLinks={socialLinks}
        postLinks={postLinks}
        categoryLinks={categoryLinks}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
