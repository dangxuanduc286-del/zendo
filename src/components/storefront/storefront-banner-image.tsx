import Link from "next/link";
import type { CSSProperties } from "react";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";

interface StorefrontBannerImageProps {
  src: string;
  alt: string;
  href?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  /** Khi set, ghi đè object-fit từ imageClassName (ưu tiên cho hero mobile). */
  imageFit?: "contain" | "cover";
  objectPosition?: string;
  quality?: number;
  /** Nền khung (vd bg-slate-50/20 khi contain). */
  wrapperBgClassName?: string;
  /**
   * `card` — bo góc + viền + shadow (mặc định).
   * `frame` — chỉ khung relative + overflow + aspect (cha đã có card); dùng hero mobile để không lồng viền.
   */
  chrome?: "card" | "frame";
}

const fillLayoutClass = "absolute inset-0 h-full w-full";

export default function StorefrontBannerImage({
  src,
  alt,
  href = "",
  priority = false,
  sizes = "(max-width: 1024px) 100vw, 60vw",
  className = "",
  imageClassName = "object-cover",
  imageFit,
  objectPosition,
  quality = 90,
  wrapperBgClassName = "bg-white",
  chrome = "card",
}: StorefrontBannerImageProps): JSX.Element {
  const resolved = resolveMediaUrl(src);
  const pos = (objectPosition || "center center").trim() || "center center";
  const useInlineFit = imageFit !== undefined;
  const imgClass = useInlineFit ? fillLayoutClass : imageClassName;
  const imgStyle: CSSProperties = useInlineFit
    ? {
        objectFit: imageFit === "cover" ? "cover" : "contain",
        objectPosition: pos,
      }
    : { objectPosition: pos };

  const shellClass =
    chrome === "frame"
      ? `relative max-w-full overflow-hidden ${wrapperBgClassName} ${className}`.trim()
      : `relative max-w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm ${wrapperBgClassName} ${className}`.trim();

  const content = (
    <div className={shellClass}>
      {resolved ? (
        <MediaImage
          src={resolved}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          quality={quality}
          fallbackLabel={alt}
          className={imgClass}
          style={imgStyle}
        />
      ) : (
        <div className="flex h-full min-h-[160px] items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100 px-4 text-center text-sm font-medium text-slate-600">
          Ưu đãi Zendo
        </div>
      )}
    </div>
  );

  if (!href.trim()) return content;

  return (
    <Link href={href} aria-label={alt} className="block w-full max-w-full">
      {content}
    </Link>
  );
}
