/** Origin công khai dùng cho link affiliate storefront (SSR + CSR). Không chứa thông tin nhạy cảm. */

import { CANONICAL_PRODUCTION_ORIGIN, normalizeCanonicalOrigin } from "./utils";

export function resolveAffiliatePublicOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location?.origin ?? "";
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      return normalizeCanonicalOrigin(origin);
    }
  }

  const candidates = [
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : "",
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL : "",
    typeof process !== "undefined" ? process.env.NEXTAUTH_URL : "",
    typeof process !== "undefined" ? process.env.AUTH_URL : "",
    CANONICAL_PRODUCTION_ORIGIN,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return normalizeCanonicalOrigin(parsed.origin);
      }
    } catch {
      continue;
    }
  }

  return CANONICAL_PRODUCTION_ORIGIN;
}
