"use client";

import { memo, useCallback, useMemo, useState } from "react";


function buildShareTargets(url: string): Array<{ key: string; label: string; href: string }> {
  const enc = encodeURIComponent(url);
  return [
    { key: "tiktok", label: "TikTok", href: `https://www.tiktok.com/upload?lang=vi` },
    { key: "fb", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { key: "messenger", label: "Messenger", href: `https://www.facebook.com/dialog/send?link=${enc}&app_id=0` },
    { key: "zalo", label: "Zalo", href: `https://zalo.me/share?url=${enc}` },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc}` },
  ];
}

export default memo(function AffiliateQuickShareButtons(props: { shareUrl: string; className?: string }): JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const url = props.shareUrl.trim();
  const targets = useMemo(() => (url ? buildShareTargets(url) : []), [url]);

  const onCopy = useCallback(() => {    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }, [url]);

  const onNativeShare = useCallback(() => {    if (typeof navigator === "undefined" || !navigator.share) return;
    void navigator.share({ title: "Zendo Affiliate", text: "Link giới thiệu", url }).catch(() => {});
  }, [url]);

  if (!url) return null;

  return (
    <div className={props.className ?? ""}>
      <div className="flex flex-wrap gap-1.5">
        {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
          <button
            type="button"
            onClick={onNativeShare}
            className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5 text-[11px] font-semibold text-[#1D4ED8]"
          >
            Chia sẻ…
          </button>
        ) : null}
        {targets.map((t) => (
          <a
            key={t.key}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            {t.label}
          </a>
        ))}
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1D4ED8]"
        >
          Copy link
        </button>
      </div>
      {copied ? <p className="mt-1 text-[11px] font-medium text-emerald-700">Đã sao chép.</p> : null}
    </div>
  );
});
