"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";

interface MediaImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string;
  alt: string;
  fallbackLabel?: string;
}

function sanitizeLabel(label: string): string {
  return label.replace(/[<>&"]/g, "").slice(0, 80);
}

function buildFallbackDataUrl(label: string): string {
  const safe = sanitizeLabel(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f4f4f5"/><g fill="#71717a" font-family="Arial, sans-serif" text-anchor="middle"><text x="600" y="380" font-size="36">Zendo.vn</text><text x="600" y="430" font-size="26">${safe}</text></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function MediaImage({
  src,
  alt,
  fallbackLabel,
  ...props
}: MediaImageProps): JSX.Element {
  const fallbackSrc = useMemo(
    () => buildFallbackDataUrl(fallbackLabel ?? alt ?? "Image unavailable"),
    [fallbackLabel, alt],
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const safeSrc = hasError || !src ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={safeSrc}
      alt={alt}
      onError={() => setHasError(true)}
    />
  );
}
