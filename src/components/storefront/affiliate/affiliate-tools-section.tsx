"use client";

import { memo, useCallback } from "react";
import { AffiliateToolCard } from "./affiliate-tool-card";
import { AFFILIATE_QUICK_ACTION_DEFS, tryNativeShare } from "./affiliate-quick-actions";
import { AFFILIATE_TOOLS_GRID, AFFILIATE_TOOL_URL_STRIP } from "./affiliate-tools-ui-tokens";

export type AffiliateToolsSectionProps = {
  referralUrl: string;
  onCopyLink: () => void;
  onNavigateShare: () => void;
  promoteHref?: string;
  copyCopied?: boolean;
  copyError?: string;
  showUrlStrip?: boolean;
  className?: string;
};

function AffiliateToolsSectionInner({
  referralUrl,
  onCopyLink,
  onNavigateShare,
  promoteHref = "/tai-khoan/affiliate/campaign",
  copyCopied = false,
  copyError = "",
  showUrlStrip = true,
  className = "",
}: AffiliateToolsSectionProps): JSX.Element {
  const url = referralUrl.trim();
  const copyDisabled = !url;

  const onShare = useCallback(() => {
    if (tryNativeShare(url)) return;
    onNavigateShare();
  }, [url, onNavigateShare]);

  const [copyDef, shareDef, promoDef] = AFFILIATE_QUICK_ACTION_DEFS;

  return (
    <section
      className={`min-w-0 ${className}`.trim()}
      aria-label="Công cụ CTV"
    >
      <div className={AFFILIATE_TOOLS_GRID} role="list">
        <div role="listitem" className="min-w-0">
          <AffiliateToolCard
            title={copyDef.title}
            subtitle={copyDef.subtitle}
            icon={copyDef.icon}
            onClick={onCopyLink}
            disabled={copyDisabled}
          />
        </div>
        <div role="listitem" className="min-w-0">
          <AffiliateToolCard
            title={shareDef.title}
            subtitle={shareDef.subtitle}
            icon={shareDef.icon}
            onClick={onShare}
            disabled={!url}
          />
        </div>
        <div role="listitem" className="min-w-0">
          <AffiliateToolCard
            title={promoDef.title}
            subtitle={promoDef.subtitle}
            icon={promoDef.icon}
            href={promoteHref}
          />
        </div>
      </div>

      {showUrlStrip && url ? (
        <p className={AFFILIATE_TOOL_URL_STRIP} title={url}>
          {url}
        </p>
      ) : null}
      {copyCopied ? (
        <p className="mt-2 text-[12px] font-medium text-emerald-700" role="status">
          Đã sao chép link giới thiệu
        </p>
      ) : null}
      {copyError ? (
        <p className="mt-2 text-[12px] font-medium text-rose-700" role="alert">
          {copyError}
        </p>
      ) : null}
    </section>
  );
}

export const AffiliateToolsSection = memo(AffiliateToolsSectionInner);
