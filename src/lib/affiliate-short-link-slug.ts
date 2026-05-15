const RESERVED = new Set(
  [
    "api",
    "admin",
    "go",
    "_next",
    "static",
    "favicon",
    "robots",
    "sitemap",
    "tai-khoan",
    "gio-hang",
    "thanh-toan",
    "san-pham",
    "danh-muc",
    "bai-viet",
    "cua-hang",
    "auth",
    "null",
    "undefined",
  ].map((s) => s.toLowerCase()),
);

/** Normalize user slug: lowercase [a-z0-9-], 3–48 chars. */
export function normalizeAffiliateShortSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

export function isValidAffiliateShortSlug(slug: string): { ok: true } | { ok: false; message: string } {
  const s = normalizeAffiliateShortSlug(slug);
  if (s.length < 3) return { ok: false, message: "Slug quá ngắn (tối thiểu 3 ký tự)." };
  if (s.length > 48) return { ok: false, message: "Slug quá dài." };
  if (RESERVED.has(s)) return { ok: false, message: "Slug này được hệ thống giữ lại." };
  return { ok: true };
}
