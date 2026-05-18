"use client";

import { memo, type ReactNode } from "react";
import { CTV_MOBILE_PAGE } from "./ctv-ui-tokens";

type CtvMobilePageShellProps = {
  children: ReactNode;
  className?: string;
};

/** Bọc nội dung tab CTV — containment + padding đáy cho bottom nav mobile. */
function CtvMobilePageShellInner({ children, className = "" }: CtvMobilePageShellProps): JSX.Element {
  return <div className={`${CTV_MOBILE_PAGE} ${className}`.trim()}>{children}</div>;
}

export const CtvMobilePageShell = memo(CtvMobilePageShellInner);
