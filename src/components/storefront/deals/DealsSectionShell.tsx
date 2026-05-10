"use client";

import type { CSSProperties, ReactNode } from "react";

function presetBackground(preset?: string): string | undefined {
  switch (preset) {
    case "flash-sale":
      return "linear-gradient(135deg, rgba(255,241,242,1) 0%, rgba(255,255,255,1) 45%, rgba(255,247,237,1) 100%)";
    case "dark-sale":
      return "linear-gradient(135deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 55%, rgba(2,6,23,1) 100%)";
    case "luxury":
      return "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 55%, rgba(15,23,42,1) 100%)";
    case "tet":
      return "linear-gradient(135deg, rgba(254,242,242,1) 0%, rgba(255,255,255,1) 45%, rgba(254,243,199,1) 100%)";
    case "neon":
      return "linear-gradient(135deg, rgba(236,253,245,1) 0%, rgba(255,255,255,1) 45%, rgba(224,231,255,1) 100%)";
    case "minimal":
      return "rgba(248,250,252,1)";
    default:
      return undefined;
  }
}

export default function DealsSectionShell({
  sectionId,
  sectionType,
  productSource,
  campaignState,
  campaignId,
  experimentId,
  variantId,
  themeBackground,
  themePreset,
  children,
}: {
  sectionId: string;
  sectionType: string;
  productSource?: string;
  campaignState?: string;
  campaignId?: string;
  experimentId?: string;
  variantId?: string;
  themeBackground?: string;
  themePreset?: string;
  children: ReactNode;
}): JSX.Element {
  const presetBg = presetBackground(themePreset);
  const bg = themeBackground?.trim() ? themeBackground.trim() : presetBg;
  const style: CSSProperties | undefined = bg ? { background: bg } : undefined;
  return (
    <section
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
      style={style}
      data-section-id={sectionId}
      data-section-type={sectionType}
      data-product-source={productSource || ""}
      data-campaign-state={campaignState || ""}
      data-campaign-id={campaignId || ""}
      data-experiment-id={experimentId || ""}
      data-variant-id={variantId || ""}
      data-theme-preset={themePreset || ""}
    >
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

