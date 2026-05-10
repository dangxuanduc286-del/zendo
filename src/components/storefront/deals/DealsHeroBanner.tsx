"use client";

import Link from "next/link";
import MediaImage from "../../shared/media-image";
import { resolveMediaUrl } from "../../../lib/media";

export default function DealsHeroBanner({
  desktopImage,
  mobileImage,
  link,
  alt,
}: {
  desktopImage?: string;
  mobileImage?: string;
  link?: string;
  alt: string;
}): JSX.Element | null {
  const src = resolveMediaUrl((mobileImage || desktopImage || "").trim());
  if (!src) return null;
  const href = (link || "").trim();
  const shellClass = "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm aspect-[16/7]";
  const content = (
    <div className={shellClass}>
      <MediaImage
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        className="object-cover"
        fallbackLabel={alt}
      />
    </div>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label={alt} className="block w-full">
      {content}
    </Link>
  );
}

