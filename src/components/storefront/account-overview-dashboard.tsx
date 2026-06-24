"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Gift,
  Headphones,
  Loader2,
  Package,
  ShoppingBag,
  Sparkles,
  Tag,
  TicketPercent,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { StorefrontAccountVoucher } from "../../lib/server/storefront-customer-account-dashboard";

/* ─────────────────────────────────────────────────────────────
   AccountOverviewDashboard — Dashboard SaaS/TMĐT hiện đại
   (Shopify Admin / Shopee Seller / TikTok Shop style)

   Thiết kế:
   - Card radius 20px, padding 20-24px, gap 16px
   - Shadow nhẹ, hiện đại
   - Compact, cao mật độ thông tin
   - Responsive desktop/tablet/mobile
   - KHÔNG thay đổi logic/API/Database — chỉ render lại UI
   ───────────────────────────────────────────────────────────── */

/* ─── Types ─── */

type OrderItem = {
  id: string;
  code: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
};

type NotificationGroups = {
  order: number;
  commission: number;
  promotion: number;
  system: number;
};

type QuickCard = {
  key: string;
  label: string;
  value: number | string;
  enabled: boolean;
};

type ActivityLine = {
  title: string;
  meta: string;
  category?: "order" | "voucher" | "notification" | "reward" | "system";
};

type StatusUi = {
  label: string;
  badgeClass: string;
};

type AccountOverviewDashboardProps = {
  /** 4 KPI cards phía trên */
  quickCards: QuickCard[];
  /** Đơn gần đây */
  orders: OrderItem[];
  /** Nhóm thông báo */
  notificationGroups: NotificationGroups;
  /** Voucher nổi bật */
  vouchers: StorefrontAccountVoucher[];
  /** Hoạt động gần đây */
  activityLines: ActivityLine[];
  /** Helper chuyển trạng thái đơn → UI */
  getOrderStatusUi: (status: string) => StatusUi;
  /** Callback khi click "Xem tất cả voucher" */
  onViewAllVouchers?: () => void;
  /** Callback khi click "Xem tất cả" / "Xem đơn hàng của tôi" — chuyển tab nội bộ qua navigateAccountTab. */
  onGoToOrders?: () => void;
  /** Callback khi click "Tiếp tục mua sắm" */
  shoppingHomeHref?: string;
  /** Hiển thị CTA mua sắm */
  showShoppingCta?: boolean;
  /** Text CTA mua sắm */
  shoppingCtaText?: string;
  /** Hiển thị voucher */
  showCoupons?: boolean;
  /** Hiển thị hỗ trợ */
  showSupport?: boolean;
  /** URL tra cứu đơn */
  orderLookupUrl?: string;
  /** URL hỗ trợ Zalo */
  supportHref?: string;
  /** Toolbar actions bên phải header */
  toolbar?: ReactNode;
  /** Mô tả dưới H1 */
  description?: ReactNode;
  /** Class mobile panel flat (no border x) */
  mobileFlatClass?: string;
};

/* ─── Design tokens ─── */

const CARD_BASE =
  "rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-all hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]";
const CARD_BASE_FLAT =
  "rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)] sm:p-5";
const SECTION_TITLE =
  "text-sm font-bold tracking-[-0.01em] text-slate-800";
const GAP_GRID = "gap-4";

/* ─── KPI Card icons mapping ─── */

const KPI_ICONS: Record<string, { Icon: LucideIcon; tint: string; bg: string }> = {
  orders: { Icon: Package, tint: "text-blue-600", bg: "bg-blue-50" },
  processing: { Icon: Loader2, tint: "text-amber-600", bg: "bg-amber-50" },
  vouchers: { Icon: TicketPercent, tint: "text-emerald-600", bg: "bg-emerald-50" },
  rewards: { Icon: Sparkles, tint: "text-fuchsia-600", bg: "bg-fuchsia-50" },
};

/* ─── Notification KPI icons ─── */

const NOTIF_ICONS: Array<{
  key: keyof NotificationGroups;
  label: string;
  Icon: LucideIcon;
  tint: string;
  bg: string;
}> = [
  { key: "order", label: "Đơn hàng", Icon: ShoppingBag, tint: "text-blue-600", bg: "bg-blue-50" },
  { key: "commission", label: "Hoa hồng", Icon: TrendingUp, tint: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "promotion", label: "Khuyến mãi", Icon: Tag, tint: "text-amber-600", bg: "bg-amber-50" },
  { key: "system", label: "Hệ thống", Icon: Bell, tint: "text-slate-600", bg: "bg-slate-100" },
];

/* ─── Activity icons ─── */

const ACTIVITY_ICONS: Record<string, { Icon: LucideIcon; tint: string; bg: string }> = {
  order: { Icon: Package, tint: "text-blue-600", bg: "bg-blue-50" },
  voucher: { Icon: Gift, tint: "text-emerald-600", bg: "bg-emerald-50" },
  notification: { Icon: Bell, tint: "text-amber-600", bg: "bg-amber-50" },
  reward: { Icon: Sparkles, tint: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  system: { Icon: Headphones, tint: "text-slate-600", bg: "bg-slate-100" },
};

const ACTIVITY_BADGE: Record<string, { label: string; cls: string }> = {
  order: { label: "Đơn hàng", cls: "bg-blue-50 text-blue-700" },
  voucher: { label: "Ưu đãi", cls: "bg-emerald-50 text-emerald-700" },
  notification: { label: "Thông báo", cls: "bg-amber-50 text-amber-700" },
  reward: { label: "Tích lũy", cls: "bg-fuchsia-50 text-fuchsia-700" },
  system: { label: "Hệ thống", cls: "bg-slate-100 text-slate-700" },
};

/* ─── Voucher helpers (mini) ─── */

function voucherBadge(v: StorefrontAccountVoucher): { label: string; cls: string } | null {
  if (v.code.toUpperCase().includes("VIP") || v.name.toUpperCase().includes("VIP")) {
    return { label: "VIP", cls: "bg-gradient-to-r from-amber-500 to-yellow-400 text-white" };
  }
  if (v.discountType === "FREE_SHIPPING" || v.freeShipping) {
    return { label: "FREESHIP", cls: "bg-emerald-500 text-white" };
  }
  if (v.endAt) {
    const diff = new Date(v.endAt).getTime() - Date.now();
    if (diff > 0 && diff <= 2 * 24 * 60 * 60 * 1000) {
      return { label: "SẮP HẾT", cls: "bg-orange-500 text-white" };
    }
  }
  if (v.usageLimit && v.usedCount && v.usedCount / v.usageLimit >= 0.7) {
    return { label: "HOT", cls: "bg-rose-500 text-white" };
  }
  return null;
}

function voucherHeadline(v: StorefrontAccountVoucher): string {
  const fmt = new Intl.NumberFormat("vi-VN");
  if (v.discountType === "PERCENT") return `Giảm ${v.discountValue}%`;
  if (v.discountType === "FREE_SHIPPING") return `Freeship ${fmt.format(v.discountValue)}đ`;
  return `Giảm ${fmt.format(v.discountValue)}đ`;
}

function voucherExpiry(v: StorefrontAccountVoucher): string | null {
  if (!v.endAt) return null;
  const d = new Date(v.endAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ─── Format helpers ─── */

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/* ─── Main Component ─── */

function AccountOverviewDashboardInner({
  quickCards,
  orders,
  notificationGroups,
  vouchers,
  activityLines,
  getOrderStatusUi,
  onViewAllVouchers,
  onGoToOrders,
  shoppingHomeHref = "/",
  showShoppingCta = true,
  shoppingCtaText = "Tiếp tục mua sắm",
  showCoupons = true,
  showSupport = true,
  orderLookupUrl,
  supportHref = "/lien-he",
  toolbar,
  description = "Tổng hợp đơn hàng, ưu đãi và hoạt động tài khoản gần nhất.",
  mobileFlatClass = "",
}: AccountOverviewDashboardProps): JSX.Element {
  const topOrders = useMemo(() => orders.slice(0, 3), [orders]);
  const topVouchers = useMemo(() => vouchers.slice(0, 2), [vouchers]);
  // Mặc định hiển thị tối đa 6 hoạt động mới nhất (yêu cầu tối ưu Dashboard).
  // Thứ tự (mới nhất trước) đã được view sắp xếp sẵn theo thời gian — KHÔNG sort lại
  // trong dashboard vì `meta` có thể là nhãn text ("Ưu đãi", "Tích lũy") chứ không
  // phải timestamp, sort sẽ làm hỏng thứ tự.
  const ACTIVITY_PREVIEW_MAX = 6;
  const [showAllActivity, setShowAllActivity] = useState(false);
  const topActivity = useMemo(
    () => activityLines.slice(0, ACTIVITY_PREVIEW_MAX),
    [activityLines],
  );
  const visibleActivity = showAllActivity ? activityLines : topActivity;
  const hasMoreActivity = activityLines.length > ACTIVITY_PREVIEW_MAX;
  const enabledCards = useMemo(() => quickCards.filter((c) => c.enabled), [quickCards]);

  return (
    <section
      className={`w-full min-w-0 rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-5 lg:rounded-[24px] lg:p-6 lg:shadow-[0_8px_30px_rgba(15,23,42,0.04)] ${mobileFlatClass}`}
      aria-labelledby="tong-quan-title"
    >
      {/* ─── Header: H1 + mô tả + action bên phải ─── */}
      <header className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h2
            id="tong-quan-title"
            className="text-xl font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-2xl lg:text-[26px]"
          >
            Tổng quan tài khoản
          </h2>
          <p className="text-sm leading-relaxed text-slate-500 sm:text-[13px] sm:leading-snug">
            {description}
          </p>
        </div>
        {toolbar ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div>
        ) : null}
      </header>

      {/* ─── 4 KPI cards (compact dashboard cards, grid 2 cột) ─── */}
      {enabledCards.length > 0 ? (
        <div
          className={`mt-4 grid min-w-0 grid-cols-2 ${GAP_GRID} lg:mt-5 lg:grid-cols-4`}
          role="region"
          aria-label="Thống kê nhanh"
        >
          {enabledCards.map((card) => {
            const meta = KPI_ICONS[card.key] ?? KPI_ICONS.rewards;
            const Icon = meta.Icon;
            const displayValue =
              typeof card.value === "number" ? card.value.toLocaleString("vi-VN") : String(card.value);
            return (
              <article
                key={`kpi-${card.key}`}
                className={`${CARD_BASE} flex flex-col gap-2.5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-3`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[12px] font-semibold leading-tight text-slate-500 sm:text-[13px]">
                    {card.label}
                  </p>
                  <p className="text-[22px] font-black leading-none tracking-[-0.04em] text-slate-900 tabular-nums sm:text-[26px] lg:text-[28px]">
                    {displayValue}
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} sm:h-10 sm:w-10`}
                  aria-hidden
                >
                  <Icon className={`h-4 w-4 ${meta.tint} sm:h-5 sm:w-5`} strokeWidth={2.2} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* ─── Row 2: Đơn gần đây + Thông báo mới (KPI ngang) ─── */}
      <div className={`mt-4 grid min-w-0 grid-cols-1 ${GAP_GRID} lg:mt-5 lg:grid-cols-2`}>
        {/* Đơn gần đây */}
        <article className={`${CARD_BASE} flex flex-col gap-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.2} aria-hidden />
              <h3 className={SECTION_TITLE}>Đơn gần đây</h3>
            </div>
            {onGoToOrders ? (
              <button
                type="button"
                onClick={onGoToOrders}
                className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Xem tất cả
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </div>
          {topOrders.length ? (
            <ul className="flex flex-col divide-y divide-slate-100">
              {topOrders.map((order) => {
                const ui = getOrderStatusUi(order.orderStatus);
                return (
                  <li
                    key={order.id}
                    className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-bold tabular-nums text-slate-900">
                          #{order.code}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${ui.badgeClass}`}
                      >
                        {ui.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900">
                      {formatVnd(order.totalAmount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-2 py-1">
              <p className="text-[13px] leading-relaxed text-slate-500">Bạn chưa có đơn hàng nào.</p>
              <div className="flex flex-wrap items-center gap-2">
                {onGoToOrders ? (
                  <button
                    type="button"
                    onClick={onGoToOrders}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-blue-600 transition hover:border-blue-200 hover:bg-blue-50/60"
                  >
                    Xem đơn hàng của tôi
                  </button>
                ) : null}
                {showShoppingCta ? (
                  <Link
                    href={shoppingHomeHref}
                    className="inline-flex h-8 items-center rounded-lg bg-amber-500 px-3 text-[12px] font-semibold text-white transition hover:bg-amber-600"
                  >
                    Mua sắm ngay
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </article>

        {/* Thông báo mới — KPI ngang */}
        <article className={`${CARD_BASE} flex flex-col gap-3`}>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.2} aria-hidden />
            <h3 className={SECTION_TITLE}>Thông báo mới</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {NOTIF_ICONS.map(({ key, label, Icon, tint, bg }) => (
              <div
                key={key}
                className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
                  aria-hidden
                >
                  <Icon className={`h-3.5 w-3.5 ${tint}`} strokeWidth={2.2} />
                </div>
                <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="text-[18px] font-black leading-none tracking-[-0.03em] text-slate-900 tabular-nums">
                  {notificationGroups[key]}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* ─── Row 3: Voucher nổi bật + Hỗ trợ nhanh ─── */}
      <div className={`mt-4 grid min-w-0 grid-cols-1 ${GAP_GRID} lg:mt-5 lg:grid-cols-2`}>
        {/* Voucher nổi bật — mini card */}
        {showCoupons ? (
          <article className={`${CARD_BASE} flex flex-col gap-3`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.2} aria-hidden />
                <h3 className={SECTION_TITLE}>Voucher nổi bật</h3>
              </div>
              {onViewAllVouchers ? (
                <button
                  type="button"
                  onClick={onViewAllVouchers}
                  className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Xem tất cả voucher
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                </button>
              ) : null}
            </div>
            {topVouchers.length ? (
              <ul className="flex flex-col gap-2">
                {topVouchers.map((v) => {
                  const badge = voucherBadge(v);
                  const headline = voucherHeadline(v);
                  const expiry = voucherExpiry(v);
                  return (
                    <li
                      key={v.id}
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-2.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        {v.discountType === "FREE_SHIPPING" || v.freeShipping ? (
                          <Truck className="h-4 w-4" strokeWidth={2.2} />
                        ) : (
                          <Tag className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-[12px] font-bold leading-tight text-slate-900">
                            {headline}
                          </p>
                          {badge ? (
                            <span
                              className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-tight tracking-wide ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] leading-tight text-slate-500" title={v.name}>
                          {v.name}
                        </p>
                        <div className="flex min-w-0 items-center gap-2 text-[10px] text-slate-400">
                          <code className="rounded border border-dashed border-slate-300 bg-slate-50 px-1 py-0.5 text-[9px] font-bold tracking-wide text-slate-700">
                            {v.code}
                          </code>
                          {expiry ? <span className="truncate">Hạn: {expiry}</span> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13px] leading-relaxed text-slate-500">Chưa có voucher còn hạn.</p>
            )}
          </article>
        ) : null}

        {/* Hỗ trợ nhanh — action card */}
        {showSupport ? (
          <article className={`${CARD_BASE} flex flex-col gap-3`}>
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 shrink-0 text-fuchsia-600" strokeWidth={2.2} aria-hidden />
              <h3 className={SECTION_TITLE}>Hỗ trợ nhanh</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {orderLookupUrl ? (
                <li>
                  <Link
                    href={orderLookupUrl}
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Package className="h-4 w-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-[13px] font-bold leading-tight text-slate-900">Tra cứu đơn hàng</p>
                      <p className="truncate text-[11px] leading-tight text-slate-500">
                        Kiểm tra trạng thái đơn hàng của bạn
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </Link>
                </li>
              ) : null}
              <li>
                <Link
                  href={supportHref}
                  target={supportHref.startsWith("http") ? "_blank" : undefined}
                  rel={supportHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Headphones className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-[13px] font-bold leading-tight text-slate-900">
                      {supportHref.startsWith("http") ? "Chat Zalo" : "Liên hệ hỗ trợ"}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-slate-500">
                      Hotline / chat trực tiếp với shop
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600"
                    strokeWidth={2.2}
                    aria-hidden
                  />
                </Link>
              </li>
              {showShoppingCta ? (
                <li>
                  <Link
                    href={shoppingHomeHref}
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 transition hover:border-amber-200 hover:bg-amber-50/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-[13px] font-bold leading-tight text-slate-900">
                        {shoppingCtaText}
                      </p>
                      <p className="truncate text-[11px] leading-tight text-slate-500">
                        Khám phá sản phẩm & ưu đãi mới
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-amber-600"
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </Link>
                </li>
              ) : null}
            </ul>
          </article>
        ) : null}
      </div>

      {/* ─── Row 4: Hoạt động gần đây — timeline tối ưu (Shopee/Shopify/TikTok Seller) ─── */}
      <article
        className={`${CARD_BASE_FLAT} mt-4 flex flex-col gap-2.5 lg:mt-5`}
        aria-labelledby="hoat-dong-gan-day-title"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.2} aria-hidden />
            <h3 id="hoat-dong-gan-day-title" className={SECTION_TITLE}>
              Hoạt động gần đây
            </h3>
          </div>
          {activityLines.length > 0 ? (
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
              {showAllActivity ? activityLines.length : Math.min(activityLines.length, ACTIVITY_PREVIEW_MAX)}/
              {activityLines.length}
            </span>
          ) : null}
        </div>

        {visibleActivity.length ? (
          <>
            <ul
              id="hoat-dong-gan-day-list"
              className={
                showAllActivity
                  ? "flex max-h-[420px] flex-col divide-y divide-slate-100 overflow-y-auto pr-1 lg:max-h-[520px]"
                  : "flex flex-col divide-y divide-slate-100"
              }
            >
              {visibleActivity.map((line, i) => {
                const cat = line.category ?? "system";
                const meta = ACTIVITY_ICONS[cat] ?? ACTIVITY_ICONS.system;
                const Icon = meta.Icon;
                const badge = ACTIVITY_BADGE[cat] ?? ACTIVITY_BADGE.system;
                return (
                  <li
                    key={`${line.title}-${i}`}
                    className="flex min-w-0 items-center gap-2.5 px-0.5 py-2 first:pt-1 last:pb-1 sm:gap-3 sm:px-1"
                    style={{ minHeight: "48px", maxHeight: "56px" }}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                      aria-hidden
                    >
                      <Icon className={`h-3.5 w-3.5 ${meta.tint}`} strokeWidth={2.2} />
                    </div>
                    <p
                      className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-slate-700"
                      title={line.title}
                    >
                      {line.title}
                    </p>
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight sm:inline-block ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <span className="w-[64px] shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-400 sm:w-[72px]">
                      {line.meta}
                    </span>
                  </li>
                );
              })}
            </ul>

            {hasMoreActivity ? (
              <button
                type="button"
                onClick={() => setShowAllActivity((v) => !v)}
                className="mt-0.5 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-expanded={showAllActivity}
                aria-controls="hoat-dong-gan-day-list"
              >
                {showAllActivity ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 rotate-180" strokeWidth={2.2} aria-hidden />
                    <span>Thu gọn</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                    <span>Xem tất cả hoạt động</span>
                    <span className="text-slate-400">({activityLines.length})</span>
                  </>
                )}
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-slate-500">
            Các hoạt động đơn hàng, ưu đãi và thông báo sẽ hiển thị tại đây.
          </p>
        )}
      </article>
    </section>
  );
}

export const AccountOverviewDashboard = memo(AccountOverviewDashboardInner);
