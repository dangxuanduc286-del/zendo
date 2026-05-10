import Link from "next/link";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";

export interface BrandCardData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface BrandCardProps {
  brand: BrandCardData;
}

export default function BrandCard({ brand }: BrandCardProps): JSX.Element {
  const logoUrl = resolveMediaUrl(brand.logoUrl ?? "");

  return (
    <Link
      href={`/thuong-hieu/${brand.slug}`}
      className="group flex h-24 items-center justify-center rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {logoUrl ? (
        <MediaImage
          src={logoUrl}
          alt={brand.name}
          width={140}
          height={64}
          fallbackLabel={brand.name}
          className="h-12 w-auto object-contain grayscale transition group-hover:grayscale-0"
        />
      ) : (
        <span className="text-sm font-semibold text-zinc-700">{brand.name}</span>
      )}
    </Link>
  );
}
