import "server-only";

/** Trang RSC-only: `getServerSession` / DB fallback không được dùng từ client — không thêm `'use client'`. */
import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateApplicationForm } from "../../../../components/storefront/affiliate-application-form";
import { getServerSession } from "next-auth";
import { buildMetadata } from "../../../../lib/seo";
import type { WebsiteSettings } from "../../../../lib/settings";
import { getWebsiteSettings } from "../../../../lib/settings";
import { formatVnd } from "../../../../lib/currency";
import { authOptions } from "../../../../lib/auth";
import { resolveCustomerAffiliateActiveDb } from "../../../../lib/affiliate-customer-status";

export const metadata: Metadata = buildMetadata({
  title: "Đăng ký Cộng tác viên Zendo.vn | Kiếm hoa hồng Affiliate",
  description:
    "Tham gia chương trình cộng tác viên Zendo.vn, chia sẻ sản phẩm và nhận hoa hồng minh bạch từ các đơn hàng hợp lệ.",
  path: "/cong-tac-vien",
});

function CheckIcon(props: { className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" className="fill-emerald-100" />
      <path
        d="M8 12.27 10.71 14.93 17.43 8.53"
        className="stroke-emerald-700"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon(props: { className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v2M12 18v2M4 12h2m14 0h2M7.76 7.76l1.41 1.41m5.66 5.66 1.42 1.42M16.24 7.76l-1.41 1.41M8.93 14.82l-1.42 1.42"
        className="stroke-sky-700"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.8" className="fill-sky-200" />
    </svg>
  );
}

function sanitizeInternalHref(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (t.startsWith("/") && !t.startsWith("//")) return t.split("#")[0] || "/";
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return t;
  } catch {
    return null;
  }
  return null;
}

function normalizeTelHref(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("84")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:${digits}`;
  return `tel:0${digits}`;
}

/**
 * Sau đăng nhập khách (`role=USER`): `/tai-khoan` đọc `callbackUrl` (CustomerAuthCard), không dùng `redirect`.
 * Gợi ý kiểm thử: `/tai-khoan`, `/tai-khoan?callbackUrl=/cong-tac-vien`.
 */
const LOGIN_CTV_ELIGIBLE_RETURN = `/tai-khoan?callbackUrl=${encodeURIComponent("/cong-tac-vien")}`;
const LIEN_HE_PATH = "/lien-he";

function pickContactHref(website: WebsiteSettings): { href: string; label: string } {
  const acc = website.customerAccountSettings;
  const zalo = sanitizeInternalHref(acc?.supportZaloUrl);
  if (zalo) return { href: zalo, label: "Liên hệ Zalo hỗ trợ" };
  const messenger = sanitizeInternalHref(acc?.supportMessengerUrl);
  if (messenger) return { href: messenger, label: "Liên hệ Messenger" };
  const phoneHref = normalizeTelHref(acc?.supportPhone) ?? normalizeTelHref(website.hotline);
  if (phoneHref) return { href: phoneHref, label: "Gọi hotline cửa hàng" };
  const mail = website.email.trim();
  if (mail.includes("@")) return { href: `mailto:${mail}`, label: "Gửi email liên hệ" };
  return { href: "/tra-cuu-don-hang", label: "Tra cứu & hỗ trợ đơn" };
}

async function resolveVisitorCtvLane(params: {
  sessionUser?: { id: string; role?: string | null; affiliateActive?: boolean } | null;
}): Promise<"guest" | "ctv" | "customer_not_ctv" | "staff_other"> {
  const uid = params.sessionUser?.id;
  const role = typeof params.sessionUser?.role === "string" ? params.sessionUser.role.trim() : "";
  if (!uid || !role) return "guest";
  if (role !== "USER") return "staff_other";
  const fromDb = await resolveCustomerAffiliateActiveDb(uid);
  return fromDb ? "ctv" : "customer_not_ctv";
}

type PolicyRow = { group: string; rate: string; condition: string; notes: string };

function CommissionPolicyBlocks({ rows }: { rows: PolicyRow[] }): JSX.Element {
  return (
    <>
      <div className="hidden md:block">
        <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200/95 bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-100">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th scope="col" className="px-4 py-3 font-semibold text-slate-900">
                  Nhóm sản phẩm
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-900">
                  Hoa hồng dự kiến
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-900">
                  Điều kiện ghi nhận
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-900">
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.group}-${i}`}
                  className={i === 0 ? "border-b border-slate-200 bg-white" : "border-b border-slate-100 bg-slate-50/40"}
                >
                  <th scope="row" className="break-words px-4 py-3.5 align-top font-semibold leading-snug text-slate-900">
                    {row.group}
                  </th>
                  <td className="break-words px-4 py-3.5 align-top font-medium tabular-nums text-sky-950">{row.rate}</td>
                  <td className="break-words px-4 py-3.5 align-top leading-relaxed text-slate-700">{row.condition}</td>
                  <td className="break-words px-4 py-3.5 align-top leading-relaxed text-slate-600">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {rows.map((row, i) => (
          <li
            key={`m-${row.group}-${i}`}
            className="min-w-0 rounded-2xl border border-slate-200/95 bg-white px-4 py-4 shadow-md shadow-slate-900/5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nhóm sản phẩm</p>
            <p className="mt-1 break-words text-[15px] font-semibold text-slate-900">{row.group}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Hoa hồng dự kiến</p>
            <p className="mt-1 text-sm font-medium text-sky-950">{row.rate}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Điều kiện ghi nhận</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{row.condition}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{row.notes}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function CongTacVienLandingPage(): Promise<JSX.Element> {
  const [website, session] = await Promise.all([getWebsiteSettings(), getServerSession(authOptions)]);
  const sessionUser = session?.user?.id
    ? (() => {
        const u = session.user;
        const roleRaw =
          u && typeof u === "object" && "role" in u ? String((u as { role?: unknown }).role ?? "").trim() : "";
        return {
          id: String(session.user.id),
          role: roleRaw || "USER",
          affiliateActive:
            u && typeof u === "object" && "affiliateActive" in u
              ? (u as { affiliateActive?: boolean }).affiliateActive
              : undefined,
        };
      })()
    : null;

  const visitorLane = await resolveVisitorCtvLane({ sessionUser });

  const affiliateOn = website.affiliateEnabled;
  const affiliateCanBuy = website.customerAccountSettings.affiliateCanBuy === true;

  const commissionPct = Number(website.commissionRate);
  const hasNumericRate = Number.isFinite(commissionPct) && commissionPct > 0;

  const commissionDisplayFallback = "Theo chính sách hiện hành";
  const catalogueRateDisplay =
    !affiliateOn ? "—" : hasNumericRate ? `${commissionPct}% trên giá trị đơn hợp lệ (ước tính)` : commissionDisplayFallback;

  const payoutFloor = Number(website.payoutThreshold);
  const safePayout = Number.isFinite(payoutFloor) ? payoutFloor : 0;
  const cookieDays = Math.max(1, Math.floor(Number(website.cookieDuration) || 30));
  const withdrawalOn = website.withdrawalEnabled;
  const termsHref = sanitizeInternalHref(website.customerAccountSettings?.affiliateTermsUrl);
  const guideHref = sanitizeInternalHref(website.customerAccountSettings?.affiliateGuideUrl);

  const primaryContact = pickContactHref(website);
  const affiliateApplyDefaultEmail =
    typeof session?.user?.email === "string" ? session.user.email.trim() || null : null;

  const ctvGuidePlain = typeof website.ctvGuideContent === "string" ? website.ctvGuideContent.trim() : "";

  const payoutLine = affiliateOn ? `Đối soát khi đạt ngưỡng tối thiểu ${formatVnd(safePayout)}.` : "";
  const withdrawLineShort = withdrawalOn
    ? "Rút tiền: có thể gửi yêu cầu trong tài khoản khi đủ điều kiện."
    : "Rút tiền / chi trả qua cửa hỗ trợ theo đợt đối soát.";
  const buyerShort = affiliateCanBuy
    ? "CTV được phép đặt mua trên storefront."
    : "CTV chỉ dùng luồng giới thiệu trên storefront (không đặt mua như khách trong luồng chuẩn).";

  const catalogueCondition = affiliateOn
    ? `Ghi nhận giới thiệu trong thời hạn cookie ${cookieDays} ngày. Đơn hàng hợp lệ, không tự giới thiệu, không vi phạm chính sách cửa hàng.`
    : "Chương trình tạm dừng; không có hoa hồng được kích hoạt trong giai đoạn này.";

  const catalogueNotes = affiliateOn
    ? [withdrawLineShort, payoutLine || null, buyerShort].filter(Boolean).join(" ")
    : `Liên hệ cửa hàng qua nút "${primaryContact.label}" hoặc thông tin công khai của Zendo.`;

  const policyRowsAll: PolicyRow[] = [];
  policyRowsAll.push({
    group: affiliateOn ? "Toàn danh mục sản phẩm trong Affiliate" : "Sản phẩm Affiliate (đang đóng chương trình)",
    rate: catalogueRateDisplay,
    condition: catalogueCondition,
    notes: catalogueNotes,
  });
  if (affiliateOn) {
    policyRowsAll.push(
      {
        group: "Trạng thái · Chờ duyệt",
        rate: "—",
        condition: "Hoa hồng vừa gắn với đơn hợp lệ, chờ giao và đối soát.",
        notes: "Hệ thống ghi nhận ban đầu; vẫn chờ xác nhận giao / quyết toán.",
      },
      {
        group: "Trạng thái · Đã duyệt",
        rate: "—",
        condition: "Đơn hoàn thành / được xác nhận theo chính sách của cửa hàng.",
        notes: "Đủ điều kiện xếp vào các đợt chi trả hoặc rút tiền (nếu mở chức năng).",
      },
      {
        group: "Trạng thái · Đã thanh toán",
        rate: "—",
        condition: "Khoản hoa hồng đã được xác nhận chi trả trong kỳ đối soát.",
        notes: "Giữ trong lịch sử; không tự quay lại trạng thái chờ.",
      },
      {
        group: "Trạng thái · Đã hủy",
        rate: "—",
        condition: "Đơn hủy, hoàn không hợp lệ có thể chuyển hoa hồng sang hủy (trừ khi đã chi).",
        notes: "Theo từng giao dịch hiển thị trong Affiliate.",
      },
    );
  }

  const benefits = [
    { title: "Không cần nhập hàng", body: "Bạn chỉ chia sẻ; cửa hàng lo tồn kho và giao nhận.", icon: "check" as const },
    {
      title: "Không cần vận hành kho",
      body: "Không nhận hàng vào kho riêng, không quản logistics; tập trung nội dung và tư vấn.",
      icon: "check" as const,
    },
    { title: "Có link giới thiệu riêng", body: "Mã ref và link gắn với khách được ghi nhận đúng quy định.", icon: "spark" as const },
    {
      title: "Theo dõi click, đơn phát sinh, hoa hồng",
      body: affiliateOn ? "Đo lường ngay trong mục tài khoản khi bạn được kích hoạt CTV." : "Đo lường hoạt động trong tài khoản sau khi chương trình mở lại và bạn được kích hoạt.",
      icon: "spark" as const,
    },
    {
      title: "Rút tiền khi đủ ngưỡng",
      body: affiliateOn
        ? `${withdrawLineShort} Ngưỡng tham khảo: ${formatVnd(safePayout)}.`
        : "Điều kiện rút/ngưỡng chi sẽ theo chính sách khi chương trình mở.",
      icon: "check" as const,
    },
    {
      title: "Có hướng dẫn CTV rõ ràng",
      body: guideHref ? "Đường dẫn hướng dẫn do cửa hàng cấu hình (xem nút phía dưới)." : "Cửa hàng cập nhật hướng dẫn trong tab Affiliate của tài khoản và nội dung hỗ trợ.",
      icon: "check" as const,
    },
  ];

  const howItWorksSteps = affiliateOn
    ? [
        {
          step: "01",
          title: "Đăng ký / đăng nhập",
          body: "Tạo hoặc mở tài khoản khách Zendo để được xét hồ sơ CTV.",
        },
        {
          step: "02",
          title: "Duyệt / kích hoạt",
          body: "Khi được duyệt, bạn được gắn trạng thái cộng tác viên theo quy định.",
        },
        {
          step: "03",
          title: "Lấy link giới thiệu",
          body: "Dùng mã và link chia sẻ trong trung tâm Affiliate trong mục tài khoản của bạn trên cửa hàng.",
        },
        {
          step: "04",
          title: "Nhận hoa hồng",
          body: "Với các đơn hợp lệ và hoàn thành, hoa hồng được ấn định và đối soát đúng chính sách.",
        },
      ]
    : [
        {
          step: "01",
          title: "Đọc thông tin & quy định",
          body: "Chương trình đang tạm dừng: vui lòng không kỳ vọng mở đăng ký CTV cho đến khi cửa hàng bật lại Affiliate.",
        },
        {
          step: "02",
          title: "Liên hệ khi cần",
          body: "Dùng kênh liên hệ công khai của Zendo (Zalo, hotline, email…) để được hướng dẫn phù hợp tình huống.",
        },
        {
          step: "03",
          title: "Theo dõi cập nhật",
          body: "Khi chương trình mở lại, chi tiết đăng ký sẽ được thông báo trên website và trong tài khoản (nếu bạn đã có).",
        },
        {
          step: "04",
          title: "Luôn tuân thủ",
          body: "Xem mục Quy định CTV; nội dung minh bạch giúp thương hiệu và cộng tác viên cùng bền vững.",
        },
      ];

  return (
    <main className="min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      <section className="relative isolate overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-100/50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 120% 80% at 100% -20%, rgb(125 211 252 / 0.45), transparent 55%), radial-gradient(ellipse 70% 50% at 0% 100%, rgb(203 213 225 / 0.5), transparent 50%), radial-gradient(circle at 50% 50%, rgb(241 245 249 / 0.6), transparent 70%)",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl md:h-96 md:w-96" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800 shadow-sm backdrop-blur-sm sm:text-xs">
              Affiliate · Zendo.vn
            </span>
            <h1 className="mt-4 text-balance text-[1.65rem] font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]">
              Trở thành cộng tác viên Zendo.vn
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-[17px]">
              Chia sẻ link và nội dung chính hãng. Khi đơn được xác nhận hợp lệ, hoa hồng được công khai trong luồng đối
              soát: bạn giới thiệu có trách nhiệm, Zendo đồng hành cùng khách trong hành trình đặt hàng.
            </p>

            {affiliateOn ? (
              <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/80 px-2 py-3 text-center shadow-sm backdrop-blur-sm sm:px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">Tỷ lệ</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-sky-950 sm:text-base">{hasNumericRate ? `${commissionPct}%` : "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 px-2 py-3 text-center shadow-sm backdrop-blur-sm sm:px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">Cookie</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-sky-950 sm:text-base">{cookieDays}</p>
                  <p className="text-[9px] text-slate-500 sm:text-[10px]">ngày</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 px-2 py-3 text-center shadow-sm backdrop-blur-sm sm:px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">Ngưỡng</p>
                  <p className="mt-1 break-words text-xs font-bold tabular-nums leading-tight text-sky-950 sm:text-sm">{formatVnd(safePayout)}</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white px-4 py-4 text-sm leading-relaxed text-amber-950 shadow-md shadow-amber-900/10 sm:py-5">
                <p className="font-semibold">Chương trình CTV đang tạm dừng.</p>
                <p className="mt-2 text-amber-900/95">
                  Bạn vẫn có thể đọc quy định và minh họa chính sách dưới đây. Để làm việc với cửa hàng, vui lòng dùng kênh liên hệ; chúng tôi không mời đăng ký CTV trong giai đoạn này.
                </p>
              </div>
            )}

            <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:mx-auto sm:flex-row sm:flex-wrap sm:justify-center">
              {!affiliateOn ? (
                <>
                  <a
                    href={primaryContact.href}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 sm:w-auto sm:min-w-[200px]"
                  >
                    {primaryContact.label}
                  </a>
                  <a
                    href="#chinh-sach-hoa-hong"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/70 transition hover:border-slate-300 hover:bg-white sm:w-auto sm:min-w-[200px]"
                  >
                    Minh họa &amp; thông tin
                  </a>
                  <Link
                    href="/tai-khoan"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white/95 px-6 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50 sm:w-auto sm:min-w-[220px]"
                  >
                    Đến đăng nhập / tài khoản
                  </Link>
                </>
              ) : visitorLane === "guest" ? (
                <>
                  <Link
                    href={LOGIN_CTV_ELIGIBLE_RETURN}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                  >
                    Đăng nhập để đăng ký CTV
                  </Link>
                  <a
                    href="#chinh-sach-hoa-hong"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/70 transition hover:border-slate-300 hover:bg-white sm:w-auto sm:min-w-[200px]"
                  >
                    Xem chính sách hoa hồng
                  </a>
                </>
              ) : visitorLane === "customer_not_ctv" ? (
                <>
                  <a
                    href="#gui-yeu-cau-ctv"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                  >
                    Gửi yêu cầu làm CTV
                  </a>
                  <a
                    href={primaryContact.href}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/70 transition hover:border-slate-300 hover:bg-white sm:w-auto sm:min-w-[220px]"
                  >
                    {primaryContact.label}
                  </a>
                </>
              ) : visitorLane === "ctv" ? (
                <>
                  <Link
                    href="/tai-khoan"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 sm:w-auto sm:min-w-[240px]"
                  >
                    Vào trang CTV của tôi
                  </Link>
                  <Link
                    href="/tai-khoan"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-sky-950 shadow-sm ring-1 ring-slate-200/70 transition hover:bg-sky-50 sm:w-auto sm:min-w-[220px]"
                  >
                    Lấy link giới thiệu
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={LIEN_HE_PATH}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                  >
                    Liên hệ Zendo để được hướng dẫn
                  </Link>
                  <a
                    href={primaryContact.href}
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-6 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/70 transition hover:border-slate-300 hover:bg-white sm:w-auto sm:min-w-[220px]"
                  >
                    {primaryContact.label}
                  </a>
                </>
              )}
            </div>

            <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2 text-left sm:justify-center">
              {["Không cần ôm hàng", "Theo dõi hoa hồng minh bạch", "Thanh toán theo đối soát"].map((label) => (
                <span
                  key={label}
                  className="inline-flex max-w-[min(100%,20rem)] min-w-0 items-center gap-2 rounded-full border border-slate-200/90 bg-white/85 px-3 py-2 text-[12px] font-medium leading-snug text-slate-800 shadow-sm backdrop-blur-sm sm:text-[13px]"
                >
                  <CheckIcon className="size-6 shrink-0" />
                  <span className="min-w-0">{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/75 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Lợi ích khi làm CTV</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Mô hình đồng hành cửa hàng: bạn tạo độ tin cậy, Zendo giao và chăm sóc sau bán.
            </p>
          </div>

          <ul className="mt-10 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-100"
              >
                <div className="flex flex-1 flex-col items-start gap-3 sm:flex-row">
                  {benefit.icon === "spark" ? (
                    <SparkIcon className="mt-0.5 size-8 shrink-0" />
                  ) : (
                    <CheckIcon className="mt-0.5 size-8 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold leading-snug text-slate-900">{benefit.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{benefit.body}</p>
                    {benefit.title === "Có hướng dẫn CTV rõ ràng" && guideHref ? (
                      <Link
                        href={guideHref}
                        className="mt-3 inline-flex text-sm font-semibold text-sky-700 underline underline-offset-4 hover:text-sky-800"
                      >
                        Mở hướng dẫn CTV
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="chinh-sach-hoa-hong" className="scroll-mt-28 border-b border-slate-200/70 bg-slate-50/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Chính sách &amp; bảng hoa hồng</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Bảng tổng hợp dựa trên cấu hình Affiliate hiện tại của Zendo và luồng trạng thái trong hệ thống thanh quyết
              toán.
            </p>
          </div>

          {!affiliateOn ? (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-4 text-center text-sm leading-relaxed text-rose-950 shadow-sm">
              Chương trình CTV đang tạm dừng. Chi tiết số và trạng thái chỉ có hiệu lực khi chương trình được bật lại.
              <span className="mt-3 block font-medium">
                Cần tư vấn? Đặt nút&nbsp;
                <a href={primaryContact.href} className="text-sky-800 underline underline-offset-4">
                  {primaryContact.label}
                </a>
                .
              </span>
            </div>
          ) : (
            <>
              <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <li className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 px-4 py-5 shadow-md shadow-slate-900/5 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tỷ lệ hoa hồng (cấu hình)</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                    {hasNumericRate ? `${commissionPct}%` : "—"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {hasNumericRate
                      ? "Theo cửa hàng cấu hình; chỉ được ghi nhận khi đơn và trạng thái Affiliate thỏa điều kiện."
                      : commissionDisplayFallback}
                  </p>
                </li>
                <li className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 px-4 py-5 shadow-md shadow-slate-900/5 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngưỡng chi trả</p>
                  <p className="mt-2 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatVnd(safePayout)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">Tham khảo từ cài đặt cửa hàng.</p>
                </li>
                <li className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 px-4 py-5 shadow-md shadow-slate-900/5 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cookie giới thiệu</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{cookieDays}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">Ngày theo cookieDuration trong cấu hình.</p>
                </li>
                <li className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 px-4 py-5 shadow-md shadow-slate-900/5 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rút tiền &amp; quyền mua</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{withdrawalOn ? "Rút tiền: bật" : "Rút tiền: qua cửa hỗ trợ"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{buyerShort}</p>
                </li>
              </ul>
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">Bảng chính sách chi tiết</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Phiên bản máy tính: bảng rộng. Điện thoại: thẻ từng dòng, không cần kéo ngang.
                </p>
                <div className="mt-6">
                  <CommissionPolicyBlocks rows={policyRowsAll} />
                </div>
              </div>
              {termsHref ? (
                <p className="mt-10 text-center text-sm">
                  <Link href={termsHref} className="font-semibold text-sky-700 underline underline-offset-4 hover:text-sky-800">
                    Đọc điều khoản Affiliate đầy đủ
                  </Link>
                </p>
              ) : null}
            </>
          )}

          {affiliateOn ? null : (
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">Bảng minh họa luồng (chương trình đang đóng)</h3>
              <p className="mt-1 text-sm text-slate-600">Hàng chờ duyệt / đối soát chỉ có ý nghĩa khi chương trình mở lại.</p>
              <div className="mt-6">
                <CommissionPolicyBlocks rows={policyRowsAll} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="quy-dinh-ctv" className="scroll-mt-28 border-b border-slate-200/75 bg-gradient-to-b from-white to-slate-50/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Quy định dành cho CTV</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Những nguyên tắc tối thiểu giúp chiến dịch giới thiệu và thương hiệu nhất quán, an toàn và bền vững.
            </p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-3xl list-none gap-3 sm:gap-4">
            {[
              "Không spam link, không làm méo nội dung hoặc gây hiểu nhầm thương hiệu và sản phẩm của Zendo.vn.",
              affiliateCanBuy === false
                ? "Không tự đặt mua qua tài khoản được gắn trạng thái CTV trên storefront (cài đặt hiện không cho CTV mua như khách trong luồng chuẩn)."
                : "Khi cửa hàng cho phép CTV mua, chỉ mua với mục đích cá nhân hợp pháp; vẫn không lạm dụng để tạo doanh số giả.",
              "Đơn hủy, hoàn thanh toán hoặc không thành công theo chính sách không được tính hoa hồng hợp lệ.",
              "Hoa hồng được đưa sang trạng thái được duyệt khi đơn hoàn thành theo chính sách của cửa hàng và luồng đối soát.",
              "Zendo.vn và đội đối soát có quyền kiểm tra các đơn bất thường (lệch hành vi, gian lận…) trước khi xác nhận thanh toán.",
              "Thông tin khách mua hàng và dữ liệu cá nhân liên quan được bảo vệ; CTV không chia sẻ trái phép ra bên ngoài.",
            ].map((text, i) => (
              <li
                key={`q-${i}`}
                className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-4 shadow-sm ring-1 ring-slate-100 sm:gap-4 sm:px-5 sm:py-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold tabular-nums text-sky-950">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 sm:text-[15px]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {ctvGuidePlain ? (
        <section id="huong-dan-tu-zendo" className="scroll-mt-28 border-b border-slate-200/70 bg-slate-50/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Hướng dẫn từ Zendo.vn</h2>
              <p className="mt-2 text-sm text-slate-600">
                Nội dung được lưu trong cài đặt website; hiển thị dưới dạng văn bản an toàn (không nhúng HTML thô).
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200/95 bg-white px-4 py-5 text-sm leading-relaxed text-slate-800 shadow-md shadow-slate-900/5 ring-1 ring-slate-100 sm:px-6 sm:py-6 sm:text-[15px]">
                <div className="whitespace-pre-wrap break-words">{ctvGuidePlain}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Cách hoạt động</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {affiliateOn
                ? "Bốn bước gọn để bắt đầu chia sẻ và nhận hoa hồng theo cấu hình hiện tại."
                : "Luồng tham khảo khi chương trình tạm dừng: ưu tiên liên hệ và chờ cửa hàng bật lại Affiliate."}
            </p>
          </div>

          <ol className="mt-10 grid max-w-5xl auto-rows-fr list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:mx-auto lg:grid-cols-4">
            {howItWorksSteps.map((item) => (
              <li
                key={item.step}
                className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-md shadow-slate-900/5 ring-1 ring-slate-100"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold tabular-nums text-sky-900 ring-2 ring-white">
                  {item.step}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold leading-snug text-slate-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-14 max-w-4xl rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/30 to-white p-6 shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-100 sm:p-10">
            <p className="text-center text-base font-semibold text-slate-900 sm:text-lg">
              {affiliateOn ? "Sẵn sàng đồng hành cùng Zendo.vn?" : "Cần tư vấn hoặc hỗ trợ trong giai đoạn đóng chương trình?"}
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
              {affiliateOn ? "Chọn hành động phù hợp với trạng thái đăng nhập của bạn." : "Chúng tôi ưu tiên kênh liên hệ công khai; không ép đăng ký khi Affiliate đang tắt."}
            </p>
            {affiliateOn && visitorLane === "guest" ? (
              <div
                id="gui-yeu-cau-ctv"
                className="scroll-mt-28 mx-auto mt-8 w-full max-w-2xl min-w-0 rounded-2xl border border-slate-200/95 bg-white/95 px-4 py-6 text-center shadow-md shadow-slate-900/5 ring-1 ring-slate-100 sm:px-8"
              >
                <p className="text-sm font-semibold text-slate-900">Gửi yêu cầu làm CTV</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Bạn cần đăng nhập tài khoản khách (tài khoản mua hàng) để cửa hàng xét hồ sơ. Khách chưa đăng nhập không
                  thấy biểu mẫu gửi đơn.
                </p>
                <Link
                  href={LOGIN_CTV_ELIGIBLE_RETURN}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                >
                  Đăng nhập để tiếp tục
                </Link>
                <p className="mt-4 text-xs text-slate-500">
                  Chưa có tài khoản? Mở trang tài khoản để đăng ký, sau đó quay lại trang này.
                </p>
              </div>
            ) : null}
            {affiliateOn && visitorLane === "customer_not_ctv" ? (
              <div id="gui-yeu-cau-ctv" className="scroll-mt-28 mx-auto mt-8 w-full max-w-2xl min-w-0">
                <AffiliateApplicationForm
                  defaultEmail={affiliateApplyDefaultEmail}
                  contactHref={primaryContact.href}
                  contactLabel={primaryContact.label}
                  lienHeHref={LIEN_HE_PATH}
                />
              </div>
            ) : null}
            <div className="mx-auto mt-8 flex w-full max-w-xl flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
            {!affiliateOn ? (
              <>
                <a
                  href={primaryContact.href}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/15 transition hover:bg-sky-700 sm:w-auto sm:min-w-[220px]"
                >
                  {primaryContact.label}
                </a>
                {visitorLane !== "guest" ? (
                  <Link
                    href="/tai-khoan"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[200px]"
                  >
                    Mở trang tài khoản
                  </Link>
                ) : (
                  <a
                    href="#quy-dinh-ctv"
                    className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[200px]"
                  >
                    Đọc quy định CTV
                  </a>
                )}
              </>
            ) : visitorLane === "guest" ? (
              <>
                <Link
                  href={LOGIN_CTV_ELIGIBLE_RETURN}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/15 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                >
                  Đăng nhập để đăng ký CTV
                </Link>
                <a
                  href="#quy-dinh-ctv"
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[200px]"
                >
                  Xem quy định
                </a>
              </>
            ) : visitorLane === "customer_not_ctv" ? (
              <>
                <a
                  href="#gui-yeu-cau-ctv"
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/15 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                >
                  Gửi yêu cầu làm CTV
                </a>
                <a
                  href={primaryContact.href}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[220px]"
                >
                  {primaryContact.label}
                </a>
              </>
            ) : visitorLane === "ctv" ? (
              <>
                <Link
                  href="/tai-khoan"
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/15 transition hover:bg-sky-700 sm:w-auto sm:min-w-[240px]"
                >
                  Vào trang CTV của tôi
                </Link>
                <Link
                  href="/tai-khoan"
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white px-6 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 sm:w-auto sm:min-w-[220px]"
                >
                  Lấy link giới thiệu
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={LIEN_HE_PATH}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-sky-600/15 transition hover:bg-sky-700 sm:w-auto sm:min-w-[260px]"
                >
                  Liên hệ Zendo để được hướng dẫn
                </Link>
                <a
                  href={primaryContact.href}
                  className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[220px]"
                >
                  {primaryContact.label}
                </a>
              </>
            )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
