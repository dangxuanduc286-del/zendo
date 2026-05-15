"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  adminCardBody,
  adminPageSubtitle,
  adminPageTitle,
  adminTableShell,
} from "@/lib/admin-ui";

export function AdminCard({ className, children }: { className?: string; children: ReactNode }): ReactElement {
  return <div className={cn(adminCardBody, className)}>{children}</div>;
}

export function AdminSection({
  title,
  description,
  className,
  children,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className={cn(adminCardBody, "space-y-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3", adminCardBody, className)}>
      <div className="min-w-0 space-y-1">
        <h1 className={adminPageTitle}>{title}</h1>
        {subtitle ? <p className={adminPageSubtitle}>{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

export function AdminTableWrap({ className, children }: { className?: string; children: ReactNode }): ReactElement {
  return <div className={cn(adminTableShell, className)}>{children}</div>;
}
