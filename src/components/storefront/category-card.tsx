import Link from "next/link";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";

export interface CategoryCardData {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount?: number;
}

interface CategoryCardProps {
  category: CategoryCardData;
}

export default function CategoryCard({ category }: CategoryCardProps): JSX.Element {
  const href = `/danh-muc/${category.slug}`;
  const imageUrl = resolveMediaUrl(category.imageUrl ?? "");

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[5/4] w-full bg-gradient-to-br from-slate-50 via-sky-50/40 to-amber-50/50">
        {imageUrl ? (
          <MediaImage
            src={imageUrl}
            alt={`Danh mục ${category.name} trên Zendo.vn`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
            fallbackLabel={category.name}
            className="object-cover transition duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-sm font-semibold leading-snug text-slate-600">
            {category.name}
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-900 sm:text-xl">{category.name}</h3>
        {typeof category.productCount === "number" ? (
          <p className="text-sm text-zinc-600 sm:text-base">{category.productCount} sản phẩm</p>
        ) : null}
      </div>
    </Link>
  );
}
