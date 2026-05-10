import { memo } from "react";
import ProductCard, { type ProductCardData } from "./product-card";

interface ProductGridProps {
  products: ProductCardData[];
  className?: string;
  desktopColumns?: number;
  buyNowLabel?: string;
  addToCartLabel?: string;
  buttonMode?: "solid" | "outline";
  primaryColor?: string;
  secondaryColor?: string;
}

function ProductGrid({
  products,
  className = "",
  desktopColumns = 6,
  buyNowLabel,
  addToCartLabel,
  buttonMode,
  primaryColor,
  secondaryColor,
}: ProductGridProps): JSX.Element {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Chưa có sản phẩm phù hợp.
      </div>
    );
  }

  const dedupedProducts: ProductCardData[] = [];
  const seenKeys = new Set<string>();

  for (const product of products) {
    const hrefCandidate = product.href?.trim() || (product.slug ? `/san-pham/${product.slug}` : "");
    const candidates = [
      product.id?.trim() ? `id:${product.id.trim()}` : "",
      product.slug?.trim() ? `slug:${product.slug.trim()}` : "",
      product.sku?.trim() ? `sku:${product.sku.trim()}` : "",
      hrefCandidate ? `href:${hrefCandidate}` : "",
    ].filter(Boolean);

    const dedupeKey = candidates[0] ?? "";
    if (!dedupeKey) {
      dedupedProducts.push(product);
      continue;
    }
    if (seenKeys.has(dedupeKey)) {
      continue;
    }
    seenKeys.add(dedupeKey);
    dedupedProducts.push(product);
  }

  const desktopColumnsSafe =
    Number.isFinite(desktopColumns) && desktopColumns >= 4 && desktopColumns <= 6
      ? Math.floor(desktopColumns)
      : 6;
  const desktopColumnsClass =
    desktopColumnsSafe === 4
      ? "xl:grid-cols-4 2xl:grid-cols-4"
      : desktopColumnsSafe === 5
        ? "xl:grid-cols-5 2xl:grid-cols-5"
        : "xl:grid-cols-6 2xl:grid-cols-6";

  return (
    <div
      className={`grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4 ${desktopColumnsClass} xl:gap-4 2xl:gap-4 ${className}`.trim()}
    >
      {dedupedProducts.map((product, index) => {
        const hrefCandidate = product.href?.trim() || (product.slug ? `/san-pham/${product.slug}` : "");
        const baseKey =
          product.id?.trim() ||
          product.slug?.trim() ||
          product.sku?.trim() ||
          hrefCandidate ||
          `fallback-product`;
        const renderKey = `${baseKey}-${index}`;

        return (
        <ProductCard
          key={renderKey}
          product={product}
          buyNowLabel={buyNowLabel}
          addToCartLabel={addToCartLabel}
          buttonMode={buttonMode}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
        );
      })}
    </div>
  );
}

export default memo(ProductGrid);
