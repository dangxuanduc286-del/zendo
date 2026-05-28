"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
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
  const pointerStartX = useRef<number | null>(null);
  const [isDraggingMainImage, setIsDraggingMainImage] = useState(false);
  const active = normalized.find((image) => image.id === activeId) ?? normalized[0];
  const activeIndex = Math.max(0, normalized.findIndex((image) => image.id === active?.id));
  const showThumbnails = normalized.length > 0;

  useEffect(() => {
    if (!normalized.find((image) => image.id === activeId)) {
      setActiveId(normalized[0]?.id ?? "fallback-image");
    }
  }, [normalized, activeId]);

  const selectImage = useCallback((imageId: string) => {
    setActiveId(imageId);
  }, []);

  const moveActiveImage = useCallback((direction: 1 | -1) => {
    if (normalized.length <= 1) return;
    const nextIndex = (activeIndex + direction + normalized.length) % normalized.length;
    setActiveId(normalized[nextIndex]?.id ?? normalized[0]?.id ?? "fallback-image");
  }, [activeIndex, normalized]);

  const handleMainWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12) return;
    event.preventDefault();
    moveActiveImage(event.deltaX > 0 ? 1 : -1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (normalized.length <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "mouse") event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current == null) return;
    if (Math.abs(event.clientX - pointerStartX.current) > 8) {
      setIsDraggingMainImage(true);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current == null) return;
    const deltaX = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    setIsDraggingMainImage(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (Math.abs(deltaX) < 50) return;
    moveActiveImage(deltaX < 0 ? 1 : -1);
  };

  const resetPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = null;
    setIsDraggingMainImage(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderThumbnailRow = (maxVisible: number, className: string) => {
    const hasOverflowThumbs = normalized.length > maxVisible;
    const visibleThumbs = hasOverflowThumbs ? normalized.slice(0, maxVisible) : normalized;
    const hiddenCount = Math.max(0, normalized.length - maxVisible);

    return (
      <div className={className}>
        {visibleThumbs.map((image, index) => {
          const isActive = image.id === active?.id;
          const showOverflowOverlay = hasOverflowThumbs && index === maxVisible - 1;
          return (
            <button
              key={`${maxVisible}-${image.id}`}
              type="button"
              onClick={() => {
                selectImage(image.id);
              }}
              onFocus={() => {
                selectImage(image.id);
              }}
              onMouseEnter={() => {
                selectImage(image.id);
              }}
              onMouseOver={() => {
                selectImage(image.id);
              }}
              onPointerEnter={() => {
                selectImage(image.id);
              }}
              onPointerOver={() => {
                selectImage(image.id);
              }}
              className={`relative aspect-square w-full min-w-0 shrink-0 overflow-hidden rounded-md border bg-zinc-100 transition-colors sm:rounded-lg lg:rounded-2xl lg:border-2 lg:hover:border-zinc-800 ${
                isActive ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-400"
              }`}
              aria-label={showOverflowOverlay ? `Xem ảnh ${image.altText}, còn ${hiddenCount} ảnh khác` : `Xem ảnh ${image.altText}`}
            >
              <MediaImage
                src={image.url}
                alt={image.altText}
                fallbackLabel={productName}
                fill
                sizes="(max-width: 640px) 20vw, (max-width: 1024px) 14vw, 8vw"
                className="object-cover"
              />
              {showOverflowOverlay ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white sm:text-base">
                  +{hiddenCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <section
      className="space-y-3 xl:contents"
      aria-label="Hình ảnh sản phẩm"
    >
      <div
        className={`group relative aspect-[4/3] touch-pan-y select-none overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 md:rounded-xl xl:col-start-1 xl:row-start-1 xl:flex xl:h-full xl:min-h-0 xl:w-full xl:items-center xl:justify-center xl:aspect-auto xl:rounded-[28px] xl:border xl:bg-white xl:shadow-sm ${
          isDraggingMainImage ? "cursor-grabbing" : "cursor-grab"
        }`}
        draggable={false}
        onWheel={handleMainWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerCancel={resetPointerDrag}
        onPointerUp={handlePointerUp}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        <div className="absolute inset-0">
          <MediaImage
            src={active?.url ?? ""}
            alt={active?.altText ?? productName}
            fallbackLabel={productName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>
      </div>

      {showThumbnails ? (
        <div className="xl:col-start-1 xl:row-start-2 xl:h-[84px] xl:min-h-0">
          {renderThumbnailRow(5, "grid grid-cols-5 gap-2 overflow-hidden pb-1 sm:hidden")}
          {renderThumbnailRow(7, "hidden grid-cols-7 gap-2 overflow-hidden pb-1 sm:grid xl:hidden")}
          {renderThumbnailRow(8, "hidden h-full grid-cols-8 gap-2 overflow-hidden pb-1 xl:grid")}
        </div>
      ) : null}
    </section>
  );
}
