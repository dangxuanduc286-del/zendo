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

export type FaqJsonLdItem = {
  question: string;
  answer: string;
};

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

export function buildFaqPageJsonLd(items: FaqJsonLdItem[]): Record<string, unknown> | null {
  const mainEntity = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .slice(0, 8)
    .map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    }));

  if (!mainEntity.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

export function buildOrganizationJsonLd(input: {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  sameAs?: string[];
}): Record<string, unknown> {
  const url = input.url || absoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url.replace(/\/+$/, "")}/#organization`,
    name: input.name,
    url,
    logo: input.logo || undefined,
    description: input.description || undefined,
    email: input.email || undefined,
    telephone: input.telephone || undefined,
    address: input.address
      ? {
          "@type": "PostalAddress",
          streetAddress: input.address,
          addressCountry: "VN",
        }
      : undefined,
    sameAs: input.sameAs?.filter((item) => /^https?:\/\//i.test(item)) ?? undefined,
  };
}

export function buildWebSiteJsonLd(input: {
  name: string;
  url?: string;
  description?: string;
  searchPath?: string;
}): Record<string, unknown> {
  const url = input.url || absoluteUrl("/");
  const trimmedUrl = url.replace(/\/+$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${trimmedUrl}/#website`,
    name: input.name,
    url,
    description: input.description || undefined,
    inLanguage: "vi-VN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${trimmedUrl}${input.searchPath ?? "/cua-hang"}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildItemListJsonLd(input: {
  name: string;
  path: string;
  items: Array<{ name: string; path: string; image?: string; price?: number | null; currency?: string }>;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(item.path),
      item: {
        "@type": "Product",
        name: item.name,
        url: absoluteUrl(item.path),
        image: item.image || undefined,
        offers:
          typeof item.price === "number"
            ? {
                "@type": "Offer",
                price: item.price,
                priceCurrency: item.currency ?? "VND",
              }
            : undefined,
      },
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
  aggregateRating?: { ratingValue: number; reviewCount: number };
  reviews?: Array<{ authorName: string; rating: number; title?: string | null; content?: string | null; datePublished?: string | Date | null }>;
  seller?: string;
  shippingDetails?: { shippingRate?: number; currency?: string; minValue?: number; country?: string };
  returnPolicy?: { url?: string; name?: string; days?: number };
  itemCondition?: string;
  priceValidUntil?: string;
}): Record<string, unknown> {
  const currency = input.currency ?? "VND";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    image: input.images,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    aggregateRating:
      input.aggregateRating && input.aggregateRating.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: input.aggregateRating.ratingValue,
            reviewCount: input.aggregateRating.reviewCount,
          }
        : undefined,
    review: input.reviews?.map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.authorName || "Khách hàng Zendo" },
      name: review.title || undefined,
      reviewBody: review.content || undefined,
      datePublished: review.datePublished ? new Date(review.datePublished).toISOString() : undefined,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: input.price,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(input.path),
      seller: input.seller ? { "@type": "Organization", name: input.seller } : undefined,
      itemCondition: input.itemCondition ?? "https://schema.org/NewCondition",
      priceValidUntil: input.priceValidUntil,
      shippingDetails: input.shippingDetails
        ? {
            "@type": "OfferShippingDetails",
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: input.shippingDetails.country ?? "VN",
            },
            shippingRate: {
              "@type": "MonetaryAmount",
              value: input.shippingDetails.shippingRate ?? 0,
              currency: input.shippingDetails.currency ?? currency,
            },
            freeShippingThreshold:
              typeof input.shippingDetails.minValue === "number"
                ? {
                    "@type": "MonetaryAmount",
                    value: input.shippingDetails.minValue,
                    currency: input.shippingDetails.currency ?? currency,
                  }
                : undefined,
          }
        : undefined,
      hasMerchantReturnPolicy: input.returnPolicy
        ? {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "VN",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: input.returnPolicy.days ?? 7,
            name: input.returnPolicy.name,
            url: input.returnPolicy.url,
          }
        : undefined,
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

