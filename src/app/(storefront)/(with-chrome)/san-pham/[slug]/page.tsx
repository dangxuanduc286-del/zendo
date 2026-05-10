import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../../components/storefront/empty-state";
import ProductGallery, {
  type ProductGalleryImage,
} from "../../../../../components/storefront/product-gallery";
import AddToCartButton from "../../../../../components/storefront/add-to-cart-button";
import AffiliateProductRefActions from "../../../../../components/storefront/affiliate-product-ref-actions";
import BuyNowButton from "../../../../../components/storefront/buy-now-button";
import ProductGrid from "../../../../../components/storefront/product-grid";
import SectionHeading from "../../../../../components/storefront/section-heading";
import AnalyticsProductViewTracker from "../../../../../components/storefront/analytics-product-view-tracker";
import type { ProductCardData } from "../../../../../components/storefront/product-card";
import ProductReviewsPanel from "../../../../../components/storefront/product-reviews-panel";
import { formatVnd } from "../../../../../lib/currency";
import { resolveMediaUrl } from "../../../../../lib/media";
import {
  buildBreadcrumbJsonLd,
  buildDynamicMetadata,
  buildProductJsonLd,
} from "../../../../../lib/seo";
import { effectiveAffiliateBlockMessage, isCustomerBuyer } from "../../../../../lib/account-role";
import { authOptions } from "../../../../../lib/auth";
import { resolveCustomerAffiliateProfile } from "../../../../../lib/affiliate-customer-status";
import { getWebsiteSettings } from "../../../../../lib/settings";
import { getStorefrontSettings } from "../../../../../lib/storefront-settings";

type ParamsInput = Promise<{ slug: string }>;
export const dynamic = "force-dynamic";

type ProductModel = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  specifications: Record<string, unknown> | null;
  basePrice: number;
  salePrice: number | null;
  stockQuantity: number;
  soldCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string } | null;
  images: ProductGalleryImage[];
  reviews: Array<{
    id: string;
    guestName: string | null;
    title: string | null;
    content: string | null;
    rating: number;
    reviewImages: unknown;
    isVerifiedPurchase: boolean;
    createdAt: Date;
  }>;
};

function toSafeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getPolicyText(specifications: Record<string, unknown> | null, keys: string[]): string | null {
  if (!specifications) return null;
  for (const key of keys) {
    const value = specifications[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getNumericSpec(specifications: Record<string, unknown> | null, keys: string[]): number {
  if (!specifications) return 0;
  for (const key of keys) {
    const value = specifications[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function priceForDisplay(product: ProductModel): number {
  return product.salePrice != null && product.salePrice > 0 && product.salePrice < product.basePrice
    ? product.salePrice
    : product.basePrice;
}

function getDiscountPercent(product: ProductModel, hasSale: boolean): number {
  if (!hasSale) return 0;
  const fromSpec = Math.round(
    getNumericSpec(product.specifications, ["discountPercent", "discount_percent", "salePercent", "sale_percent"]),
  );
  if (fromSpec > 0) return fromSpec;
  if (!product.salePrice || product.basePrice <= 0 || product.salePrice >= product.basePrice) return 0;
  const computed = Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100);
  return computed > 0 ? computed : 0;
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

export async function generateMetadata({
  params,
}: {
  params: ParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const db = await getDbClient();

  let product: Pick<ProductModel, "name" | "slug" | "seoTitle" | "seoDescription" | "shortDescription" | "images"> | null =
    null;

  if (db) {
    const data = await db.product.findUnique({
      where: { slug: resolvedParams.slug },
      select: {
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        shortDescription: true,
        images: {
          select: { id: true, url: true, altText: true, sortOrder: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    });

    if (data) {
      product = {
        ...data,
        images: data.images.map((image) => ({
          id: image.id,
          url: image.url,
          altText: image.altText ?? data.name,
        })),
      };
    }
  }

  if (!product) {
    return {
      title: "Sản phẩm khong ton tai | Zendo.vn",
      robots: { index: false, follow: false },
    };
  }

  const ogImage = resolveMediaUrl(product.images[0]?.url ?? "");

  return buildDynamicMetadata({
    title: product.seoTitle ?? `${product.name} | Zendo.vn`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      `Mua ${product.name} chinh hang voi gia tot tai Zendo.vn`,
    path: `/san-pham/${product.slug}`,
    image: ogImage,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const resolvedParams = await Promise.resolve(params);
  const db = await getDbClient();

  let product: ProductModel | null = null;
  let relatedProducts: ProductCardData[] = [];

  if (db) {
    const data = await db.product.findUnique({
      where: { slug: resolvedParams.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        specifications: true,
        basePrice: true,
        salePrice: true,
        stockQuantity: true,
        soldCount: true,
        seoTitle: true,
        seoDescription: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 8,
        },
        reviews: {
          where: { status: "APPROVED" },
          select: {
            id: true,
            guestName: true,
            title: true,
            content: true,
            rating: true,
            reviewImages: true,
            isVerifiedPurchase: true,
            createdAt: true,
            approvedAt: true,
          },
          orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
          take: 30,
        },
      },
    });

    if (data) {
      product = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        shortDescription: data.shortDescription,
        description: data.description,
        specifications: toSafeObject(data.specifications),
        basePrice: Number(data.basePrice),
        salePrice: data.salePrice == null ? null : Number(data.salePrice),
        stockQuantity: data.stockQuantity,
        soldCount: data.soldCount ?? 0,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        category: data.category,
        brand: data.brand,
        images: data.images.map((image) => ({
          id: image.id,
          url: resolveMediaUrl(image.url),
          altText: image.altText ?? data.name,
        })),
        reviews: data.reviews,
      };

      const relatedRows = await db.product.findMany({
        where: {
          categoryId: data.category.id,
          status: "ACTIVE",
          id: { not: data.id },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          soldCount: true,
          isFeatured: true,
          isNew: true,
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
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: 8,
      });

      relatedProducts = relatedRows.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        imageUrl: resolveMediaUrl(item.images[0]?.url ?? ""),
        basePrice: Number(item.basePrice),
        salePrice: item.salePrice == null ? null : Number(item.salePrice),
        soldCount: item.soldCount ?? 0,
        isFeatured: item.isFeatured,
        isNew: item.isNew,
      }));
    }
  }

  if (!product) {
    notFound();
  }

  const websiteAff = await getWebsiteSettings();
  const session = await getServerSession(authOptions);
  const sessionRole =
    session?.user && typeof session.user === "object" && "role" in session.user
      ? String((session.user as { role?: string }).role ?? "")
      : "";

  let loggedUserIdCandidate: string | null = null;
  let affiliateActive = false;
  let ctvRefCode: string | null = null;

  if (db && session?.user?.id && sessionRole === "USER") {
    const row = await db.customer.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    loggedUserIdCandidate = row?.id ?? null;
    const profile = await resolveCustomerAffiliateProfile(loggedUserIdCandidate);
    affiliateActive = profile.active;
    ctvRefCode = websiteAff.affiliateEnabled ? profile.refCode : null;
  }

  const cas = websiteAff.customerAccountSettings;
  const canPurchaseOnPdp = isCustomerBuyer({ role: sessionRole || "USER", affiliateActive }, cas);
  const ctvBlockedMessage = effectiveAffiliateBlockMessage(cas.affiliateBlockCheckoutMessage);

  const hasSale =
    product.salePrice != null &&
    product.salePrice > 0 &&
    product.salePrice < product.basePrice;
  const displayPrice = hasSale ? product.salePrice ?? product.basePrice : product.basePrice;
  const discountPercent = getDiscountPercent(product, hasSale);
  const stockLabel = product.stockQuantity > 0 ? "Còn hàng" : "Tạm hết hàng";
  const stockColor = product.stockQuantity > 0 ? "text-emerald-700" : "text-rose-700";
  const warrantyPolicy = getPolicyText(product.specifications, ["warrantyPolicy", "warranty"]);
  const returnPolicy = getPolicyText(product.specifications, [
    "returnPolicy",
    "return_policy",
    "returnPolicyText",
  ]);

  const productSchema = buildProductJsonLd({
    name: product.name,
    description: product.shortDescription ?? product.description ?? "",
    sku: product.sku,
    images: product.images.map((image) => resolveMediaUrl(image.url)),
    brand: product.brand?.name,
    price: priceForDisplay(product),
    inStock: product.stockQuantity > 0,
    path: `/san-pham/${product.slug}`,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Danh mục", path: `/danh-muc/${product.category.slug}` },
    { name: product.name, path: `/san-pham/${product.slug}` },
  ]);
  const storefrontSettings = await getStorefrontSettings();
  const detailSettings = storefrontSettings.website.productDetailSettings;
  const themeSettings = storefrontSettings.theme;
  const soldCount = Math.max(0, Number(product.soldCount ?? 0));
  const reviewCount = product.reviews.length;
  const reviewAverage = reviewCount
    ? Math.round((product.reviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const policyItems = [
    detailSettings.policyOfficialLabel,
    detailSettings.policyReturnLabel,
    detailSettings.policyShippingLabel,
    detailSettings.policyWarrantyLabel,
  ];
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8"
      style={{ backgroundColor: themeSettings.pageBackground }}
    >
      <AnalyticsProductViewTracker pathname={`/san-pham/${product.slug}`} productId={product.id} />
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Danh mục", href: `/danh-muc/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <article className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
        <ProductGallery images={product.images} productName={product.name} />

        <section
          className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
          style={{ borderColor: themeSettings.cardBorderColor }}
        >
          <header className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              <span>SKU: {product.sku}</span>
              <span aria-hidden>•</span>
              <span className={stockColor}>{stockLabel}</span>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1" style={{ color: themeSettings.ratingColor }}>
                ★ {reviewAverage.toFixed(1)}{" "}
                <span className="text-zinc-600">
                  ({reviewCount} {detailSettings.ratingLabel})
                </span>
              </span>
              <span aria-hidden>•</span>
              <span className="text-zinc-700">{detailSettings.soldLabel} {soldCount}</span>
            </div>
          </header>

          <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4" style={{ borderColor: themeSettings.cardBorderColor }}>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
              <span className="text-xl font-bold leading-none text-[#2563EB] sm:text-xl lg:text-2xl">
                {formatVnd(displayPrice)}
              </span>
              {hasSale ? (
                <span className="text-sm text-zinc-500 line-through">{formatVnd(product.basePrice)}</span>
              ) : null}
              {detailSettings.showDiscountBadge && discountPercent > 0 ? (
                <span className="inline-flex items-center rounded-md bg-[#FFF1E6] px-2 py-1 text-xs font-semibold text-[#F97316]">
                  -{discountPercent}%
                </span>
              ) : null}
            </div>
            {detailSettings.showBestPriceNote ? (
              <p className="mt-3 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-emerald-700">
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path
                    d="M10 2.5l5.5 2v5.2c0 3.4-2.3 6.4-5.5 7.3-3.2-.9-5.5-3.9-5.5-7.3V4.5l5.5-2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path d="M7.4 10.2l1.7 1.7 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {detailSettings.bestPriceLabel}
              </p>
            ) : null}
          </div>

          {product.shortDescription ? (
            <div className="whitespace-pre-line break-words text-sm leading-6 text-zinc-700 sm:text-base">
              {product.shortDescription}
            </div>
          ) : null}

          {websiteAff.affiliateEnabled && ctvRefCode ? (
            <div className="mt-1 min-w-0 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
              <p className="text-xs font-semibold text-sky-950">Đối tác CTV — link giới thiệu sản phẩm này</p>
              <div className="mt-2 min-w-0">
                <AffiliateProductRefActions
                  slug={product.slug}
                  refCode={ctvRefCode}
                  layout="stack"
                  copyButtonLabel="Sao chép link affiliate"
                  openButtonLabel="Mở link"
                />
              </div>
            </div>
          ) : null}

          {canPurchaseOnPdp ? (
            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
              <BuyNowButton
                item={{
                  id: product.id,
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  imageUrl: resolveMediaUrl(product.images[0]?.url ?? ""),
                  sku: product.sku,
                  basePrice: product.basePrice,
                  salePrice: product.salePrice,
                  stockQuantity: product.stockQuantity,
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition"
                label={detailSettings.buyNowLabel}
                style={{
                  backgroundColor: themeSettings.ctaColor,
                }}
              />
              <AddToCartButton
                item={{
                  id: product.id,
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  imageUrl: resolveMediaUrl(product.images[0]?.url ?? ""),
                  sku: product.sku,
                  basePrice: product.basePrice,
                  salePrice: product.salePrice,
                  stockQuantity: product.stockQuantity,
                }}
                label={detailSettings.addToCartLabel}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border bg-white px-5 text-sm font-semibold transition"
                style={{
                  borderColor: themeSettings.primaryColor,
                  color: themeSettings.primaryColor,
                }}
              />
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              {ctvBlockedMessage}
            </div>
          )}

          {detailSettings.showPolicyRow ? (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {policyItems.map((label, index) => (
                <span
                  key={label}
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 text-[12px] font-medium leading-tight text-zinc-700 lg:whitespace-nowrap"
                  style={{ borderColor: themeSettings.cardBorderColor }}
                >
                  {index === 0 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden style={{ color: themeSettings.primaryColor }}>
                      <path d="M10 2.5l5.5 2v5.1c0 3.4-2.3 6.4-5.5 7.3-3.2-.9-5.5-3.9-5.5-7.3V4.5l5.5-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7.4 10.2l1.7 1.7 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {index === 1 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden style={{ color: themeSettings.primaryColor }}>
                      <path d="M15.3 7.2A6.2 6.2 0 1 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15.3 3.8v3.6h-3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {index === 2 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden style={{ color: themeSettings.primaryColor }}>
                      <path d="M2.5 11.5h10.8l1.8 2.2h2.4V9.5l-2-2h-3.6l-1.6-2H6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6.5" cy="14.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="14.5" cy="14.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : null}
                  {index === 3 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden style={{ color: themeSettings.primaryColor }}>
                      <path d="M10 2.8l1.9 3.9 4.3.6-3.1 3 0.7 4.3-3.8-2-3.8 2 0.7-4.3-3.1-3 4.3-.6L10 2.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  <span className="text-center">{label}</span>
                </span>
              ))}
            </div>
          ) : null}

          {product.brand ? (
            <div className="rounded-xl border bg-zinc-50 p-4 text-sm text-zinc-700" style={{ borderColor: themeSettings.cardBorderColor }}>
              <p>
                Thương hiệu:{" "}
                <Link href={`/thuong-hieu/${product.brand.slug}`} className="font-semibold text-zinc-900">
                  {product.brand.name}
                </Link>
              </p>
            </div>
          ) : null}
        </section>
      </article>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:gap-6">
        <article className="space-y-6">
          <section className="rounded-xl border bg-white p-5" style={{ borderColor: themeSettings.cardBorderColor }}>
            <h2 className="text-lg font-semibold text-zinc-900">{detailSettings.descriptionTitle}</h2>
            <details open className="mt-3">
              <summary className="cursor-pointer text-sm font-medium" style={{ color: themeSettings.primaryColor }}>
                {detailSettings.readMoreLabel}
              </summary>
              <div className="prose prose-zinc mt-2 max-w-none whitespace-pre-line break-words text-sm leading-7 text-zinc-700">
                {product.description ?? product.shortDescription ?? "Thông tin đang cập nhật."}
              </div>
            </details>
          </section>
        </article>

        <aside className="space-y-4">
          {warrantyPolicy ? (
            <section className="rounded-xl border bg-white p-5" style={{ borderColor: themeSettings.cardBorderColor }}>
              <h2 className="text-base font-semibold text-zinc-900">Chinh sach bao hanh</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{warrantyPolicy}</p>
            </section>
          ) : null}

          {returnPolicy ? (
            <section className="rounded-xl border bg-white p-5" style={{ borderColor: themeSettings.cardBorderColor }}>
              <h2 className="text-base font-semibold text-zinc-900">Chinh sach doi tra</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{returnPolicy}</p>
            </section>
          ) : null}
        </aside>
      </section>

      {detailSettings.showReviewSection ? (
        <ProductReviewsPanel
          reviews={product.reviews.map((item) => ({
            id: item.id,
            guestName: item.guestName ?? "",
            title: item.title ?? "",
            content: item.content ?? "",
            rating: item.rating,
            reviewImages: Array.isArray(item.reviewImages)
              ? item.reviewImages
                  .map((value) => resolveMediaUrl(String(value ?? "")))
                  .filter(Boolean)
                  .slice(0, 5)
              : [],
            isVerifiedPurchase: item.isVerifiedPurchase,
            createdAt: item.createdAt.toISOString(),
          }))}
          productName={product.name}
          reviewTitle={detailSettings.reviewTitle}
          reviewEmptyText={detailSettings.reviewEmptyText}
          verifiedPurchaseLabel={detailSettings.verifiedPurchaseLabel}
          ratingLabel={detailSettings.ratingLabel}
          ratingColor={themeSettings.ratingColor}
          primaryColor={themeSettings.primaryColor}
          cardBorderColor={themeSettings.cardBorderColor}
        />
      ) : null}

      {detailSettings.showRelatedProducts ? (
        <section className="mt-10">
          <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5" style={{ borderColor: themeSettings.cardBorderColor }}>
            <SectionHeading title="Sản phẩm lien quan" />
            {relatedProducts.length ? (
              <ProductGrid products={relatedProducts} desktopColumns={storefrontSettings.website.productGridColumnsDesktop} />
            ) : (
              <EmptyState
                title="Chưa có sản phẩm liên quan"
                description="Hệ thống đang cập nhật để gợi ý phù hợp hơn cho bạn."
              />
            )}
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
