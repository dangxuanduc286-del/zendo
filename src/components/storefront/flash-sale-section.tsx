import ProductGrid from "./product-grid";
import SectionHeading from "./section-heading";
import type { ProductCardData } from "./product-card";

interface FlashSaleSectionProps {
  products: ProductCardData[];
  className?: string;
}

export default function FlashSaleSection({
  products,
  className = "",
}: FlashSaleSectionProps): JSX.Element | null {
  if (!products.length) return null;

  const saleProducts = products.filter((product) => {
    const base = Number(product.basePrice);
    const sale = Number(product.salePrice ?? 0);
    return Number.isFinite(base) && Number.isFinite(sale) && sale > 0 && sale < base;
  });

  if (!saleProducts.length) return null;


  return (
    <section
      className={`rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4 sm:p-6 ${className}`.trim()}
    >
      <SectionHeading
        title="Flash Sale"
        description="Sản phẩm dang giam gia trong thoi gian ngan."
        actionLabel="Xem tat ca"
        actionHref="/flash-deal"
      />
      <ProductGrid products={saleProducts} />
    </section>
  );
}
