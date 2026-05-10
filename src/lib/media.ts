import { getPublicMediaBaseUrl, isPublicMediaUrl, normalizeMediaUrl } from "./media-url";

export function resolveMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("/images/fallbacks/")) return pathOrUrl;
  return normalizeMediaUrl(pathOrUrl);
}

/** Các path demo/seed không có file thật trên CDN — không dùng làm src (tránh 404 hàng loạt). */
const BLOG_THUMBNAIL_DENY_PATHS: RegExp[] = [
  /^images\/blog\/bi-quyet-mua-sam-thong-minh-\d+\.jpe?g$/i,
  /^images\/blog\/post-\d+\.jpe?g$/i,
];

/**
 * URL ảnh đại diện bài viết an toàn cho storefront:
 * chỉ https://media.zendo.vn/... (theo cấu hình), image extension, không thuộc nhóm placeholder đã biết.
 */
export function sanitizePostThumbnailUrl(raw: string | null | undefined): string {
  const normalized = normalizeMediaUrl(String(raw ?? "").trim());
  if (!normalized) return "";
  if (!isPublicMediaUrl(normalized)) return "";
  try {
    const pathname = new URL(normalized).pathname.replace(/^\/+/, "");
    if (BLOG_THUMBNAIL_DENY_PATHS.some((re) => re.test(pathname))) return "";
    return normalized;
  } catch {
    return "";
  }
}

export function getMediaBaseUrl(): string {
  return getPublicMediaBaseUrl();
}

export function buildPublicMediaUrl(pathOrUrl: string): string {
  return normalizeMediaUrl(pathOrUrl);
}
