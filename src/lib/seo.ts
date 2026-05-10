import type { Metadata } from "next";
import { resolveMediaUrl } from "./media";
import { absoluteUrl } from "./utils";
import { getWebsiteSettings } from "./settings";

export interface SeoMetadataInput {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  canonicalBaseUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

export interface JsonLdWebPageInput {
  title: string;
  description: string;
  path?: string;
}

function toValidSeoImage(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const mediaImage = resolveMediaUrl(raw);
  const resolved = mediaImage && (mediaImage.startsWith("http://") || mediaImage.startsWith("https://"))
    ? mediaImage
    : mediaImage
      ? absoluteUrl(mediaImage)
      : "";
  if (!resolved) return "";
  if (/og-default\.jpg/i.test(resolved)) return "";
  if (!/^https?:\/\//i.test(resolved)) return "";
  return resolved;
}

export function buildMetadata(input: SeoMetadataInput): Metadata {
  const title = input.title.trim();
  const description = input.description.trim();
  const canonical = input.canonicalBaseUrl
    ? new URL(input.path ?? "/", input.canonicalBaseUrl).toString()
    : absoluteUrl(input.path ?? "/");
  const rawImage = typeof input.image === "string" ? input.image.trim() : "";
  const image = toValidSeoImage(rawImage);
  const robots = input.noIndex
    ? { index: false, follow: false }
    : {
        index: input.robotsIndex ?? true,
        follow: input.robotsFollow ?? true,
      };

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonical,
      type: input.type ?? "website",
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
      publishedTime: input.publishedTime,
      modifiedTime: input.modifiedTime,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export async function buildDynamicMetadata(input: SeoMetadataInput): Promise<Metadata> {
  const website = await getWebsiteSettings();
  const fallbackTitle = website.defaultSeoTitle || website.siteName || "Zendo.vn";
  const fallbackDescription =
    website.defaultSeoDescription ||
    "Nền tảng thương mại điện tử đa ngành, giao hàng nhanh, giá tốt mỗi ngày.";
  const fallbackImage =
    toValidSeoImage(website.defaultOgImage) ||
    toValidSeoImage(website.logoUrl) ||
    toValidSeoImage(input.image ?? "");

  return buildMetadata({
    ...input,
    title: input.title.trim() || fallbackTitle,
    description: input.description.trim() || fallbackDescription,
    image: fallbackImage,
    canonicalBaseUrl: website.canonicalBaseUrl || website.siteUrl,
    robotsIndex: website.robotsIndex,
    robotsFollow: website.robotsFollow,
  });
}

export function buildWebPageJsonLd(input: JsonLdWebPageInput): Record<string, unknown> {
  const url = absoluteUrl(input.path ?? "/");

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url,
    inLanguage: "vi-VN",
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path?: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path ? absoluteUrl(item.path) : undefined,
    })),
  };
}

export function buildProductJsonLd(input: {
  name: string;
  description: string;
  sku: string;
  images: string[];
  brand?: string;
  price: number;
  currency?: string;
  inStock: boolean;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    image: input.images,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: input.currency ?? "VND",
      price: input.price,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(input.path),
    },
  };
}

export function buildArticleJsonLd(input: {
  title: string;
  description: string;
  image?: string;
  publishedTime: string;
  modifiedTime: string;
  path: string;
  authorName?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    datePublished: input.publishedTime,
    dateModified: input.modifiedTime,
    mainEntityOfPage: absoluteUrl(input.path),
    author: {
      "@type": "Organization",
      name: input.authorName ?? "Zendo.vn",
    },
    publisher: {
      "@type": "Organization",
      name: "Zendo.vn",
    },
  };
}

export function toJsonLdScript(jsonLd: Record<string, unknown>): string {
  return JSON.stringify(jsonLd);
}
