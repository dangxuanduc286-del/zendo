"use client";

import { Package } from "lucide-react";
import MediaImage from "../shared/media-image";

export function AccountOrderItemThumbnail({
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
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-[#E2E8F0] bg-slate-100 text-slate-500 sm:h-16 sm:w-16 sm:rounded-xl"
        title="Không có ảnh sản phẩm"
      >
        <Package className="h-6 w-6 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">Không có ảnh — {productName}</span>
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-slate-100 sm:h-16 sm:w-16 sm:rounded-xl">
      <MediaImage
        src={trimmed}
        alt={productName}
        fallbackLabel={productName.slice(0, 40)}
        fill
        sizes="(max-width: 640px) 56px, 64px"
        loading="lazy"
        className="object-cover"
      />
    </div>
  );
}
