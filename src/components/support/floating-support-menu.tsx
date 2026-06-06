"use client";

import Image from "next/image";
import { Phone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  resolveSupportContactConfig,
  type PublicSupportAudience,
  type RoleSupportConfig,
} from "@/lib/support-contact-config";
import { Z_INDEX } from "@/lib/z-index";

function BrandIcon({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}): JSX.Element {
  return (
    <Image
      src={src}
      alt={alt}
      aria-hidden
      className={className}
      width={22}
      height={22}
      priority={false}
      decoding="async"
      draggable={false}
      unoptimized
    />
  );
}

type SupportAction = {
  key: "phone" | "facebook" | "zalo";
  label: string;
  ariaLabel: string;
  trackingEvent: "click_phone" | "click_facebook" | "click_zalo";
  href: string;
  external?: boolean;
  icon: JSX.Element;
  className: string;
};

export default function FloatingSupportMenu({
  supportConfig,
  supportAudience,
}: {
  supportConfig: RoleSupportConfig;
  supportAudience: PublicSupportAudience;
}): JSX.Element | null {
  const [compactOnScroll, setCompactOnScroll] = useState(false);
  const lastScrollYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const resolved = useMemo(
    () => resolveSupportContactConfig(supportConfig, supportAudience),
    [supportConfig, supportAudience],
  );

  const actions = useMemo<SupportAction[]>(
    () => {
      const items: SupportAction[] = [];
      if (resolved.telHref) {
        items.push({
          key: "phone",
          label: "Gọi hotline",
          ariaLabel: "Gọi hotline",
          trackingEvent: "click_phone",
          href: resolved.telHref,
          icon: <Phone className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />,
          className:
            "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)] hover:bg-emerald-600 hover:shadow-[0_14px_30px_rgba(16,185,129,0.36)]",
        });
      }
      if (resolved.facebook) {
        items.push({
          key: "facebook",
          label: "Facebook",
          ariaLabel: "Liên hệ Facebook",
          trackingEvent: "click_facebook",
          href: resolved.facebook,
          external: true,
          icon: <BrandIcon src="/icons/facebook.svg" alt="" className="h-[22px] w-[22px]" />,
          className:
            "bg-[#1877F2] text-white shadow-[0_10px_24px_rgba(24,119,242,0.28)] hover:bg-[#166FE5] hover:shadow-[0_14px_30px_rgba(24,119,242,0.36)]",
        });
      }
      if (resolved.zalo) {
        items.push({
          key: "zalo",
          label: "Zalo",
          ariaLabel: "Chat Zalo",
          trackingEvent: "click_zalo",
          href: resolved.zalo,
          external: true,
          icon: <BrandIcon src="/icons/zalo.svg" alt="" className="h-12 w-12 sm:h-[52px] sm:w-[52px]" />,
          className: "bg-transparent text-white hover:bg-transparent",
        });
      }
      return items;
    },
    [resolved],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastScrollYRef.current = window.scrollY;

    const onScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const isMobileViewport = window.innerWidth < 640;
        const shouldCompact = isMobileViewport && currentY > 120 && currentY > lastScrollYRef.current;

        setCompactOnScroll((current) => (current === shouldCompact ? current : shouldCompact));
        lastScrollYRef.current = currentY;
        rafIdRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafIdRef.current !== null) window.cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const trackSupportAction = useCallback((action: SupportAction) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("zendo:support-action-click", {
        detail: {
          action: action.trackingEvent,
          channel: action.key,
          href: action.href,
        },
      }),
    );
  }, []);

  if (actions.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed right-[var(--z-floating-support-right-mobile,1rem)] bottom-[calc(var(--z-floating-support-bottom-mobile,5.25rem)+env(safe-area-inset-bottom))] flex flex-col items-end gap-2.5 transition duration-200 ease-out sm:right-[var(--z-floating-support-right-desktop,1.5rem)] sm:bottom-[var(--z-floating-support-bottom-desktop,1.5rem)] sm:gap-3 ${
        compactOnScroll ? "opacity-80 scale-95" : "opacity-100 scale-100"
      }`}
      style={{ zIndex: Z_INDEX.floatingSupport }}
      aria-label={resolved.title}
    >
      {actions.map((action, index) => (
        <a
          key={action.key}
          href={action.href}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noopener noreferrer" : undefined}
          aria-label={action.ariaLabel}
          title={action.label}
          data-support-action={action.trackingEvent}
          onClick={() => trackSupportAction(action)}
          className={`group pointer-events-auto relative inline-flex h-12 min-h-12 w-12 min-w-12 items-center justify-center rounded-full transition duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 active:scale-95 motion-safe:animate-[support-action-in_240ms_ease-out_both] sm:h-[52px] sm:w-[52px] ${
            action.key === "zalo" ? "" : "ring-1 ring-white/50 backdrop-blur-sm"
          } ${action.className}`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="sr-only">{action.ariaLabel}</span>
          {action.icon}
          <span className="pointer-events-none absolute right-[calc(100%+0.625rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
            {action.label}
          </span>
        </a>
      ))}

      <style jsx global>{`
        @keyframes support-action-in {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
