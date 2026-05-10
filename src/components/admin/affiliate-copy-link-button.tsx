"use client";

import { useState } from "react";

type AffiliateCopyLinkButtonProps = {
  url: string;
};

export default function AffiliateCopyLinkButton({ url }: AffiliateCopyLinkButtonProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
    >
      {copied ? "Đã sao chép" : "Sao chép link giới thiệu"}
    </button>
  );
}
