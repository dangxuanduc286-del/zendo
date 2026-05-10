"use client";

import ProductGrid from "../product-grid";
import type { ProductCardData } from "../product-card";

export default function DealsProductRail({
  products,
  desktopColumns,
}: {
  products: ProductCardData[];
  desktopColumns: number;
}): JSX.Element | null {
  if (!products.length) return null;
  return (
    <div data-deals-block="product-rail">
      <ProductGrid products={products} desktopColumns={desktopColumns} />
    </div>
  );
}

