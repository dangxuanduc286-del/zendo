"use client";

import { BadgeCheck, Sparkles } from "lucide-react";
import { memo } from "react";
import { CTV_V2_ROLE_BADGE, CTV_V2_VERIFIED_INLINE } from "./ctv-ui-tokens";

type CtvRoleBadgeProps = {
  badge: string;
  isCtv?: boolean;
  className?: string;
};

function CtvRoleBadgeInner({ badge, isCtv, className = "" }: CtvRoleBadgeProps): JSX.Element | null {
  const label = (badge || "CTV").trim();
  if (!label) return null;

  const ctvStyle = isCtv ?? label.toUpperCase().includes("CTV");

  if (ctvStyle) {
    return (
      <span
        className={`${CTV_V2_ROLE_BADGE} ${className}`}
        title="Cộng tác viên Zendo"
        aria-label={`Hạng tài khoản: ${label}`}
      >
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[8px] bg-white/20 sm:h-5 sm:w-5 sm:rounded-[9px]"
          aria-hidden
        >
          <Sparkles className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" strokeWidth={2.25} />
        </span>
        <span className="leading-none">{label.toUpperCase() === "CTV" ? "CTV" : label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-8 shrink-0 items-center rounded-[12px] bg-slate-100 px-2.5 text-[12px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/90 sm:h-9 sm:text-[13px] ${className}`}
      aria-label={`Hạng: ${label}`}
    >
      {label}
    </span>
  );
}

export const CtvRoleBadge = memo(CtvRoleBadgeInner);

type CtvVerifiedBadgeProps = {
  className?: string;
  label?: string;
};

function CtvVerifiedBadgeInner({
  className = "",
  label = "Số điện thoại đã xác minh",
}: CtvVerifiedBadgeProps): JSX.Element {
  return (
    <span className={`${CTV_V2_VERIFIED_INLINE} ${className}`} title={label} aria-label={label}>
      <BadgeCheck
        className="h-[15px] w-[15px] fill-[#2563eb] text-white sm:h-4 sm:w-4"
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
}

export const CtvVerifiedBadge = memo(CtvVerifiedBadgeInner);
