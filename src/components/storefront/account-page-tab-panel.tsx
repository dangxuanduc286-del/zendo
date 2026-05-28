"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AccountPageHeader, type AccountPageHeaderProps } from "./account-page-header";
import { ACCOUNT_PAGE_CONTENT_START, ACCOUNT_PAGE_HEADER } from "./account-page-header-tokens";

export type AccountPageTabPanelProps = Omit<AccountPageHeaderProps, "bordered" | "className"> & {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Panel tab `/tai-khoan` — shell + header 80px + content start SSOT. */
function AccountPageTabPanelInner({
  children,
  className = "",
  contentClassName = "",
  headingLevel = "h2",
  ...headerProps
}: AccountPageTabPanelProps): JSX.Element {
  const headingId = headerProps.id ? `${headerProps.id}-title` : undefined;

  return (
    <section
      id={headerProps.id}
      className={cn(ACCOUNT_PAGE_HEADER.panelShell, "flex flex-col", className)}
      aria-labelledby={headingId}
    >
      <AccountPageHeader {...headerProps} bordered={false} headingLevel={headingLevel} />
      <div data-account-page-content="" className={cn(ACCOUNT_PAGE_CONTENT_START, "shrink-0", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export const AccountPageTabPanel = memo(AccountPageTabPanelInner);
