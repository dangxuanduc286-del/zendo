/** Origin công khai dùng cho link affiliate storefront (SSR + CSR). Không chứa thông tin nhạy cảm. */

export function resolveAffiliatePublicOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location?.origin ?? "";
    if (origin.startsWith("http://") || origin.startsWith("https://")) return origin;
  }

  const candidates = [
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL : "",
    typeof process !== "undefined" ? process.env.NEXTAUTH_URL : "",
    typeof process !== "undefined" ? process.env.AUTH_URL : "",
    "https://www.zendo.vn",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      continue;
    }
  }

  return "https://www.zendo.vn";
}
