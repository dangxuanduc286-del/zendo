"use client";

import Link from "next/link";
import { memo, useMemo, useRef, useState } from "react";
import MediaImage from "../shared/media-image";
import { resolveMediaUrl } from "../../lib/media";

export interface BannerSlide {
  id: string;
  title: string;
  altText?: string;
  imageUrl: string;
  targetUrl?: string | null;
  imageFit?: "contain" | "cover";
  objectPosition?: string;
}

/** Chỉ layout; object-fit khóa bằng style inline để không bị class/global ghi đè. */
function heroImageLayoutClassName(): string {
  return "absolute inset-0 h-full w-full";
}

interface BannerSliderProps {
  banners: BannerSlide[];
}

function BannerSlider({ banners }: BannerSliderProps): JSX.Element | null {
  const slides = useMemo(
    () =>
      banners.map((banner) => ({
        ...banner,
        imageUrl: resolveMediaUrl(banner.imageUrl),
      })),
    [banners],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  if (!slides.length) return null;
  const current = slides[Math.min(activeIndex, slides.length - 1)];
  const href = current.targetUrl || "#";
  const goPrev = () => setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  const goNext = () => setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const fit: "contain" | "cover" = current.imageFit === "cover" ? "cover" : "contain";
  const objectPosition = (current.objectPosition || "center center").trim() || "center center";

  return (
    <section className="relative">
      <div
        className={`relative aspect-[1644/658] w-full overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm ${
          fit === "contain" ? "bg-white" : ""
        }`}
        onTouchStart={(event) => {
          touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          const endX = event.changedTouches[0]?.clientX ?? null;
          if (startX == null || endX == null) return;
          const delta = endX - startX;
          if (Math.abs(delta) < 40) return;
          if (delta > 0) goPrev();
          else goNext();
        }}
      >
        <Link href={href} className="relative block h-full w-full">
          <MediaImage
            src={current.imageUrl}
            alt={current.altText?.trim() || current.title}
            fill
            priority={activeIndex === 0}
            quality={90}
            sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 960px, 1200px"
            fallbackLabel="Banner"
            className={heroImageLayoutClassName()}
            style={{
              objectFit: fit === "cover" ? "cover" : "contain",
              objectPosition,
            }}
          />
        </Link>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/70"
              aria-label="Banner truoc"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/70"
              aria-label="Banner sau"
            >
              ›
            </button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/35 px-2 py-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Đi tới banner ${index + 1}`}
                  className={`h-1.5 w-4 rounded-full transition ${
                    index === activeIndex ? "bg-white" : "bg-white/40 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export default memo(BannerSlider);
