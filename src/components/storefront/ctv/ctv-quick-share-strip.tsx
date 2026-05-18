"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  CTV_MOBILE_SHARE_BTN,
  CTV_MOBILE_SHARE_BTN_PRIMARY,
  CTV_MOBILE_SHARE_WRAP,
} from "./ctv-ui-tokens";

function buildShareTargets(url: string): Array<{ key: string; label: string; href: string }> {
  const enc = encodeURIComponent(url);
  return [
    { key: "tiktok", label: "TikTok", href: "https://www.tiktok.com/upload?lang=vi" },
    { key: "fb", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { key: "messenger", label: "Messenger", href: `https://www.facebook.com/dialog/send?link=${enc}&app_id=0` },
    { key: "zalo", label: "Zalo", href: `https://zalo.me/share?url=${enc}` },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc}` },
  ];
}

/** Chia sẻ nhanh — spacing Promax cho CTV mobile (không dùng ở buyer/admin). */
function CtvQuickShareStripInner({ shareUrl, className = "" }: { shareUrl: string; className?: string }): JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const url = shareUrl.trim();
  const targets = useMemo(() => (url ? buildShareTargets(url) : []), [url]);

  const onCopy = useCallback(() => {
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }, [url]);

  const onNativeShare = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    void navigator.share({ title: "Zendo Affiliate", text: "Link giới thiệu", url }).catch(() => {});
  }, [url]);

  if (!url) return null;

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className={CTV_MOBILE_SHARE_WRAP}>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
          <button type="button" onClick={onNativeShare} className={CTV_MOBILE_SHARE_BTN}>
            Chia sẻ…
          </button>
        ) : null}
        {targets.map((t) => (
          <a key={t.key} href={t.href} target="_blank" rel="noopener noreferrer" className={CTV_MOBILE_SHARE_BTN}>
            {t.label}
          </a>
        ))}
        <button type="button" onClick={onCopy} className={CTV_MOBILE_SHARE_BTN_PRIMARY}>
          Copy link
        </button>
      </div>
      {copied ? <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-700">Đã sao chép.</p> : null}
    </div>
  );
}

export const CtvQuickShareStrip = memo(CtvQuickShareStripInner);
