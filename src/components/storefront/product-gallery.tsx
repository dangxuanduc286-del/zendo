"use client";

import { useEffect, useMemo, useState } from "react";
import MediaImage from "../shared/media-image";

export interface ProductGalleryImage {
  id: string;
  url: string;
  altText: string;
}

interface ProductGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
}

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps): JSX.Element {
  const normalized = useMemo(() => {
    if (images.length) return images;
    return [
      {
        id: "fallback-image",
        url: "",
        altText: productName,
      },
    ];
  }, [images, productName]);

  const [activeId, setActiveId] = useState(normalized[0]?.id ?? "fallback-image");
  const [expandedThumbs, setExpandedThumbs] = useState(false);
  const active = normalized.find((image) => image.id === activeId) ?? normalized[0];
  const hasOverflowThumbs = normalized.length > 5;
  const visibleThumbs = expandedThumbs || !hasOverflowThumbs ? normalized : normalized.slice(0, 5);
  const hiddenCount = Math.max(0, normalized.length - 4);

  useEffect(() => {
    if (!normalized.find((image) => image.id === activeId)) {
      setActiveId(normalized[0]?.id ?? "fallback-image");
    }
  }, [normalized, activeId]);


  return (
    <section className="space-y-3" aria-label="Hình ảnh sản phẩm">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        <MediaImage
          src={active?.url ?? ""}
          alt={active?.altText ?? productName}
          fallbackLabel={productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {normalized.length > 1 ? (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleThumbs.map((image, index) => {
            const isActive = image.id === active?.id;
            const showOverflowOverlay = hasOverflowThumbs && !expandedThumbs && index === 4;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  setActiveId(image.id);
                  if (showOverflowOverlay) setExpandedThumbs(true);
                }}
                className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-md border bg-zinc-100 transition sm:h-[70px] sm:w-[70px] ${
                  isActive ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-400"
                }`}
                aria-label={showOverflowOverlay ? `Xem them ${hiddenCount} anh` : `Xem anh ${image.altText}`}
              >
                <MediaImage
                  src={image.url}
                  alt={image.altText}
                  fallbackLabel={productName}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
                {showOverflowOverlay ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                    5+
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
