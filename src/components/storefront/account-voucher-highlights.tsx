"use client";

import { useMemo } from "react";
import { Gift } from "lucide-react";
import type { StorefrontAccountVoucher } from "../../lib/server/storefront-customer-account-dashboard";

/* ─────────────────────────────────────────────────────────────
   AccountVoucherHighlights — "Ưu đãi dành riêng cho bạn"

   Tối ưu UI/UX 2026-06-23 (Dashboard Preview):
   ✓ Tiêu đề gọn: "🎁 Ưu đãi dành riêng cho bạn" — KHÔNG badge "N mã"
     (tránh trùng lặp với CTA "Xem tất cả N voucher →" cuối section)
   ✓ Chỉ hiển thị TỐI ĐA 3 voucher nổi bật nhất
   ✓ Mỗi voucher hiển thị ĐỦ THÔNG TIN để khách quyết định dùng ngay:
       - Giá trị ưu đãi (GIẢM X% / GIẢM Xđ / FREESHIP)
       - Điều kiện áp dụng (Đơn từ Xđ / Áp dụng mọi đơn hàng)
       - Mã voucher
       - Hạn sử dụng (dd/MM/yyyy)
       - Loại voucher (VIP / Freeship / Giảm giá)
   ✓ KHÔNG cắt nội dung (không truncate, không max-h cứng)
   ✓ Ưu tiên sắp xếp: Sắp hết hạn → Giá trị cao → Dành riêng TV → Freeship
   ✓ Semantic HTML: section / article / h2 / p / a
   ✓ Schema.org/Offer markup (SEO)
   ✓ CTA "Xem tất cả N voucher →" điều hướng tới Kho Voucher (tab coupons)
   ✓ KHÔNG thay đổi Voucher Engine / API / Database / Auth / logic
   ───────────────────────────────────────────────────────────── */

/** Số voucher tối đa hiển thị trên Dashboard Preview. */
const HIGHLIGHTS_MAX = 3;

type VoucherCategory = "freeship" | "percent" | "fixed" | "vip";

type BadgeType = "HOT" | "FREESHIP" | "VIP" | "SẮP HẾT" | "ĐỘC QUYỀN" | null;

/* ─── Classification helpers (pure, data-driven — không đổi logic) ─── */

function classifyVoucher(voucher: StorefrontAccountVoucher): VoucherCategory {
  if (
    voucher.code.toUpperCase().includes("VIP") ||
    voucher.name.toUpperCase().includes("VIP") ||
    voucher.voucherType?.toUpperCase().includes("VIP")
  ) {
    return "vip";
  }
  if (voucher.discountType === "FREE_SHIPPING" || voucher.freeShipping) {
    return "freeship";
  }
  if (voucher.discountType === "PERCENT") {
    return "percent";
  }
  return "fixed";
}

function getVoucherBadge(
  voucher: StorefrontAccountVoucher,
  category: VoucherCategory,
): BadgeType {
  if (category === "vip") return "VIP";
  if (category === "freeship") return "FREESHIP";

  if (voucher.endAt) {
    const diff = new Date(voucher.endAt).getTime() - Date.now();
    if (diff > 0 && diff <= 2 * 24 * 60 * 60 * 1000) return "SẮP HẾT";
  }

  if (voucher.usageLimit && voucher.usedCount) {
    const usageRatio = voucher.usedCount / voucher.usageLimit;
    if (usageRatio >= 0.7) return "HOT";
  }

  if (voucher.appliesToUsers && voucher.appliesToUsers.trim().length > 0) {
    return "ĐỘC QUYỀN";
  }

  return null;
}

function getBadgeStyles(badge: BadgeType): string {
  switch (badge) {
    case "HOT":
      return "bg-red-500 text-white";
    case "FREESHIP":
      return "bg-emerald-500 text-white";
    case "VIP":
      return "bg-gradient-to-r from-amber-500 to-yellow-400 text-white";
    case "SẮP HẾT":
      return "bg-orange-500 text-white";
    case "ĐỘC QUYỀN":
      return "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white";
    default:
      return "";
  }
}

/** Nhãn loại voucher hiển thị trên card (VIP / Freeship / Giảm giá). */
function getCategoryLabel(category: VoucherCategory): string {
  switch (category) {
    case "vip":
      return "VIP";
    case "freeship":
      return "Freeship";
    case "percent":
      return "Giảm giá";
    case "fixed":
      return "Giảm giá";
  }
}

function getVoucherIcon(category: VoucherCategory): string {
  switch (category) {
    case "freeship":
      return "🚚";
    case "percent":
      return "🏷️";
    case "fixed":
      return "🔥";
    case "vip":
      return "👑";
  }
}

function getCategoryAccent(category: VoucherCategory): {
  badgeBg: string;
  valueText: string;
  iconBg: string;
  leftPanelBg: string;
  leftPanelBorder: string;
  categoryPillBg: string;
  categoryPillText: string;
} {
  switch (category) {
    case "vip":
      return {
        badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-400 text-white",
        valueText: "text-amber-700",
        iconBg: "bg-amber-100",
        leftPanelBg: "bg-gradient-to-br from-amber-50 to-amber-100/70",
        leftPanelBorder: "border-amber-200/70",
        categoryPillBg: "bg-amber-100",
        categoryPillText: "text-amber-700",
      };
    case "freeship":
      return {
        badgeBg: "bg-emerald-500 text-white",
        valueText: "text-emerald-700",
        iconBg: "bg-emerald-100",
        leftPanelBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/70",
        leftPanelBorder: "border-emerald-200/70",
        categoryPillBg: "bg-emerald-100",
        categoryPillText: "text-emerald-700",
      };
    case "percent":
      return {
        badgeBg: "bg-blue-500 text-white",
        valueText: "text-blue-700",
        iconBg: "bg-blue-100",
        leftPanelBg: "bg-gradient-to-br from-blue-50 to-blue-100/70",
        leftPanelBorder: "border-blue-200/70",
        categoryPillBg: "bg-blue-100",
        categoryPillText: "text-blue-700",
      };
    case "fixed":
      return {
        badgeBg: "bg-orange-500 text-white",
        valueText: "text-orange-700",
        iconBg: "bg-orange-100",
        leftPanelBg: "bg-gradient-to-br from-orange-50 to-orange-100/70",
        leftPanelBorder: "border-orange-200/70",
        categoryPillBg: "bg-orange-100",
        categoryPillText: "text-orange-700",
      };
  }
}

/* ─── Formatting helpers ─── */

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

/** Dòng giá trị giảm giá — nội dung nổi bật nhất trên card. */
function discountHeadline(voucher: StorefrontAccountVoucher): string {
  if (voucher.discountType === "PERCENT") {
    return `GIẢM ${voucher.discountValue}%`;
  }
  if (voucher.discountType === "FREE_SHIPPING") {
    return `FREESHIP ${formatVnd(voucher.discountValue)}`;
  }
  return `GIẢM ${formatVnd(voucher.discountValue)}`;
}

/** Dòng điều kiện áp dụng — hiển thị rõ ràng để khách quyết định dùng ngay. */
function getConditionLine(voucher: StorefrontAccountVoucher): string {
  if (voucher.discountType === "FREE_SHIPPING" || voucher.freeShipping) {
    if (voucher.minOrderValue) {
      return `Đơn từ ${formatVnd(voucher.minOrderValue)}`;
    }
    return "Áp dụng mọi đơn hàng";
  }
  if (voucher.minOrderValue) {
    return `Đơn từ ${formatVnd(voucher.minOrderValue)}`;
  }
  return "Áp dụng mọi đơn hàng";
}

/** Dòng phụ trợ cho voucher VIP — ưu tiên tên voucher (ví dụ "Dành cho thành viên Đồng"). */
function getSubLine(
  voucher: StorefrontAccountVoucher,
  category: VoucherCategory,
): string {
  if (category === "vip") {
    const name = voucher.name.trim();
    if (name) return name;
  }
  return getConditionLine(voucher);
}

/** Định dạng hạn sử dụng từ ISO string → dd/MM/yyyy. */
function formatExpiry(endAt: string | null | undefined): string | null {
  if (!endAt) return null;
  const date = new Date(endAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Trả về true nếu voucher sắp hết hạn (≤ 2 ngày). */
function isExpiringSoon(voucher: StorefrontAccountVoucher): boolean {
  if (!voucher.endAt) return false;
  const diff = new Date(voucher.endAt).getTime() - Date.now();
  return diff > 0 && diff <= 2 * 24 * 60 * 60 * 1000;
}

/* ─── Sorting: ưu tiên sắp xếp theo Dashboard Preview ───
   1. Sắp hết hạn (endAt gần nhất)
   2. Giá trị cao nhất
   3. Dành riêng thành viên hiện tại (appliesToUsers không rỗng)
   4. Freeship
   ───────────────────────────────────────────────────────── */

function isVoucherValid(voucher: StorefrontAccountVoucher): boolean {
  if (voucher.status !== "ACTIVE") return false;
  if (voucher.availability !== "available") return false;
  if (voucher.endAt) {
    const endTime = new Date(voucher.endAt).getTime();
    if (endTime <= Date.now()) return false;
  }
  if (voucher.remainingUses !== null && voucher.remainingUses <= 0) return false;
  return true;
}

function voucherSortScore(voucher: StorefrontAccountVoucher): number {
  if (voucher.discountType === "PERCENT") {
    return voucher.maxDiscountValue ?? voucher.discountValue * 1000;
  }
  return voucher.discountValue;
}

function isForMember(voucher: StorefrontAccountVoucher): boolean {
  return Boolean(voucher.appliesToUsers && voucher.appliesToUsers.trim().length > 0);
}

function isFreeship(voucher: StorefrontAccountVoucher): boolean {
  return voucher.discountType === "FREE_SHIPPING" || voucher.freeShipping;
}

/**
 * Sort theo priority:
 *  1. Sắp hết hạn (true trước false)
 *  2. Giá trị cao nhất (score giảm dần)
 *  3. Dành riêng thành viên (true trước false)
 *  4. Freeship (true trước false)
 *  5. Tie-break: endAt gần nhất
 */
function rankVouchers(vouchers: StorefrontAccountVoucher[]): StorefrontAccountVoucher[] {
  const valid = vouchers.filter(isVoucherValid);
  return [...valid].sort((a, b) => {
    const aSoon = isExpiringSoon(a) ? 1 : 0;
    const bSoon = isExpiringSoon(b) ? 1 : 0;
    if (aSoon !== bSoon) return bSoon - aSoon;

    const scoreA = voucherSortScore(a);
    const scoreB = voucherSortScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;

    const aMember = isForMember(a) ? 1 : 0;
    const bMember = isForMember(b) ? 1 : 0;
    if (aMember !== bMember) return bMember - aMember;

    const aFree = isFreeship(a) ? 1 : 0;
    const bFree = isFreeship(b) ? 1 : 0;
    if (aFree !== bFree) return bFree - aFree;

    const endA = a.endAt ? new Date(a.endAt).getTime() : Infinity;
    const endB = b.endAt ? new Date(b.endAt).getTime() : Infinity;
    return endA - endB;
  });
}

/* ─── Main Component ─── */

export default function AccountVoucherHighlights({
  vouchers,
  onViewAll,
  totalVouchers,
}: {
  vouchers: StorefrontAccountVoucher[];
  /** Callback khi click "Xem tất cả voucher" — điều hướng tới Kho Voucher. */
  onViewAll?: () => void;
  /** Tổng số voucher khả dụng (để hiển thị "Xem tất cả N voucher"). Mặc định = vouchers.length. */
  totalVouchers?: number;
}): JSX.Element | null {
  const sortedVouchers = useMemo(() => rankVouchers(vouchers), [vouchers]);
  const topVouchers = useMemo(
    () => sortedVouchers.slice(0, HIGHLIGHTS_MAX),
    [sortedVouchers],
  );

  // Tổng số voucher để hiển thị trên CTA "Xem tất cả N voucher →"
  const totalCount = totalVouchers ?? sortedVouchers.length;

  if (sortedVouchers.length === 0) return null;

  return (
    <section
      className="flex w-full flex-1 flex-col gap-4"
      aria-labelledby="voucher-highlights-title"
      itemScope
      itemType="https://schema.org/OfferCatalog"
    >
      {/*
        Header — semantic h2, icon Lucide Gift đồng bộ với 2 card còn lại.
        Icon 22-24px (+20%), gap 10px với text, font-weight 700, màu slate-800 đồng bộ theme.
      */}
      <div className="flex items-center gap-2.5">
        <Gift className="h-[22px] w-[22px] shrink-0 text-[#2563FF] sm:h-6 sm:w-6" strokeWidth={2} aria-hidden="true" />
        <h2
          id="voucher-highlights-title"
          className="text-base font-bold tracking-[-0.01em] text-slate-800 sm:text-lg"
          itemProp="name"
        >
          Ưu đãi dành riêng cho bạn
        </h2>
      </div>

      {/*
        Content — Voucher preview list dạng COMPACT NGANG (Shopee/Lazada style).
        Mỗi voucher là 1 row ngang cao 72-80px, hiển thị đủ thông tin quyết định dùng:
          - Left panel: icon + giá trị giảm (text lớn nhất)
          - Right panel: subLine (tên/điều kiện) + meta (mã + loại + hạn)
        Text dài dùng truncate/ellipsis, KHÔNG wrap nhiều dòng.
        Chỉ hiển thị tối đa 3 voucher nổi bật nhất.
        Flex-1 để kéo giãn chiếm phần giữa card, đẩy Actions xuống đáy.
      */}
      <div className="flex w-full flex-1 flex-col gap-2.5" role="list">
        {topVouchers.map((voucher) => {
          const category = classifyVoucher(voucher);
          const accent = getCategoryAccent(category);
          const icon = getVoucherIcon(category);
          const badge = getVoucherBadge(voucher, category);
          const headline = discountHeadline(voucher);
          const subLine = getSubLine(voucher, category);
          const condition = getConditionLine(voucher);
          const expiry = formatExpiry(voucher.endAt);
          const categoryLabel = getCategoryLabel(category);
          const expiringSoon = isExpiringSoon(voucher);

          return (
            <article
              key={voucher.id}
              role="listitem"
              className="group relative flex h-[72px] w-full shrink-0 items-stretch overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:h-[80px]"
              itemScope
              itemType="https://schema.org/Offer"
            >
              {/* Schema.org hidden meta — SEO support, không hiển thị */}
              <meta itemProp="priceCurrency" content="VND" />
              <meta itemProp="price" content="0" />
              <meta itemProp="availability" content="https://schema.org/InStock" />
              {voucher.endAt ? <meta itemProp="validThrough" content={voucher.endAt} /> : null}
              <meta itemProp="description" content={`${headline} - ${condition}`} />
              <meta itemProp="sku" content={voucher.code} />
              <link itemProp="url" href={`/account?tab=coupons&code=${encodeURIComponent(voucher.code)}`} />

              {/*
                Left value panel — VALUE-FIRST, compact ngang (Shopee style).
                Width cố định 88px mobile / 104px desktop — nhỏ gọn hơn 30-40% so với bản cũ.
              */}
              <div
                className={`relative flex w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 border-r ${accent.leftPanelBorder} ${accent.leftPanelBg} sm:w-[104px]`}
              >
                {/* Decorative dashed divider giữa 2 khu vực */}
                <div className="absolute -right-px top-0 h-full w-0 border-r border-dashed border-slate-200/70" />
                {/* Punch-hole top — tạo cảm giác voucher giấy */}
                <div className="absolute -right-[5px] top-1.5 h-2 w-2 rounded-full bg-white shadow-inner" />
                {/* Punch-hole bottom */}
                <div className="absolute -right-[5px] bottom-1.5 h-2 w-2 rounded-full bg-white shadow-inner" />

                {/* Badge HOT/VIP/FREESHIP/SẮP HẾT góc trên trái */}
                {badge ? (
                  <span
                    className={`absolute left-0 top-0 z-10 rounded-br px-1 py-0.5 text-[8px] font-bold uppercase leading-tight tracking-wide shadow-sm ${getBadgeStyles(badge)}`}
                    aria-label={`Nhãn ${badge}`}
                  >
                    {badge}
                  </span>
                ) : null}

                {/* Icon + GIÁ TRỊ GIẢM GIÁ — TEXT LỚN NHẤT, truncate 1 dòng */}
                <div className="flex w-full items-center justify-center gap-0.5 px-1">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] sm:h-5 sm:w-5 sm:text-[11px] ${accent.iconBg}`}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <p
                    className={`truncate text-[11px] font-extrabold leading-tight sm:text-[13px] ${accent.valueText}`}
                    itemProp="name"
                    title={headline}
                  >
                    {headline}
                  </p>
                </div>
              </div>

              {/*
                Right content — compact 2 dòng (Shopee/Lazada style):
                  - Dòng 1: subLine (tên voucher VIP hoặc điều kiện) — truncate 1 dòng
                  - Dòng 2: meta (mã + loại + hạn) — truncate 1 dòng, flex-wrap tắt
                Text dài dùng ellipsis, chiều cao voucher cố định 72-80px.
              */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-2">
                {/* Dòng 1: subLine — truncate 1 dòng */}
                <p
                  className="truncate text-[11px] font-semibold leading-snug text-slate-700 sm:text-[12px]"
                  title={subLine}
                >
                  {subLine}
                </p>

                {/* Dòng 2: meta — mã + loại + hạn, truncate 1 dòng, không wrap */}
                <div className="flex min-w-0 items-center gap-1.5 text-[9px] text-slate-500 sm:text-[10px]">
                  <code
                    className="shrink-0 rounded border border-dashed border-slate-300 bg-slate-50 px-1 py-0.5 text-[9px] font-bold tracking-wide text-slate-700 sm:text-[10px]"
                    itemProp="sku"
                    title={voucher.code}
                  >
                    {voucher.code}
                  </code>

                  {/* Pill loại voucher (VIP / Freeship / Giảm giá) */}
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase leading-tight tracking-wide ${accent.categoryPillBg} ${accent.categoryPillText}`}
                    aria-label={`Loại voucher: ${categoryLabel}`}
                  >
                    {categoryLabel}
                  </span>

                  {/* Hạn sử dụng — truncate, nổi bật nếu sắp hết hạn */}
                  {expiry ? (
                    <span
                      className={`inline-flex min-w-0 items-center gap-0.5 font-medium ${
                        expiringSoon ? "text-orange-600" : "text-slate-500"
                      }`}
                      aria-label={`Hạn sử dụng: ${expiry}`}
                    >
                      <span aria-hidden="true" className="shrink-0">⏰</span>
                      <span className="truncate">Hạn: {expiry}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/*
        Actions — CTA "Xem tất cả N voucher →" điều hướng tới Kho Voucher (tab coupons).
        Dùng <a> semantic cho SEO + accessibility. Nếu không có onViewAll, render text thường.
        Luôn hiển thị cuối section (khi totalCount > topVouchers.length).
        KHÔNG mt-auto / KHÔNG khoảng trắng thừa — gap-4 của section đã đảm bảo rhythm.
        Nút nhỏ gọn (h-8) để xếp liên tục với nhóm nút Actions của card-outer.
      */}
      {totalCount > topVouchers.length ? (
        onViewAll ? (
          <a
            href="#kho-voucher"
            onClick={(event) => {
              event.preventDefault();
              onViewAll();
            }}
            className="inline-flex h-8 w-full shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:text-xs"
            aria-label={`Xem tất cả ${totalCount} voucher trong kho voucher`}
          >
            Xem tất cả {totalCount} voucher
            <span className="ml-1" aria-hidden="true">→</span>
          </a>
        ) : (
          <p
            className="inline-flex h-8 w-full shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 sm:text-xs"
            aria-label={`Có ${totalCount} voucher trong kho voucher`}
          >
            Xem tất cả {totalCount} voucher →
          </p>
        )
      ) : null}
    </section>
  );
}
