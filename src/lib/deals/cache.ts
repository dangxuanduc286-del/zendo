import { unstable_cache } from "next/cache";

export const DEALS_TAG = "deals";
export const DEALS_SETTINGS_TAG = "storefront-settings";
export const DEALS_TRENDING_TAG = "deals-trending";
export const DEALS_SALE_TAG = "deals-sale";
export const DEALS_MANUAL_TAG = "deals-manual";
export const DEALS_COUPONS_TAG = "deals-coupons";
export const DEALS_CATEGORY_TAG = "deals-category";
export const DEALS_PREVIEW_TAG = "deals-preview";

export const REVALIDATE_TRENDING_SECONDS = 10 * 60;
export const REVALIDATE_SALE_SECONDS = 5 * 60;
export const REVALIDATE_COUPONS_SECONDS = 2 * 60;
export const REVALIDATE_MANUAL_SECONDS = 30 * 60;
export const REVALIDATE_CATEGORY_SECONDS = 10 * 60;

export function cached<TArgs extends unknown[], TResult>(
  keyParts: string[],
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { revalidate: number; tags: string[] },
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, keyParts, opts);
}

export function cachedPreview<TArgs extends unknown[], TResult>(
  keyParts: string[],
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { revalidate: number },
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, keyParts, { revalidate: opts.revalidate, tags: [DEALS_PREVIEW_TAG] });
}

