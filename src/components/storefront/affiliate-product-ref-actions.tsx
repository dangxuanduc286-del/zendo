"use client";

import { useMemo, useState } from "react";
import { resolveAffiliatePublicOrigin } from "../../lib/affiliate-public-origin";

function buildProductAffiliateUrl(slug: string, refCode: string): string | null {
  const s = slug.trim().replace(/^\/+|\/+$/g, "");
  const r = refCode.trim();
  if (!s || !r) return null;
  const origin = resolveAffiliatePublicOrigin();
  return `${origin}/san-pham/${s}?ref=${encodeURIComponent(r)}`;
}

export default function AffiliateProductRefActions({
  slug,
  refCode,
  layout = "row",
  copyButtonLabel = "Sao chép link sản phẩm",
  openButtonLabel = "Mở link sản phẩm",
}: {
  slug: string;
  refCode: string;
  layout?: "row" | "stack";
  copyButtonLabel?: string;
  openButtonLabel?: string;
}): JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const fullUrl = useMemo(() => buildProductAffiliateUrl(slug, refCode), [slug, refCode]);
  const wrapCls = layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  if (!fullUrl) return null;

  const onCopy = () => {
    setErr("");
    navigator.clipboard?.writeText(fullUrl).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => setErr("Không thể sao chép, vui lòng thử lại."),
    );
  };

  return (
    <div className="min-w-0">
      <div className={wrapCls}>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] sm:min-h-10"
        >
          {copyButtonLabel}
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs font-medium text-[#0F172A] sm:min-h-10"
        >
          {openButtonLabel}
        </a>
      </div>
      {copied ? <p className="mt-1.5 text-xs font-medium text-emerald-700">Đã sao chép.</p> : null}
      {err ? <p className="mt-1.5 text-xs font-medium text-rose-700">{err}</p> : null}
    </div>
  );
}
