"use client";

import Link from "next/link";
import type { PolicyHubCard } from "../../lib/site-policy-public";
import { sitePolicyTypeIcon } from "../../lib/site-policy-public";

export default function AccountPolicyHubPanel(props: {
  orderLookupHref: string;
  orderLookupDescription?: string;
  policyCards: PolicyHubCard[];
  legacyWarrantyHref?: string;
  legacyReturnHref?: string;
  zaloHref?: string | null;
  showLegacyWarranty: boolean;
  showLegacyReturn: boolean;
}): JSX.Element {
  const {
    orderLookupHref,
    orderLookupDescription,
    policyCards,
    legacyWarrantyHref,
    legacyReturnHref,
    zaloHref,
    showLegacyWarranty,
    showLegacyReturn,
  } = props;

  const zaloIsHttp = typeof zaloHref === "string" && /^https?:\/\//i.test(zaloHref.trim());

  const cards = [
    {
      key: "lookup-order",
      href: orderLookupHref,
      icon: "📦",
      title: "Tra cứu đơn hàng",
      description:
        orderLookupDescription ||
        "Kiểm tra trạng thái và tiến trình đơn bằng mã đơn, email hoặc số điện thoại.",
      external: /^https?:\/\//i.test(orderLookupHref),
    },
    ...policyCards.map((p) => ({
      key: `policy-${p.slug}`,
      href: p.href,
      icon: sitePolicyTypeIcon(p.type),
      title: p.title,
      description: p.excerpt || "Xem chi tiết chính sách và hướng dẫn.",
      external: false as boolean,
    })),
    ...(showLegacyWarranty && legacyWarrantyHref
      ? [
          {
            key: "legacy-warranty",
            href: legacyWarrantyHref,
            icon: "🛠️",
            title: "Tra cứu bảo hành (liên kết mở rộng)",
            description: "Liên kết bổ sung từ cài đặt cửa hàng.",
            external: /^https?:\/\//i.test(legacyWarrantyHref),
          },
        ]
      : []),
    ...(showLegacyReturn && legacyReturnHref
      ? [
          {
            key: "legacy-return",
            href: legacyReturnHref,
            icon: "📮",
            title: "Yêu cầu đổi trả (liên kết mở rộng)",
            description: "Form hoặc trang đổi trả được cấu hình trong quản trị.",
            external: /^https?:\/\//i.test(legacyReturnHref),
          },
        ]
      : []),
    ...(zaloIsHttp
      ? [
          {
            key: "zalo",
            href: zaloHref!.trim(),
            icon: "💬",
            title: "Liên hệ Zalo",
            description: "Nhận phản hồi nhanh từ đội hỗ trợ.",
            external: true,
          },
        ]
      : []),
  ];

  return (
    <section
      id="tra-cuu-chinh-sach"
      className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6"
    >
      <h3 className="text-base font-semibold text-[#0F172A]">Tra cứu &amp; chính sách</h3>
      <p className="mt-1 text-sm text-[#64748B]">
        Trung tâm trợ giúp: tra cứu đơn, chính sách bảo hành / đổi trả và (nếu có) quy định dành cho CTV.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex min-h-[120px] flex-col rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-white to-[#F8FAFC] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none" aria-hidden>
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0F172A] group-hover:text-[#2563EB]">{c.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{c.description}</p>
              </div>
            </div>
            <span className="mt-3 text-xs font-semibold text-[#2563EB] opacity-0 transition group-hover:opacity-100">
              Mở →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
