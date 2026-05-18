"use client";

import type { AffiliateCommissionStatus } from "@prisma/client";
import { affiliateCommissionStatusLabel } from "@/lib/affiliate/commission-hold";

const STATUS_BADGE_CLASS: Record<AffiliateCommissionStatus, string> = {
  PENDING: "bg-amber-50 text-amber-900 ring-amber-200/80",
  APPROVED: "bg-blue-50 text-blue-800 ring-blue-200/80",
  WAITING_RELEASE: "bg-cyan-50 text-cyan-900 ring-cyan-200/80",
  AVAILABLE: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  PAID: "bg-indigo-50 text-indigo-900 ring-indigo-200/80",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-200/80",
};

type AffiliateCommissionStatusBadgeProps = {
  status: AffiliateCommissionStatus | string;
  label?: string;
  className?: string;
};

export function AffiliateCommissionStatusBadge({
  status,
  label,
  className = "",
}: AffiliateCommissionStatusBadgeProps): JSX.Element {
  const key = String(status).toUpperCase() as AffiliateCommissionStatus;
  const badgeClass = STATUS_BADGE_CLASS[key] ?? "bg-slate-100 text-slate-700 ring-slate-200/80";
  const text = label ?? affiliateCommissionStatusLabel(key);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-snug ring-1 sm:text-[11px] ${badgeClass} ${className}`}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
