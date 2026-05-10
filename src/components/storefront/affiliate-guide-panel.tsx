"use client";

import Link from "next/link";

type AffiliateGuidePanelProps = {
  title: string;
  intro: string;
  steps: string[];
  guideUrl?: string;
  termsUrl?: string;
  supportZaloUrl?: string;
  /** Chuỗi từ cài đặt (fallback server khi API). */
  systemGuideContent?: string;
  /** Hiển thị quy định cố định (CTR affiliateCanBuy=false). */
  affiliateCanBuy?: boolean;
};

function policyLines(affiliateCanBuy: boolean): string[] {
  return [
    affiliateCanBuy
      ? "Nếu chương trình tắt quyền mua: không tự đặt mua trên website bằng tài khoản CTV."
      : "CTV không tự mua bằng tài khoản CTV (chế độ chỉ giới thiệu).",
    "Không spam link, không gửi tin quảng cáo gây phiền.",
    "Đơn hủy / không đủ điều kiện đối soát sẽ không được tính hoa hồng.",
    "Hoa hồng được duyệt khi đơn hoàn thành theo chính sách đối soát.",
  ];
}

export default function AffiliateGuidePanel({
  title,
  intro,
  steps,
  guideUrl = "",
  termsUrl = "",
  supportZaloUrl = "",
  systemGuideContent,
  affiliateCanBuy = true,
}: AffiliateGuidePanelProps): JSX.Element {
  const supportHref = (() => {
    const z = supportZaloUrl.trim();
    if (z) {
      try {
        const u = new URL(z);
        if (u.protocol === "http:" || u.protocol === "https:") return z;
      } catch {
        return "";
      }
    }
    return "";
  })();

  return (
    <section className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 min-w-0">
      <h4 className="text-base font-semibold text-[#0F172A]">{title}</h4>
      <p className="mt-1.5 text-sm text-[#64748B]">{intro}</p>

      {systemGuideContent?.trim() ? (
        <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Nội dung CTV</p>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#0F172A]">
            {systemGuideContent.trim()}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Quy định nhanh</p>
        <ul className="mt-2 list-disc space-y-1.5 break-words pl-4 text-sm text-[#0F172A]">
          {policyLines(affiliateCanBuy).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Các bước gợi ý</p>
        {steps.map((step, index) => (
          <article
            key={`guide-step-${index + 1}`}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">Bước {index + 1}</p>
            <p className="mt-1 text-sm text-[#0F172A]">{step}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {guideUrl ? (
          <Link
            href={guideUrl}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
          >
            Mở hướng dẫn
          </Link>
        ) : null}
        {termsUrl ? (
          <Link
            href={termsUrl}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
          >
            Xem điều khoản
          </Link>
        ) : null}
        {supportHref ? (
          <Link
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Liên hệ Zalo
          </Link>
        ) : null}
      </div>
    </section>
  );
}
