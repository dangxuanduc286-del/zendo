"use client";

import { memo, type ReactNode } from "react";
import {
  CTV_LAYOUT_GRID,
  CTV_MAIN_STACK,
  CTV_SIDEBAR_ASIDE,
  CTV_SIDEBAR_SHELL,
} from "./affiliate-ctv-account-ui-tokens";
import { CTV_V2_LAYOUT_SHELL } from "../ctv/ctv-ui-tokens";

type AffiliateCtvAccountTwoColumnLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
  contentId?: string;
};

/**
 * Desktop: sidebar trái vừa khít menu (h-fit) | profile + tab + nội dung phải.
 */
function AffiliateCtvAccountTwoColumnLayoutInner({
  sidebar,
  children,
  contentId,
}: AffiliateCtvAccountTwoColumnLayoutProps): JSX.Element {
  return (
    <section aria-label="Bố cục tài khoản CTV" className={`${CTV_V2_LAYOUT_SHELL} ${CTV_LAYOUT_GRID}`}>
      <aside className={CTV_SIDEBAR_ASIDE}>
        <div className={CTV_SIDEBAR_SHELL}>{sidebar}</div>
      </aside>
      <main id={contentId} className={CTV_MAIN_STACK}>
        {children}
      </main>
    </section>
  );
}

export const AffiliateCtvAccountTwoColumnLayout = memo(AffiliateCtvAccountTwoColumnLayoutInner);
