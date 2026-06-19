import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Domain SEO chuẩn duy nhất cho production.
 * Mọi canonical / OG / schema / sitemap / robots phải dùng đúng giá trị này.
 * Không bao giờ chứa subdomain `www.` để tránh phân tán SEO.
 */
export const CANONICAL_PRODUCTION_HOST = "zendo.vn";
export const CANONICAL_PRODUCTION_ORIGIN = `https://${CANONICAL_PRODUCTION_HOST}`;

/**
 * Strip subdomain `www.` cho host `zendo.vn` để mọi URL public trỏ về 1 domain duy nhất.
 * Không can thiệp vào host khác (`media.zendo.vn`, `localhost`, custom preview…) — chỉ
 * normalize host SEO chính.
 */
export function normalizeCanonicalOrigin(rawOrigin: string): string {
  const trimmed = rawOrigin.trim();
  if (!trimmed) return CANONICAL_PRODUCTION_ORIGIN;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.toLowerCase() === `www.${CANONICAL_PRODUCTION_HOST}`) {
      parsed.hostname = CANONICAL_PRODUCTION_HOST;
    }
    return parsed.origin;
  } catch {
    return CANONICAL_PRODUCTION_ORIGIN;
  }
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return normalizeCanonicalOrigin(new URL(raw).origin);
  } catch {
    return null;
  }
}

export function resolveSiteUrl(): string {
  const fromEnv =
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeUrl(process.env.NEXTAUTH_URL) ??
    normalizeUrl(process.env.AUTH_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;

  return process.env.NODE_ENV === "production"
    ? CANONICAL_PRODUCTION_ORIGIN
    : "http://localhost:3000";
}

export function absoluteUrl(pathname = "/"): string {
  const baseUrl = resolveSiteUrl();
  return new URL(pathname, baseUrl).toString();
}
