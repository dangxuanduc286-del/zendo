"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCOUNT_PAGE_CONTENT_START, ACCOUNT_PAGE_HEADER } from "./account-page-header-tokens";

export type AccountPageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Icon tile (analytics, campaign, …). */
  icon?: ReactNode;
  toolbar?: ReactNode;
  /** Viền dưới (dashboard / route phụ). */
  bordered?: boolean;
  headingLevel?: "h1" | "h2";
  id?: string;
  className?: string;
};

function AccountPageHeaderInner({
  title,
  description,
  icon,
  toolbar,
  bordered = true,
  headingLevel = "h1",
  id,
  className = "",
}: AccountPageHeaderProps): JSX.Element {
  const Heading = headingLevel;
  const headingId = id ? `${id}-title` : undefined;

  return (
    <header
      data-account-page-header=""
      className={cn(
        ACCOUNT_PAGE_HEADER.wrap,
        bordered ? ACCOUNT_PAGE_HEADER.wrapBordered : "",
        "shrink-0",
        className,
      )}
    >
      <div className={ACCOUNT_PAGE_HEADER.row}>
        <div className={ACCOUNT_PAGE_HEADER.lead}>
          {icon ? <span className={ACCOUNT_PAGE_HEADER.icon}>{icon}</span> : null}
          <div className={ACCOUNT_PAGE_HEADER.copy}>
            <Heading id={headingId} className={ACCOUNT_PAGE_HEADER.title}>
              {title}
            </Heading>
            {description ? <p className={ACCOUNT_PAGE_HEADER.description}>{description}</p> : null}
          </div>
        </div>
        {toolbar ? <div className={ACCOUNT_PAGE_HEADER.toolbar}>{toolbar}</div> : null}
      </div>
    </header>
  );
}

export const AccountPageHeader = memo(AccountPageHeaderInner);

/** @deprecated Dùng `AccountPageTabPanel` hoặc `ACCOUNT_PAGE_CONTENT_START` trực tiếp. */
export function AccountPageContentStart({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div data-account-page-content="" className={cn(ACCOUNT_PAGE_CONTENT_START, className)}>
      {children}
    </div>
  );
}
