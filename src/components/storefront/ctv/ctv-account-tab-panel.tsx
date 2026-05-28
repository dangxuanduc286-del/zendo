"use client";

import { memo, type ReactNode } from "react";
import { AccountPageTabPanel, type AccountPageTabPanelProps } from "../account-page-tab-panel";

type CtvAccountTabPanelProps = AccountPageTabPanelProps & {
  toolbar?: ReactNode;
};

/** Panel tab CTV — wrapper `AccountPageTabPanel` (SSOT content start). */
function CtvAccountTabPanelInner(props: CtvAccountTabPanelProps): JSX.Element {
  return <AccountPageTabPanel {...props} />;
}

export const CtvAccountTabPanel = memo(CtvAccountTabPanelInner);
