"use client";

import { useMemo, useState } from "react";
import { getGuestCouponBadges, type GuestCouponOption } from "../../lib/coupon";
import type { StorefrontAccountVoucher } from "../../lib/server/storefront-customer-account-dashboard";

type VoucherFilter = "all" | "active" | "used" | "expired";
type VoucherSort = "newest" | "endingSoon" | "highestValue";

type VoucherGroups = {
  active: StorefrontAccountVoucher[];
  used: StorefrontAccountVoucher[];
  expired: StorefrontAccountVoucher[];
};

function formatVnd(value: number | null): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function formatDate(value: string): string {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Không giới hạn";
  return date.toLocaleDateString("vi-VN");
}

function discountLabel(voucher: StorefrontAccountVoucher): string {
  if (voucher.discountType === "PERCENT") return `Giảm ${voucher.discountValue}%`;
  if (voucher.discountType === "FREE_SHIPPING") return `Freeship ${formatVnd(voucher.discountValue)}`;
  return `Giảm ${formatVnd(voucher.discountValue)}`;
}

function discountTypeLabel(voucher: StorefrontAccountVoucher): string {
  if (voucher.discountType === "PERCENT") return "Giảm theo %";
  if (voucher.discountType === "FREE_SHIPPING") return "Miễn phí vận chuyển";
  return "Giảm số tiền";
}

function statusUi(voucher: StorefrontAccountVoucher): { label: string; className: string } {
  if (voucher.availability === "used") return { label: "Đã sử dụng", className: "bg-slate-100 text-slate-700" };
  if (voucher.availability === "expired") return { label: "Hết hạn", className: "bg-rose-50 text-rose-700" };
  if (voucher.availability === "upcoming") return { label: "Sắp diễn ra", className: "bg-amber-50 text-amber-700" };
  if (voucher.availability === "disabled") return { label: "Tạm tắt", className: "bg-zinc-100 text-zinc-600" };
  if (voucher.availability === "available") return { label: "Còn hạn", className: "bg-emerald-50 text-emerald-700" };
  return { label: "Không khả dụng", className: "bg-zinc-100 text-zinc-600" };
}

function toCheckoutCouponOption(voucher: StorefrontAccountVoucher): GuestCouponOption {
  const isEndingSoon = isVoucherEndingSoon(voucher);
  return {
    code: voucher.code,
    name: voucher.name,
    type: voucher.discountType,
    value: voucher.discountValue,
    maxDiscountValue: voucher.maxDiscountValue,
    minOrderValue: voucher.minOrderValue,
    createdAt: voucher.updatedAt || voucher.startAt || undefined,
    endsAt: voucher.endAt || undefined,
    expiresSoon: isEndingSoon,
    recommended: voucher.usedCount > 0,
    newCustomerOnly: voucher.code.toUpperCase().startsWith("WELCOME"),
    description: voucher.description || "Ưu đãi theo cấu hình Admin",
    conditionLabel: voucher.minOrderValue ? `Đơn tối thiểu ${formatVnd(voucher.minOrderValue)}` : "Không yêu cầu đơn tối thiểu",
  };
}

function isVoucherEndingSoon(voucher: StorefrontAccountVoucher): boolean {
  const end = voucher.endAt ? new Date(voucher.endAt).getTime() : 0;
  return end > 0 && end - Date.now() <= 7 * 24 * 60 * 60 * 1000;
}

function voucherConditionLabel(voucher: StorefrontAccountVoucher): string {
  return voucher.minOrderValue ? `Đơn tối thiểu ${formatVnd(voucher.minOrderValue)}` : "Không yêu cầu đơn tối thiểu";
}

function voucherAvailabilityReason(voucher: StorefrontAccountVoucher): string {
  if (voucher.availability === "available") return voucherConditionLabel(voucher);
  if (voucher.availability === "used") return "Voucher đã được sử dụng";
  if (voucher.availability === "expired") return "Voucher đã hết hạn";
  if (voucher.availability === "upcoming") return "Voucher chưa đến thời gian sử dụng";
  if (voucher.availability === "disabled") return "Voucher đang tạm tắt bởi Admin";
  if (voucher.remainingUses === 0) return "Voucher đã hết lượt sử dụng";
  return "Chưa đủ điều kiện sử dụng";
}

function voucherScore(voucher: StorefrontAccountVoucher): number {
  if (voucher.discountType === "PERCENT") return voucher.maxDiscountValue ?? voucher.discountValue * 1000;
  return voucher.discountValue;
}

export default function AccountVoucherWallet({
  vouchers,
  title,
  shoppingHomeHref,
  showShoppingCta,
}: {
  vouchers: VoucherGroups;
  title: string;
  shoppingHomeHref: string;
  showShoppingCta: boolean;
}): JSX.Element {
  const [filter, setFilter] = useState<VoucherFilter>("all");
  const [sort, setSort] = useState<VoucherSort>("newest");
  const [expandedCode, setExpandedCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const visibleCoupons = useMemo(() => {
    const rows = filter === "all" ? [...vouchers.active, ...vouchers.used, ...vouchers.expired] : [...vouchers[filter]];
    return rows.sort((a, b) => {
      if (sort === "endingSoon") {
        const aTime = a.endAt ? new Date(a.endAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.endAt ? new Date(b.endAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      if (sort === "highestValue") return voucherScore(b) - voucherScore(a);
      return new Date(b.updatedAt || b.startAt || 0).getTime() - new Date(a.updatedAt || a.startAt || 0).getTime();
    });
  }, [filter, sort, vouchers]);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => setCopiedCode(code)).catch(() => setCopiedCode(code));
  };

  const filterTabs: Array<{ key: VoucherFilter; label: string; count: number }> = [
    { key: "all", label: "Tất cả", count: vouchers.active.length + vouchers.used.length + vouchers.expired.length },
    { key: "active", label: "Còn hạn", count: vouchers.active.length },
    { key: "used", label: "Đã dùng", count: vouchers.used.length },
    { key: "expired", label: "Hết hạn", count: vouchers.expired.length },
  ];

  return (
    <section id="voucher" className="w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Đồng bộ trực tiếp từ mã giảm giá Admin đang dùng tại thanh toán.</p>
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value as VoucherSort)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 outline-none focus:border-[#2563EB]">
          <option value="newest">Mới nhất</option>
          <option value="endingSoon">Sắp hết hạn</option>
          <option value="highestValue">Giá trị cao nhất</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setFilter(tab.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === tab.key ? "bg-[#2563EB] text-white" : "bg-[#F8FAFC] text-[#0F172A] hover:bg-blue-50"}`}>
            {tab.label} <span className="opacity-80">({tab.count})</span>
          </button>
        ))}
      </div>

      {visibleCoupons.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2 xl:grid-cols-2">
          {visibleCoupons.map((voucher) => {
            const status = statusUi(voucher);
            const expanded = expandedCode === voucher.code;
            const available = voucher.availability === "available";
            const badges = getGuestCouponBadges(toCheckoutCouponOption(voucher));
            return (
              <article key={`${voucher.availability}-${voucher.code}`} className={`rounded-xl border p-2.5 text-left shadow-sm transition sm:p-3 ${available ? "border-zinc-200 bg-white hover:border-[#2563EB]/60 hover:bg-blue-50/30" : "border-zinc-200 bg-[#F8FAFC] opacity-50"}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${available ? "border-[#2563EB] bg-[#2563EB]" : "border-zinc-300 bg-white"}`} aria-hidden>
                    {available ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-bold text-zinc-900">{voucher.name}</p>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none sm:text-[10px] ${status.className}`}>{status.label}</span>
                    </div>
                    {badges.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {badges.map((badge) => (
                          <span key={badge} className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-zinc-700 sm:text-[10px]">
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{voucher.description || "Ưu đãi theo cấu hình Admin"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#2563EB]">{voucher.code}</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900">{discountLabel(voucher)}</p>
                    {voucher.maxDiscountValue ? <p className="mt-0.5 text-xs font-medium text-zinc-600">Tối đa {formatVnd(voucher.maxDiscountValue)}</p> : null}
                    <p className="mt-0.5 text-xs text-zinc-500">{voucherAvailabilityReason(voucher)} · {available ? `Ước tính theo rule Checkout` : "Không nổi bật"}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">HSD: {formatDate(voucher.endAt)} · Còn lại: {voucher.remainingUses == null ? "Không giới hạn" : voucher.remainingUses.toLocaleString("vi-VN")}</p>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-2 rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-xs text-zinc-600">
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <p><span className="font-bold text-zinc-800">Loại giảm:</span> {discountTypeLabel(voucher)}</p>
                      <p><span className="font-bold text-zinc-800">Loại voucher:</span> {voucher.voucherType}</p>
                      <p><span className="font-bold text-zinc-800">Sản phẩm:</span> {voucher.appliesToProducts}</p>
                      <p><span className="font-bold text-zinc-800">Danh mục:</span> {voucher.appliesToCategories}</p>
                      <p><span className="font-bold text-zinc-800">Người dùng:</span> {voucher.appliesToUsers}</p>
                      <p><span className="font-bold text-zinc-800">Trạng thái Admin:</span> {voucher.status}</p>
                    </div>
                    <div className="mt-2">
                      <p className="font-bold text-zinc-800">Điều kiện sử dụng</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {voucher.specialConditions.map((condition) => <li key={condition}>{condition}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyCode(voucher.code)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#2563EB]">
                    {copiedCode === voucher.code ? "Đã sao chép" : "Sao chép mã"}
                  </button>
                  <button type="button" onClick={() => setExpandedCode(expanded ? "" : voucher.code)} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200">
                    {expanded ? "Thu gọn" : "Xem chi tiết"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-[#F8FAFC] p-6 text-center">
          <p className="text-sm font-bold text-[#0F172A]">Bạn chưa có voucher nào.</p>
          <p className="mt-1 text-xs text-[#64748B]">Voucher khả dụng sẽ xuất hiện khi Admin bật mã phù hợp.</p>
        </div>
      )}

      {showShoppingCta ? (
        <div className="mt-3">
          <a href={shoppingHomeHref} className="inline-flex h-9 items-center rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]">
            Mua sắm ngay
          </a>
        </div>
      ) : null}
    </section>
  );
}
