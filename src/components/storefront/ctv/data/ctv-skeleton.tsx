"use client";

import { memo } from "react";
import { CTV_V2_INSET } from "../ctv-ui-tokens";

const PULSE = "animate-pulse rounded-lg bg-slate-200/70";

export function CtvSkeletonLine({ className = "h-3 w-24" }: { className?: string }): JSX.Element {
  return <div className={`${PULSE} ${className}`} aria-hidden />;
}

function CtvMetricCardSkeletonInner(): JSX.Element {
  return (
    <div className={`${CTV_V2_INSET} min-h-[5.5rem] space-y-3 rounded-[18px] lg:min-h-[8rem]`} aria-hidden>
      <CtvSkeletonLine className="h-2.5 w-20" />
      <CtvSkeletonLine className="h-7 w-28" />
      <CtvSkeletonLine className="h-2 w-32" />
    </div>
  );
}

function CtvMetricGridSkeletonInner({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <div
      className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      aria-busy="true"
      aria-label="Đang tải số liệu"
    >
      {Array.from({ length: count }, (_, i) => (
        <CtvMetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

function CtvTableSkeletonInner({ rows = 4 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Đang tải bảng">
      <CtvSkeletonLine className="h-8 w-full rounded-xl" />
      {Array.from({ length: rows }, (_, i) => (
        <CtvSkeletonLine key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

function CtvPanelSkeletonInner(): JSX.Element {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải nội dung">
      <CtvSkeletonLine className="h-4 w-40" />
      <CtvSkeletonLine className="h-10 w-full rounded-xl" />
      <CtvSkeletonLine className="h-24 w-full rounded-xl" />
    </div>
  );
}

export const CtvMetricCardSkeleton = memo(CtvMetricCardSkeletonInner);
export const CtvMetricGridSkeleton = memo(CtvMetricGridSkeletonInner);
export const CtvTableSkeleton = memo(CtvTableSkeletonInner);
export const CtvPanelSkeleton = memo(CtvPanelSkeletonInner);
