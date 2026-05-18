"use client";

import type { AffiliateSubTab } from "../../../lib/affiliate-account-dashboard-model";
import {
  CTV_SEGMENTED_ITEM,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_SEGMENTED_WRAP,
  CTV_TAB_IDLE_HOVER,
} from "./affiliate-ctv-account-ui-tokens";

type TabItem = { key: AffiliateSubTab; label: string };

export function AffiliateCtvSegmentedTabs({
  tabs,
  activeKey,
  onSelect,
  ariaLabel = "Điều hướng CTV",
}: {
  tabs: TabItem[];
  activeKey: AffiliateSubTab;
  onSelect: (key: AffiliateSubTab) => void;
  ariaLabel?: string;
}): JSX.Element {
  return (
    <nav aria-label={ariaLabel} className="min-w-0">
      <div className={CTV_SEGMENTED_WRAP} role="tablist">
        {tabs.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item.key)}
              className={`${CTV_SEGMENTED_ITEM} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/40 ${
                active ? CTV_SEGMENTED_ITEM_ACTIVE : CTV_TAB_IDLE_HOVER
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
