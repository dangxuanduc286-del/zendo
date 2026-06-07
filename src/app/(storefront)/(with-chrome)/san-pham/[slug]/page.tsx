import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";
import EmptyState from "../../../../../components/storefront/empty-state";
import ProductGallery, {
  type ProductGalleryImage,
} from "../../../../../components/storefront/product-gallery";
import ProductDetailInfoShell from "../../../../../components/storefront/product-detail-info-shell";
import AddToCartButton from "../../../../../components/storefront/add-to-cart-button";
import AffiliateProductRefActions from "../../../../../components/storefront/affiliate-product-ref-actions";
import BuyNowButton from "../../../../../components/storefront/buy-now-button";
import ProductGrid from "../../../../../components/storefront/product-grid";
import MediaImage from "../../../../../components/shared/media-image";
import ProductPromotionSection, {
  type ProductPromotionCoupon,
} from "../../../../../components/storefront/product-promotion-section";
import SectionHeading from "../../../../../components/storefront/section-heading";
import AnalyticsProductViewTracker from "../../../../../components/storefront/analytics-product-view-tracker";
import type { ProductCardData } from "../../../../../components/storefront/product-card";
import ProductReviewsPanel from "../../../../../components/storefront/product-reviews-panel";
import { formatVnd } from "../../../../../lib/currency";
import { resolveMediaUrl } from "../../../../../lib/media";
import {
  buildBreadcrumbJsonLd,
  buildDynamicMetadata,
  buildFaqPageJsonLd,
  buildProductJsonLd,
} from "../../../../../lib/seo";
import { effectiveAffiliateBlockMessage, isCustomerBuyer } from "../../../../../lib/account-role";
import { authOptions } from "../../../../../lib/auth";
import { resolveCustomerAffiliateProfile } from "../../../../../lib/affiliate-customer-status";
import { getWebsiteSettings } from "../../../../../lib/settings";
import { getStorefrontSettings } from "../../../../../lib/storefront-settings";
import { normalizeShippingClass } from "../../../../../lib/shipping";

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

type BestPriceSidebarProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  basePrice: number;
  salePrice: number | null;
  soldCount: number;
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

function priceForDisplay(product: Pick<ProductModel, "basePrice" | "salePrice">): number {
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
  let bestPriceProducts: BestPriceSidebarProduct[] = [];
  let promotionCoupons: ProductPromotionCoupon[] = [];

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

      const bestPriceRows = await db.product.findMany({
        where: {
          status: "ACTIVE",
          id: { not: data.id },
          OR: [
            { basePrice: { lt: 199000 } },
            { salePrice: { gt: 0, lt: 199000 } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          soldCount: true,
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
        orderBy: [{ soldCount: "desc" }, { updatedAt: "desc" }],
        take: 12,
      });

      bestPriceProducts = bestPriceRows
        .map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          imageUrl: resolveMediaUrl(item.images[0]?.url ?? ""),
          basePrice: Number(item.basePrice),
          salePrice: item.salePrice == null ? null : Number(item.salePrice),
          soldCount: item.soldCount ?? 0,
        }))
        .filter((item) => priceForDisplay(item) < 199000)
        .slice(0, 6);

      const now = new Date();
      const couponRows = await db.coupon.findMany({
        where: {
          status: "ACTIVE",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          value: true,
          maxDiscountAmount: true,
          minOrderAmount: true,
          usageLimit: true,
          usedCount: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 12,
      });

      promotionCoupons = couponRows
        .filter((coupon) => coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit)
        .slice(0, 4)
        .map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: Number(coupon.value),
          maxDiscountAmount: coupon.maxDiscountAmount == null ? null : Number(coupon.maxDiscountAmount),
          minOrderAmount: coupon.minOrderAmount == null ? null : Number(coupon.minOrderAmount),
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
  const shippingClass = normalizeShippingClass(product.specifications?.shippingClass);
  const discountPercent = getDiscountPercent(product, hasSale);
  const stockLabel = product.stockQuantity > 0 ? "Còn hàng" : "Tạm hết hàng";
  const warrantyPolicy = getPolicyText(product.specifications, ["warrantyPolicy", "warranty"]);
  const returnPolicy = getPolicyText(product.specifications, [
    "returnPolicy",
    "return_policy",
    "returnPolicyText",
  ]);

  const reviewCount = product.reviews.length;
  const reviewAverage = reviewCount
    ? Math.round((product.reviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const productSchemaImages = product.images
    .map((image) => resolveMediaUrl(image.url))
    .filter((image): image is string => Boolean(image));
  const productSchema = buildProductJsonLd({
    name: product.name,
    description: product.shortDescription ?? product.description ?? "",
    sku: product.sku,
    images: productSchemaImages,
    brand: product.brand?.name,
    price: priceForDisplay(product),
    currency: websiteAff.currency || "VND",
    inStock: product.stockQuantity > 0,
    path: `/san-pham/${product.slug}`,
    aggregateRating: reviewCount > 0 ? { ratingValue: reviewAverage, reviewCount } : undefined,
    reviews: product.reviews.slice(0, 5).map((review) => ({
      authorName: review.guestName || "Khách hàng Zendo",
      rating: review.rating,
      title: review.title,
      content: review.content,
      datePublished: review.createdAt,
    })),
    seller: websiteAff.siteName || "Zendo.vn",
    shippingDetails: {
      shippingRate: 0,
      currency: websiteAff.currency || "VND",
      minValue: websiteAff.shippingPromoFreeMin,
      country: "VN",
    },
    returnPolicy: {
      url: websiteAff.customerAccountSettings.returnPolicyUrl || undefined,
      name: returnPolicy ?? "Chính sách đổi trả",
      days: 7,
    },
    itemCondition: "https://schema.org/NewCondition",
    priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Danh mục", path: `/danh-muc/${product.category.slug}` },
    { name: product.name, path: `/san-pham/${product.slug}` },
  ]);
  const productFaqItems = [
    {
      question: `${product.name} còn hàng không?`,
      answer: `${product.name} hiện ${product.stockQuantity > 0 ? "còn hàng" : "tạm hết hàng"} theo dữ liệu tồn kho hiện có trên Zendo.vn.`,
    },
    {
      question: `${product.name} thuộc danh mục nào?`,
      answer: `${product.name} thuộc danh mục ${product.category.name} đang được công khai trên Zendo.vn.`,
    },
    ...(product.brand
      ? [
          {
            question: `${product.name} thuộc thương hiệu nào?`,
            answer: `${product.name} thuộc thương hiệu ${product.brand.name} theo dữ liệu sản phẩm hiện có.`,
          },
        ]
      : []),
    ...(warrantyPolicy
      ? [
          {
            question: `Chính sách bảo hành của ${product.name} là gì?`,
            answer: warrantyPolicy,
          },
        ]
      : []),
    ...(returnPolicy
      ? [
          {
            question: `Chính sách đổi trả của ${product.name} là gì?`,
            answer: returnPolicy,
          },
        ]
      : []),
  ];
  const faqJsonLd = buildFaqPageJsonLd(productFaqItems);
  const storefrontSettings = await getStorefrontSettings();
  const detailSettings = storefrontSettings.website.productDetailSettings;
  const themeSettings = storefrontSettings.theme;
  const soldCount = Math.max(0, Number(product.soldCount ?? 0));
  const policyItems = [
    detailSettings.policyOfficialLabel,
    detailSettings.policyReturnLabel,
    detailSettings.policyShippingLabel,
    detailSettings.policyWarrantyLabel,
  ];
  return (
    <div
      className="mx-auto w-full max-w-7xl px-3 py-3 md:px-6 md:py-5 lg:px-8 xl:max-w-[1400px] xl:px-6 2xl:px-8"
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

      <article className="grid grid-cols-1 gap-3 md:gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-rows-[545px_84px] xl:items-stretch xl:gap-x-8 xl:gap-y-3">
        <ProductGallery images={product.images} productName={product.name} />

        <ProductDetailInfoShell
          className="rounded-2xl border bg-white p-3 shadow-sm md:rounded-2xl md:p-4 md:shadow-sm xl:box-border xl:rounded-[24px] xl:p-4 xl:shadow-sm"
          style={{ borderColor: themeSettings.cardBorderColor }}
        >
          <div className="min-w-0 shrink-0 space-y-3 md:space-y-4 xl:space-y-3">
          <header className="min-w-0 shrink-0 space-y-2 md:space-y-2 xl:space-y-2">
            <h1 className="line-clamp-3 hyphens-auto break-words text-pretty text-[20px] font-semibold leading-[1.22] tracking-tight text-zinc-900 md:text-[19px] md:font-semibold md:leading-[1.24] md:line-clamp-3 lg:text-[29px] lg:leading-[1.22] lg:tracking-[-0.018em] xl:min-h-[99px] xl:text-[27px]">
              {product.name}
            </h1>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-zinc-600 md:text-xs md:leading-normal lg:gap-x-2.5 lg:text-[12px] lg:text-slate-600">
              <span className="whitespace-nowrap">SKU: {product.sku}</span>
              <span className="text-zinc-300" aria-hidden>|</span>
              <span
                className={
                  product.stockQuantity > 0 ? "whitespace-nowrap text-emerald-700 lg:text-emerald-600 lg:font-medium" : "whitespace-nowrap text-rose-700"
                }
              >
                {stockLabel}
              </span>
              <span className="text-zinc-300" aria-hidden>|</span>
              {reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: themeSettings.ratingColor }}>
                  ★ {reviewAverage.toFixed(1)}{" "}
                  <span className="text-zinc-600">
                    ({reviewCount} {detailSettings.ratingLabel})
                  </span>
                </span>
              ) : (
                <span className="text-zinc-600">
                  0 {detailSettings.ratingLabel}
                </span>
              )}
              <span className="text-zinc-300" aria-hidden>|</span>
              <span className="whitespace-nowrap text-zinc-700">{detailSettings.soldLabel} {soldCount}</span>
            </div>
          </header>

          <div
            className="min-w-0 shrink-0 rounded-2xl border bg-white p-3 shadow-sm md:rounded-xl md:p-3.5 lg:rounded-2xl lg:border lg:bg-slate-50 lg:p-3"
            style={{ borderColor: themeSettings.cardBorderColor }}
          >
            <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1 md:gap-x-3 md:gap-y-1.5">
              <span className="text-2xl font-bold leading-none text-[#2563EB] md:text-xl lg:text-[38px] lg:font-extrabold lg:leading-none lg:tracking-[-0.025em]">
                {formatVnd(displayPrice)}
              </span>
              {hasSale ? (
                <span className="text-sm leading-none text-zinc-500 line-through lg:text-base lg:text-slate-400">
                  {formatVnd(product.basePrice)}
                </span>
              ) : null}
              {detailSettings.showDiscountBadge && discountPercent > 0 ? (
                <span className="inline-flex items-center rounded-lg bg-[#FFF1E6] px-2 py-1 text-xs font-semibold text-[#F97316] lg:rounded-lg lg:px-2.5 lg:py-1 lg:text-xs">
                  -{discountPercent}%
                </span>
              ) : null}
            </div>
            {detailSettings.showBestPriceNote ? (
              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-emerald-700">
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
          </div>

          <div className="min-h-0 min-w-0 space-y-3 overflow-visible md:space-y-4 xl:max-h-[240px] xl:overflow-y-auto xl:overflow-x-hidden xl:pr-1">
          {detailSettings.showPolicyRow ? (
            <div className="grid min-w-0 shrink-0 grid-cols-2 gap-2 md:gap-2.5 lg:gap-2">
              {policyItems.map((label, index) => (
                <span
                  key={label}
                  className="inline-flex min-h-[40px] min-w-0 items-center justify-center gap-1.5 rounded-xl border bg-amber-50/70 px-2.5 py-2 text-[11px] font-semibold leading-snug text-amber-950 md:min-h-[44px] md:gap-2 md:px-3 md:py-2.5 md:text-xs lg:min-h-[44px] lg:rounded-xl lg:px-3 lg:py-2 lg:text-[11px] lg:font-semibold lg:shadow-sm lg:transition-colors lg:hover:border-zinc-400 xl:min-h-[40px] xl:py-1.5"
                  style={{ borderColor: themeSettings.cardBorderColor }}
                >
                  {index === 0 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-orange-600 md:h-[18px] md:w-[18px] lg:h-[18px] lg:w-[18px]" aria-hidden>
                      <path d="M10 2.5l5.5 2v5.1c0 3.4-2.3 6.4-5.5 7.3-3.2-.9-5.5-3.9-5.5-7.3V4.5l5.5-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7.4 10.2l1.7 1.7 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {index === 1 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-orange-600 md:h-[18px] md:w-[18px] lg:h-[18px] lg:w-[18px]" aria-hidden>
                      <path d="M15.3 7.2A6.2 6.2 0 1 0 16 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15.3 3.8v3.6h-3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {index === 2 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-orange-600 md:h-[18px] md:w-[18px] lg:h-[18px] lg:w-[18px]" aria-hidden>
                      <path d="M2.5 11.5h10.8l1.8 2.2h2.4V9.5l-2-2h-3.6l-1.6-2H6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6.5" cy="14.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="14.5" cy="14.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ) : null}
                  {index === 3 ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-orange-600 md:h-[18px] md:w-[18px] lg:h-[18px] lg:w-[18px]" aria-hidden>
                      <path d="M10 2.8l1.9 3.9 4.3.6-3.1 3 0.7 4.3-3.8-2-3.8 2 0.7-4.3-3.1-3 4.3-.6L10 2.8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  <span className="text-center font-semibold text-amber-950">{label}</span>
                </span>
              ))}
            </div>
          ) : null}

          <ProductPromotionSection coupons={promotionCoupons} productPrice={displayPrice} />
          </div>

          <div className="min-w-0 shrink-0 space-y-2.5 xl:mt-auto">
          {canPurchaseOnPdp ? (
            <div className="flex min-w-0 shrink-0 flex-col gap-3">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
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
                    shippingClass,
                  }}
                  label={detailSettings.addToCartLabel}
                  className="box-border inline-flex h-11 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-xl border bg-white px-5 text-sm font-semibold transition duration-200 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-14 lg:rounded-2xl lg:border-2 lg:text-base lg:shadow-sm xl:h-12 xl:rounded-xl"
                  style={{
                    borderColor: themeSettings.primaryColor,
                    color: themeSettings.primaryColor,
                  }}
                />
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
                    shippingClass,
                  }}
                  className="box-border inline-flex h-11 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-semibold text-white transition duration-200 hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-14 lg:rounded-2xl lg:text-base lg:shadow-sm xl:h-12 xl:rounded-xl"
                  label={detailSettings.buyNowLabel}
                  style={{
                    backgroundColor: themeSettings.ctaColor,
                  }}
                />
              </div>
              {product.brand ? (
                <p className="text-center text-xs text-zinc-600 lg:text-left">
                  Thương hiệu:{" "}
                  <Link href={`/thuong-hieu/${product.brand.slug}`} className="font-semibold text-zinc-900">
                    {product.brand.name}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              {ctvBlockedMessage}
            </div>
          )}

          {websiteAff.affiliateEnabled && ctvRefCode ? (
            <div className="min-w-0 shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
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
          </div>
        </ProductDetailInfoShell>
      </article>

      <section className="mt-6 grid grid-cols-1 gap-3 md:mt-8 md:gap-4 lg:mt-8 lg:grid-cols-[2fr_1fr] lg:gap-8">
        <article className="space-y-4 md:space-y-6">
          <section
            className="rounded-2xl border bg-white p-3 shadow-sm md:rounded-xl md:p-5 md:shadow-none lg:rounded-[28px] lg:p-8 lg:shadow-sm"
            style={{ borderColor: themeSettings.cardBorderColor }}
          >
            <h2 className="text-lg font-semibold text-zinc-900 lg:text-3xl lg:font-bold">
              {detailSettings.descriptionTitle}
            </h2>
            <details open className="mt-2 md:mt-3">
              <summary className="cursor-pointer text-sm font-medium" style={{ color: themeSettings.primaryColor }}>
                {detailSettings.readMoreLabel}
              </summary>
              <div className="prose prose-sm prose-zinc mt-2 max-w-none whitespace-pre-line break-words text-sm leading-relaxed text-zinc-700 md:prose-base md:leading-7 lg:prose-slate lg:text-[15px] lg:leading-8">
                {product.description ?? product.shortDescription ?? "Thông tin đang cập nhật."}
              </div>
            </details>
          </section>

          {productFaqItems.length ? (
            <section
              className="rounded-2xl border bg-white p-3 shadow-sm md:rounded-xl md:p-5 md:shadow-none lg:rounded-[28px] lg:p-8 lg:shadow-sm"
              style={{ borderColor: themeSettings.cardBorderColor }}
            >
              <h2 className="text-lg font-semibold text-zinc-900 lg:text-2xl lg:font-bold">Câu hỏi thường gặp về {product.name}</h2>
              <dl className="mt-4 space-y-3">
                {productFaqItems.map((item) => (
                  <div key={item.question} className="rounded-xl bg-zinc-50 p-4">
                    <dt className="text-sm font-semibold text-zinc-900">{item.question}</dt>
                    <dd className="mt-1 text-sm leading-6 text-zinc-600">{item.answer}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/danh-muc/${product.category.slug}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
                  Xem danh mục {product.category.name}
                </Link>
                {relatedProducts.slice(0, 4).map((item) => (
                  <Link key={item.id} href={`/san-pham/${item.slug}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950">
                    {item.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="space-y-3 md:space-y-4">
          {bestPriceProducts.length ? (
            <section
              className="sticky top-24 hidden rounded-[28px] border bg-white p-4 shadow-sm xl:block"
              style={{ borderColor: themeSettings.cardBorderColor }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-zinc-950">
                    🔥 Giá tốt bán chạy
                  </h2>
                  <p className="mt-1 text-xs font-medium text-zinc-500">Sản phẩm dưới 199K, bán chạy nhất</p>
                </div>
                <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                  Dưới 199K
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {bestPriceProducts.map((item, index) => {
                  const itemPrice = priceForDisplay(item);
                  const hasItemSale = item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice;
                  return (
                    <Link
                      key={item.id}
                      href={`/san-pham/${item.slug}`}
                      className="group flex min-w-0 gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-2.5 transition hover:border-orange-200 hover:bg-orange-50/60"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                        {item.imageUrl ? (
                          <MediaImage
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="64px"
                            fallbackLabel={item.name}
                            className="object-contain p-1.5 transition duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center border border-dashed border-zinc-200 text-[10px] text-zinc-400">
                            Ảnh
                          </div>
                        )}
                        <span className="absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-semibold leading-5 text-zinc-900 group-hover:text-orange-700">
                          {item.name}
                        </p>
                        <div className="mt-1 flex min-w-0 flex-wrap items-end gap-x-1.5 gap-y-0.5">
                          <span className="text-sm font-extrabold text-[#2563EB]">{formatVnd(itemPrice)}</span>
                          {hasItemSale ? (
                            <span className="text-[10px] text-zinc-400 line-through">{formatVnd(item.basePrice)}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-zinc-500">
                          Đã bán {new Intl.NumberFormat("vi-VN").format(Math.max(0, item.soldCount))}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {warrantyPolicy ? (
            <section
              className="rounded-2xl border bg-white p-3 shadow-sm md:rounded-xl md:p-5 md:shadow-none lg:rounded-[28px] lg:p-6 lg:shadow-sm"
              style={{ borderColor: themeSettings.cardBorderColor }}
            >
              <h2 className="text-base font-semibold text-zinc-900">Chinh sach bao hanh</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:leading-6">{warrantyPolicy}</p>
            </section>
          ) : null}

          {returnPolicy ? (
            <section
              className="rounded-2xl border bg-white p-3 shadow-sm md:rounded-xl md:p-5 md:shadow-none lg:rounded-[28px] lg:p-6 lg:shadow-sm"
              style={{ borderColor: themeSettings.cardBorderColor }}
            >
              <h2 className="text-base font-semibold text-zinc-900">Chinh sach doi tra</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:leading-6">{returnPolicy}</p>
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
        <section className="mt-8 sm:mt-10">
          <div
            className="w-full rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
            style={{ borderColor: themeSettings.cardBorderColor }}
          >
            <SectionHeading title="Sản phẩm liên quan" />
            {relatedProducts.length ? (
              <ProductGrid
                products={relatedProducts}
                buyNowLabel={themeSettings.productDetailPrimaryButtonText?.trim() || "Mua ngay"}
                addToCartLabel=""
                buttonMode={themeSettings.productCardButtonMode}
                primaryColor={themeSettings.primaryColor || "#2563EB"}
                secondaryColor={themeSettings.secondaryColor || "#0F172A"}
                desktopColumns={storefrontSettings.website.productGridColumnsDesktop}
              />
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
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
    </div>
  );
}
