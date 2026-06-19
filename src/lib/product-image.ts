import { resolveMediaUrl } from "./media";

export type ProductImageCandidate = {
  url?: string | null;
  isPrimary?: boolean | null;
  sortOrder?: number | null;
  altText?: string | null;
};

export type ResolvedProductImage = {
  url: string;
  altText: string;
  hasImage: boolean;
};

export const PRODUCT_IMAGE_PLACEHOLDER_LABEL = "Chưa có ảnh sản phẩm";

function sortProductImages<T extends ProductImageCandidate>(images: T[]): T[] {
  return [...images].sort((a, b) => {
    const primaryA = a.isPrimary === true ? 1 : 0;
    const primaryB = b.isPrimary === true ? 1 : 0;
    if (primaryA !== primaryB) return primaryB - primaryA;
    return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
  });
}

/**
 * SSOT cho ảnh sản phẩm: ưu tiên ảnh isPrimary, sau đó sortOrder tăng dần, tự động chuẩn hóa URL media.
 * Không truy cập DB, không thay đổi API/schema; dùng được ở server/client.
 */
export function resolveProductImage(
  images: ProductImageCandidate[] | null | undefined,
  productName = "Sản phẩm",
): ResolvedProductImage {
  const sorted = sortProductImages((images ?? []).filter(Boolean));
  for (const image of sorted) {
    const url = resolveMediaUrl(String(image.url ?? "").trim());
    if (!url) continue;
    const altText = String(image.altText ?? "").trim() || productName || PRODUCT_IMAGE_PLACEHOLDER_LABEL;
    return { url, altText, hasImage: true };
  }
  return { url: "", altText: productName || PRODUCT_IMAGE_PLACEHOLDER_LABEL, hasImage: false };
}

export function resolveProductImageUrl(
  images: ProductImageCandidate[] | null | undefined,
  productName = "Sản phẩm",
): string {
  return resolveProductImage(images, productName).url;
}
