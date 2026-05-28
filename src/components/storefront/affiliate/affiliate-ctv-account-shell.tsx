"use client";

import { memo, type ReactNode } from "react";
import { AffiliateCtvAccountTwoColumnLayout } from "./affiliate-ctv-account-two-column-layout";

type AffiliateCtvAccountShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  contentId?: string;
  /** Banner / toast slot chung — không gắn theo tab (tránh lệch content Y). */
  topSlot?: ReactNode;
};

/** Desktop CTV account: sidebar cố định trái | content phải theo tab. */
function AffiliateCtvAccountShellInner({
  sidebar,
  children,
  contentId,
  topSlot,
}: AffiliateCtvAccountShellProps): JSX.Element {
  return (
    <AffiliateCtvAccountTwoColumnLayout contentId={contentId} sidebar={sidebar}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:gap-5">
        {topSlot}
        {children}
      </div>
    </AffiliateCtvAccountTwoColumnLayout>
  );
}

export const AffiliateCtvAccountShell = memo(AffiliateCtvAccountShellInner);
