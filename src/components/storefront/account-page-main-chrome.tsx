"use client";

import type { ReactNode } from "react";
import { AffiliateCtvAccountShell } from "./affiliate/affiliate-ctv-account-shell";

/** Wrapper ngoài shell — đồng bộ `/tai-khoan` và `/tai-khoan/affiliate/*`. */
export const ACCOUNT_PAGE_MAIN_CHROME_CLASS =
  "w-full min-w-0 max-w-none space-y-4 overflow-x-hidden bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] px-0 py-1 sm:space-y-5 lg:py-2";

export function AccountPageMainChrome({
  drawer,
  topSlot,
  sidebar,
  children,
  contentId,
}: {
  drawer: ReactNode;
  topSlot?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  contentId: string;
}): JSX.Element {
  return (
    <div className={ACCOUNT_PAGE_MAIN_CHROME_CLASS}>
      {drawer}
      <AffiliateCtvAccountShell contentId={contentId} sidebar={sidebar} topSlot={topSlot}>
        {children}
      </AffiliateCtvAccountShell>
    </div>
  );
}
