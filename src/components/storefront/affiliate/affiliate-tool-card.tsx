"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import {
  AFFILIATE_TOOL_CARD,
  AFFILIATE_TOOL_ICON_WRAP,
  AFFILIATE_TOOL_SUBTITLE,
  AFFILIATE_TOOL_TITLE,
} from "./affiliate-tools-ui-tokens";

export type AffiliateToolCardProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  className?: string;
};

function CardInner({ icon: Icon, title, subtitle }: Pick<AffiliateToolCardProps, "icon" | "title" | "subtitle">): JSX.Element {
  return (
    <>
      <span className={AFFILIATE_TOOL_ICON_WRAP} aria-hidden>
        <Icon className="h-[22px] w-[22px] lg:h-6 lg:w-6" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 pr-1">
        <span className={`${AFFILIATE_TOOL_TITLE} block`}>{title}</span>
        {subtitle ? <span className={AFFILIATE_TOOL_SUBTITLE}>{subtitle}</span> : null}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500"
        aria-hidden
      />
    </>
  );
}

export function AffiliateToolCard({
  title,
  subtitle,
  icon,
  onClick,
  href,
  external = false,
  disabled = false,
  className = "",
}: AffiliateToolCardProps): JSX.Element {
  const shell = `${AFFILIATE_TOOL_CARD} ${className}`.trim();

  if (href && !disabled) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={shell}
          aria-label={subtitle ? `${title} — ${subtitle}` : title}
        >
          <CardInner icon={icon} title={title} subtitle={subtitle} />
        </a>
      );
    }
    return (
      <Link href={href} prefetch={false} className={shell} aria-label={subtitle ? `${title} — ${subtitle}` : title}>
        <CardInner icon={icon} title={title} subtitle={subtitle} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={shell}
      aria-label={subtitle ? `${title} — ${subtitle}` : title}
    >
      <CardInner icon={icon} title={title} subtitle={subtitle} />
    </button>
  );
}
