"use client";

import { memo, type ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { CTV_V2_LABEL } from "../ctv-ui-tokens";
import { CTV_MOTION_CLASS } from "../ctv-motion-tokens";

type CtvDataStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

function wrap(className: string, children: ReactNode): JSX.Element {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[20px] border border-black/[0.04] bg-gradient-to-br from-slate-50/90 to-white px-6 py-12 text-center shadow-[0_6px_20px_rgba(0,0,0,0.03)] ${className}`}
      role="status"
    >
      {children}
    </div>
  );
}

function CtvDataLoadingInner({ title = "Đang tải dữ liệu…", description, className = "" }: Partial<CtvDataStateProps>): JSX.Element {
  return wrap(className, (
    <>
      <Loader2 className={`h-9 w-9 text-emerald-500/70 ${CTV_MOTION_CLASS.base} animate-spin`} aria-hidden />
      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p> : null}
    </>
  ));
}

function CtvDataEmptyInner({ title, description, action, className = "" }: CtvDataStateProps): JSX.Element {
  return wrap(className, (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </>
  ));
}

function CtvDataErrorInner({ title, description, action, className = "" }: CtvDataStateProps): JSX.Element {
  return wrap(className, (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <AlertCircle className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-xs leading-relaxed text-rose-600/90">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </>
  ));
}

function CtvDataSectionLabelInner({ children }: { children: ReactNode }): JSX.Element {
  return <p className={CTV_V2_LABEL}>{children}</p>;
}

export const CtvDataLoading = memo(CtvDataLoadingInner);
export const CtvDataEmpty = memo(CtvDataEmptyInner);
export const CtvDataError = memo(CtvDataErrorInner);
export const CtvDataSectionLabel = memo(CtvDataSectionLabelInner);
