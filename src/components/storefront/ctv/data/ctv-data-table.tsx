"use client";

import { memo, type ReactNode } from "react";
import { CTV_MOTION_CLASS } from "../ctv-motion-tokens";
import { CTV_DS_RADIUS, CTV_DS_SHADOW } from "../ctv-ui-tokens";

export const CTV_TABLE_WRAP = [
  "box-border min-w-0 max-w-full overflow-x-auto overscroll-x-contain",
  "[contain:layout_paint]",
  CTV_DS_RADIUS,
  CTV_DS_SHADOW,
  "ring-1 ring-black/[0.05]",
].join(" ");

export const CTV_TABLE = "w-full min-w-[20rem] border-collapse text-left text-sm";

export const CTV_TABLE_HEAD =
  "sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]";

export const CTV_TABLE_TH = "break-words px-2.5 py-2.5 font-semibold max-lg:text-[10px] sm:px-4 sm:py-3";

export const CTV_TABLE_TD = "break-words px-2.5 py-2.5 align-middle text-[#1A1A1A] max-lg:text-xs sm:px-4 sm:py-3";

export const CTV_TABLE_ROW = `${CTV_MOTION_CLASS.row} border-t border-black/[0.05] first:border-t-0 hover:bg-slate-50/80`;

type CtvDataTableProps = {
  caption?: string;
  head: ReactNode;
  children: ReactNode;
  className?: string;
};

function CtvDataTableInner({ caption, head, children, className = "" }: CtvDataTableProps): JSX.Element {
  return (
    <div className={`${CTV_TABLE_WRAP} ${className}`}>
      <table className={CTV_TABLE}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className={CTV_TABLE_HEAD}>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const CTV_LIST_ROW = [
  CTV_DS_RADIUS,
  "border border-black/[0.05] bg-white p-4",
  CTV_DS_SHADOW,
  CTV_MOTION_CLASS.card,
  "hover:bg-slate-50/90",
].join(" ");

export const CtvDataTable = memo(CtvDataTableInner);
