"use client";

import { memo } from "react";
import type { AffiliateSubTab } from "@/lib/affiliate-account-dashboard-model";
import { CTV_MOTION_CLASS } from "./ctv-motion-tokens";
import {
  CTV_MOBILE_SAFE,
  CTV_TAB_IDLE_HOVER,
  CTV_V2_SEGMENTED_ITEM,
  CTV_V2_SEGMENTED_ITEM_ACTIVE,
  CTV_V2_SEGMENTED_WRAP,
} from "./ctv-ui-tokens";

type TabItem = { key: AffiliateSubTab; label: string };

type CtvSegmentedTabsProps = {
  tabs: TabItem[];
  activeKey: AffiliateSubTab;
  onSelect: (key: AffiliateSubTab) => void;
  ariaLabel?: string;
};

function CtvSegmentedTabsInner({
  tabs,
  activeKey,
  onSelect,
  ariaLabel = "Điều hướng CTV",
}: CtvSegmentedTabsProps): JSX.Element {
  return (
    <nav aria-label={ariaLabel} className={`${CTV_MOBILE_SAFE} min-w-0`}>
      <div className={CTV_V2_SEGMENTED_WRAP} role="tablist">
        {tabs.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`ctv-panel-${item.key}`}
              id={`ctv-tab-${item.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item.key)}
              className={`${CTV_V2_SEGMENTED_ITEM} ${CTV_MOTION_CLASS.tab} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/40 ${
                active ? CTV_V2_SEGMENTED_ITEM_ACTIVE : CTV_TAB_IDLE_HOVER
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const CtvSegmentedTabs = memo(CtvSegmentedTabsInner);
