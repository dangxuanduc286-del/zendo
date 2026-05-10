import Link from "next/link";
import MediaImage from "../shared/media-image";
import AddToCartButton from "./add-to-cart-button";
import BuyNowButton from "./buy-now-button";
import { formatVnd } from "../../lib/currency";
import { resolveMediaUrl } from "../../lib/media";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  href?: string | null;
  imageUrl: string;
  basePrice: number | string;
  salePrice?: number | string | null;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFlashSale?: boolean;
  brandName?: string | null;
  stockQuantity?: number | null;
  ratingAverage?: number | null;
  reviewCount?: number;
  soldCount?: number | null;
  soldLabel?: string | null;
  discountPercent?: number | null;
  saleEndAt?: string | Date | null;
  discountEndAt?: string | Date | null;
}

interface ProductCardProps {
  product: ProductCardData;
  buyNowLabel?: string;
  addToCartLabel?: string;
  buttonMode?: "solid" | "outline";
  primaryColor?: string;
  secondaryColor?: string;
}

function toNumber(value: number | string | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export default function ProductCard({
  product,
  buyNowLabel = "Mua ngay",
  addToCartLabel = "",
  buttonMode = "solid",
  primaryColor = "#2563EB",
  secondaryColor = "#0F172A",
}: ProductCardProps): JSX.Element {
  const outlineAccent = buttonMode === "outline" ? secondaryColor : undefined;
  const basePrice = toNumber(product.basePrice);
  const salePrice = product.salePrice == null ? null : toNumber(product.salePrice);
  const hasSale = salePrice != null && salePrice > 0 && salePrice < basePrice;
  const preferredDiscount = Number(product.discountPercent ?? 0);
  const discountPercent =
    preferredDiscount > 0
      ? Math.round(preferredDiscount)
      : hasSale && basePrice > 0
        ? Math.round(((basePrice - (salePrice ?? 0)) / basePrice) * 100)
        : 0;
  const imageUrl = resolveMediaUrl(product.imageUrl);
  const detailsHref = `/san-pham/${product.slug}`;
  const showCountdown = Boolean(product.saleEndAt || product.discountEndAt);
  const ratingAverage = Number(product.ratingAverage ?? 0);
  const reviewCount = Math.max(0, Number(product.reviewCount ?? 0));
  const soldCount = Math.max(0, Number(product.soldCount ?? 0));
  const hasReview = reviewCount > 0 && ratingAverage > 0;
  const numberFormat = new Intl.NumberFormat("vi-VN");
  const baseBadges = [
    product.isFeatured ? { key: "featured", label: "Nổi bật", className: "bg-amber-500" } : null,
    product.isBestSeller ? { key: "best", label: "Bán chạy", className: "bg-indigo-600" } : null,
    product.isNew ? { key: "new", label: "Mới", className: "bg-emerald-600" } : null,
    product.isFlashSale ? { key: "flash", label: "Flash", className: "bg-orange-500" } : null,
  ].filter((item): item is { key: string; label: string; className: string } => Boolean(item));
  const discountBadge =
    discountPercent > 0
      ? { key: "discount", label: `-${discountPercent}%`, className: "bg-[#F97316]" }
      : null;
  const badges = ((): Array<{ key: string; label: string; className: string }> => {
    const selected = baseBadges.slice(0, 3);
    if (!discountBadge) return selected;
    if (selected.length < 3) return [...selected, discountBadge];
    if (selected.some((badge) => badge.key === "flash")) {
      return selected.map((badge) => (badge.key === "flash" ? discountBadge : badge));
    }
    return [selected[0], selected[1], discountBadge];
  })();
  const buyNowButtonClass =
    buttonMode === "outline"
      ? "inline-flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border px-2 text-[11px] font-semibold transition sm:h-9 sm:rounded-xl sm:px-3 sm:text-sm whitespace-nowrap text-ellipsis"
      : "inline-flex h-8 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-transparent bg-[var(--z-cta,#F59E0B)] px-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#D97706] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/30 sm:h-9 sm:rounded-xl sm:px-3 sm:text-sm whitespace-nowrap text-ellipsis";
  const addToCartButtonClass =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--z-primary)] bg-white text-[var(--z-primary)] transition hover:bg-[#EFF6FF] sm:h-9 sm:w-9 sm:rounded-xl";

  return (
    <article className="group w-full min-w-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md">
      <Link href={detailsHref} className="relative block aspect-square overflow-hidden rounded-lg bg-white">
        {imageUrl ? (
          <MediaImage
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
            fallbackLabel={product.name}
            className="h-full w-full object-contain object-center p-2 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500">
            Chưa có ảnh
          </div>
        )}

        <div className="pointer-events-none absolute left-1.5 top-1.5 flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1 sm:left-2 sm:top-2">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className={`rounded-full ${badge.className} px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </Link>

      <div className="space-y-1.5 p-2 sm:space-y-2 sm:p-3">
        <h3 className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-[#0F172A] sm:min-h-10 sm:text-sm sm:leading-5">
          <Link href={detailsHref} className="transition hover:text-[var(--z-primary)]">
            {product.name}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#64748B] sm:text-[11px]">
          {hasReview ? (
            <>
              <span className="font-semibold text-[#F59E0B]">★ {ratingAverage.toFixed(1)}</span>
              <span>·</span>
              <span>{numberFormat.format(reviewCount)} đánh giá</span>
            </>
          ) : (
            <span>Chưa có đánh giá</span>
          )}
          <span>·</span>
          <span>{product.soldLabel?.trim() || "Đã bán"} {numberFormat.format(soldCount)}</span>
        </div>

        <div className="flex flex-wrap items-end gap-1 sm:gap-2">
          <span className="text-sm font-bold text-[#2563EB] sm:text-base">
            {formatVnd(hasSale ? salePrice ?? basePrice : basePrice)}
          </span>
          {hasSale ? (
            <span className="text-[10px] text-[#64748B] line-through sm:text-xs">{formatVnd(basePrice)}</span>
          ) : null}
        </div>

        {product.brandName ? (
          <div className="hidden flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#64748B] sm:flex">
            {product.brandName ? <span>{product.brandName}</span> : null}
          </div>
        ) : null}

        {showCountdown ? (
          <div className="hidden rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 sm:block sm:text-[11px]">
            Kết thúc ưu đãi: {String(product.saleEndAt ?? product.discountEndAt)}
          </div>
        ) : null}

        <div data-product-card-cta="true" className="flex min-w-0 items-center gap-2 pt-0.5">
          <AddToCartButton
            item={{
              id: product.id,
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl,
              sku: product.slug,
              basePrice,
              salePrice,
              stockQuantity: 1,
            }}
            className={addToCartButtonClass}
            label={addToCartLabel}
            ariaLabel={`Thêm ${product.name} vào giỏ hàng`}
            showIcon
            addedLabel="Đã thêm"
          />
          <BuyNowButton
            item={{
              id: product.id,
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl,
              sku: product.slug,
              basePrice,
              salePrice,
              stockQuantity: 1,
            }}
            className={buyNowButtonClass}
            label={buyNowLabel}
            ariaLabel={`Mua ngay ${product.name}`}
            style={{
              backgroundColor: buttonMode === "outline" ? "transparent" : undefined,
              borderColor: buttonMode === "outline" ? primaryColor : undefined,
              color: buttonMode === "outline" ? (outlineAccent ?? primaryColor) : "#ffffff",
            }}
          />
        </div>
      </div>
    </article>
  );
}
