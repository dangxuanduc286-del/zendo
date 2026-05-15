"use client";

import { Package } from "lucide-react";
import MediaImage from "../shared/media-image";

/** Thumbnail đơn trong Lịch sử mua hàng — kích thước tách với tab Đơn hàng của tôi. */
export function PurchaseHistoryOrderThumb({
  imageUrl,
  productName,
}: {
  imageUrl: string;
  productName: string;
}): JSX.Element {
  const trimmed = (imageUrl ?? "").trim();

  if (!trimmed) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100 text-slate-500 sm:h-20 sm:w-20 sm:rounded-2xl"
        title="Không có ảnh sản phẩm"
      >
        <Package className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">Không có ảnh — {productName}</span>
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100 sm:h-20 sm:w-20 sm:rounded-2xl">
      <MediaImage
        src={trimmed}
        alt={productName}
        fallbackLabel={productName.slice(0, 40)}
        fill
        sizes="(max-width: 640px) 64px, 80px"
        loading="lazy"
        className="object-cover"
      />
    </div>
  );
}
