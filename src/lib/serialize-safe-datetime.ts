/** Giá trị ngày từ Prisma, JSON API hoặc sau `unstable_cache` (Date → string ISO). */
export type DateLike = Date | string | number | null | undefined;

/**
 * Chuyển Date / ISO string / timestamp về `Date`.
 * Dùng sau `unstable_cache` hoặc khi kiểu runtime không khớp TypeScript.
 */
export function coerceCachedDate(value: DateLike): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** ISO 8601 cho SEO/metadata — không throw khi giá trị không hợp lệ. */
export function toIsoStringOrUndefined(value: DateLike): string | undefined {
  const date = coerceCachedDate(value);
  if (!date) return undefined;
  try {
    return date.toISOString();
  } catch {
    return undefined;
  }
}
