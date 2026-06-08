import Image from "next/image";
import Link from "next/link";

export interface StorefrontProductItem {
  id: string;
  name: string;
  slug: string;
  /** basePrice từ Prisma Decimal (đã toString) */
  basePrice: string;
  /** salePrice từ Prisma Decimal (đã toString), null nếu không giảm */
  salePrice: string | null;
  /** URL ảnh đại diện (primary image) */
  thumbnailUrl: string | null;
}

interface PostRelatedProductsProps {
  products: StorefrontProductItem[];
}

function formatPrice(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
}

export default function PostRelatedProducts({
  products,
}: PostRelatedProductsProps): JSX.Element | null {
  if (!products.length) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-zinc-900">Sản phẩm liên quan</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/san-pham/${product.slug}`}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-400 hover:shadow-sm"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
              {product.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-300">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-1 flex-col">
              <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 transition-colors group-hover:text-blue-700">
                {product.name}
              </h3>
              <div className="mt-auto pt-2">
                {product.salePrice !== null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-red-600">
                      {formatPrice(product.salePrice)}
                    </span>
                    <span className="text-xs text-zinc-400 line-through">
                      {formatPrice(product.basePrice)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-zinc-900">
                    {formatPrice(product.basePrice)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
