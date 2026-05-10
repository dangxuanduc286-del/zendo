import type { ImageLoaderProps } from "next/image";

const MEDIA_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "";

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const q = quality ?? 75;
  const normalizedSrc = src.startsWith("/") ? src.slice(1) : src;
  const base = MEDIA_BASE.replace(/\/+$/g, "");
  if (!src.startsWith("http") && !base) {
    throw new Error("NEXT_PUBLIC_R2_PUBLIC_BASE_URL is required for relative image src.");
  }

  const full = src.startsWith("http") ? new URL(src) : new URL(`${base}/${normalizedSrc}`);

  full.searchParams.set("width", String(width));
  full.searchParams.set("quality", String(q));
  full.searchParams.set("format", "auto");


  return full.toString();
}
