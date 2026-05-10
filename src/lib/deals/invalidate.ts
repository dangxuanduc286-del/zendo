import { revalidateTag } from "next/cache";
import {
  DEALS_CATEGORY_TAG,
  DEALS_COUPONS_TAG,
  DEALS_MANUAL_TAG,
  DEALS_SALE_TAG,
  DEALS_SETTINGS_TAG,
  DEALS_TAG,
  DEALS_TRENDING_TAG,
} from "./cache";

export function invalidateDealsCaches(): void {
  revalidateTag(DEALS_TAG);
  revalidateTag(DEALS_TRENDING_TAG);
  revalidateTag(DEALS_SALE_TAG);
  revalidateTag(DEALS_MANUAL_TAG);
  revalidateTag(DEALS_COUPONS_TAG);
  revalidateTag(DEALS_CATEGORY_TAG);
  revalidateTag(DEALS_SETTINGS_TAG);
}

