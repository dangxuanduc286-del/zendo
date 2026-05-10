"use client";

import { memo, useMemo, useRef, useState } from "react";
import StorefrontBannerImage from "./storefront-banner-image";

export type HomeHeroMobileBannerItem = {
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  title?: string;
  altText?: string;
  subtitle?: string;
  mobileImageFit?: "contain" | "cover";
  mobileObjectPosition?: string;
};

function HomeHeroMobileCarousel({
  banners,
}: {
  banners: HomeHeroMobileBannerItem[];
}): JSX.Element {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const safe = useMemo(() => banners.filter((b) => Boolean(b.imageUrl)).slice(0, 8), [banners]);
  const [index, setIndex] = useState(0);

  function onScroll(): void {
    const el = trackRef.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    const w = child?.offsetWidth ?? 1;
    const next = Math.round(el.scrollLeft / w);
    if (Number.isFinite(next)) setIndex(Math.max(0, Math.min(safe.length - 1, next)));
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Banner khuyến mãi"
      >
        {safe.map((b, i) => {
          const mobileFit: "contain" | "cover" = b.mobileImageFit === "cover" ? "cover" : "contain";
          return (
            <div
              key={`${b.imageUrl}-${i}`}
              className="min-w-full max-w-full shrink-0 flex-[0_0_100%] snap-start snap-always"
            >
              <StorefrontBannerImage
                chrome="frame"
                src={b.mobileImageUrl || b.imageUrl}
                href={b.link || ""}
                alt={b.altText?.trim() || b.title?.trim() || "Banner Zendo"}
                sizes="(max-width: 640px) 100vw, 640px"
                className="relative aspect-[1644/658] w-full max-w-full overflow-hidden"
                imageFit={mobileFit}
                objectPosition={b.mobileObjectPosition || "center center"}
                quality={80}
                wrapperBgClassName="bg-white"
                priority={i === 0}
              />
            </div>
          );
        })}
      </div>
      {safe.length > 1 ? (
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5"
          aria-hidden
        >
          {safe.map((_, i) => (
            <span
              key={`dot-${i}`}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === index ? "bg-[#2563EB]" : "bg-[#E2E8F0]"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(HomeHeroMobileCarousel);
