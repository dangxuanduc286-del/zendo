"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CustomerAccountSettings } from "../../lib/settings";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  normalizeCartItem,
  type GuestCartItem,
} from "../../lib/cart";
import type {
  AccountOrderPhase2ApiStatusFilter,
  AccountOrdersDateRangePreset,
  OrderTimelineStep,
} from "../../lib/order-status";
import { canCancelOrder, canReorder } from "../../lib/order-status";
import { effectiveAffiliateBlockMessage } from "../../lib/account-role";
import { safeParseJson } from "../../lib/safe-json";

const PAYMENT_METHOD_VI: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  CREDIT_CARD: "Thẻ tín dụng / ghi nợ",
  E_WALLET: "Ví điện tử",
};

const PAYMENT_STATUS_VI: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Hoàn tiền một phần",
};

function formatPaymentMethod(m: string): string {
  return PAYMENT_METHOD_VI[m] ?? m;
}

function formatPaymentStatus(s: string): string {
  return PAYMENT_STATUS_VI[s] ?? s;
}

function formatMoney(v: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(v)}₫`;
}

function toneBadgeClass(tone: string): string {
  switch (tone) {
    case "info":
      return "bg-blue-50 text-blue-800";
    case "warning":
      return "bg-amber-50 text-amber-800";
    case "success":
      return "bg-emerald-50 text-emerald-800";
    case "danger":
      return "bg-rose-50 text-rose-800";
    case "muted":
      return "bg-slate-100 text-slate-700";
    case "neutral":
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

function paymentBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
  if (s === "PARTIALLY_REFUNDED" || s === "REFUNDED") return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  if (s === "PENDING") return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  if (s === "FAILED") return "bg-rose-50 text-rose-800 ring-1 ring-rose-100";
  return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200";
}

/** Timeline dọc — không tràn ngang (mobile). Dùng dữ liệu `timeline` từ API / `getAccountOrderTimeline`. */
function OrderTimelineRail({
  timeline,
}: {
  timeline: { finalLabel: string; steps: OrderTimelineStep[] };
}): JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tiến trình đơn hàng</p>
      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{timeline.finalLabel}</p>
      <ol className="mt-4 space-y-0">
        {timeline.steps.map((step, idx) => {
          const showConnector = idx < timeline.steps.length - 1;
          return (
            <li key={step.key} className="flex min-w-0 gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center">
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold leading-none ${
                    step.active
                      ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                      : step.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-[#CBD5E1] bg-white text-transparent"
                  }`}
                  aria-hidden
                >
                  {step.done || step.active ? "✓" : ""}
                </span>
                {showConnector ? (
                  <span className="my-0.5 min-h-[20px] w-px flex-1 bg-[#E2E8F0]" aria-hidden />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-5 last:pb-0">
                <p
                  className={`text-sm leading-snug ${
                    step.active
                      ? "font-semibold text-[#1D4ED8]"
                      : step.done
                        ? "font-medium text-[#0F172A]"
                        : "text-[#94A3B8]"
                  }`}
                >
                  {step.label}
                </p>
                {step.active ? (
                  <p className="mt-0.5 text-xs text-[#2563EB]">Trạng thái hiện tại</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function reorderSkipReasonVi(reason: string): string {
  if (reason === "NOT_FOUND") return "Không tìm thấy sản phẩm";
  if (reason === "PRODUCT_INACTIVE") return "Sản phẩm ngừng bán";
  if (reason === "OUT_OF_STOCK") return "Hết hàng";
  return reason;
}

function buildSkippedToastLines(skipped: unknown[]): string {
  return skipped
    .slice(0, 12)
    .map((raw) => {
      const row = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const name = String(row.productName ?? "Sản phẩm").trim().slice(0, 56);
      const reason = reorderSkipReasonVi(String(row.reason ?? ""));
      const qty = typeof row.quantityRequested === "number" ? row.quantityRequested : "";
      const qtyTxt = qty !== "" ? ` ×${qty}` : "";
      return `• ${name}${qtyTxt} — ${reason}`;
    })
    .join("\n");
}

function SectionLabel({ children }: { children: ReactNode }): JSX.Element {
  return <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{children}</p>;
}

/** Nội dung chi tiết đơn trong modal — bố cục 2 cột desktop, không tràn ngang mobile. */
function OrderDetailModalContent({
  order,
  safeSupportHref,
  supportLabel,
}: {
  order: Record<string, unknown>;
  safeSupportHref: string;
  supportLabel: string;
}): JSX.Element {
  const amounts =
    typeof order.amounts === "object" && order.amounts !== null
      ? (order.amounts as Record<string, unknown>)
      : null;
  const subtotal = amounts ? Number(amounts.subtotal ?? 0) : 0;
  const discount = amounts ? Number(amounts.discount ?? 0) : 0;
  const shipping = amounts ? Number(amounts.shippingFee ?? 0) : 0;
  const total = amounts ? Number(amounts.total ?? 0) : 0;
  const coupon =
    typeof order.coupon === "object" && order.coupon !== null ? (order.coupon as Record<string, unknown>) : null;
  const couponCode = coupon?.code != null ? String(coupon.code) : "";
  const couponName = coupon?.name != null ? String(coupon.name) : "";
  const showDiscountAmount = discount > 0.005;

  const paymentMethodRaw = typeof order.paymentMethod === "string" ? order.paymentMethod : "";
  const paymentStatusRaw = typeof order.paymentStatus === "string" ? order.paymentStatus : "";
  const statusLabel = String(order.statusLabel ?? "");
  const statusTone = String(order.statusTone ?? "neutral");

  const timelineRaw = order.timeline as { finalLabel?: string; steps?: OrderTimelineStep[] } | undefined;
  const timeline =
    timelineRaw && Array.isArray(timelineRaw.steps) && timelineRaw.steps.length > 0
      ? {
          finalLabel: String(timelineRaw.finalLabel ?? ""),
          steps: timelineRaw.steps as OrderTimelineStep[],
        }
      : null;

  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];

  const recipient =
    typeof order.recipient === "object" && order.recipient !== null
      ? (order.recipient as Record<string, unknown>)
      : null;
  const lineParts = recipient
    ? [recipient.line1, recipient.line2, recipient.ward, recipient.district, recipient.city].filter(Boolean)
    : [];

  const createdRaw = typeof order.createdAt === "string" ? order.createdAt : "";
  const placedAt = createdRaw ? new Date(createdRaw).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="min-w-0 space-y-5 text-[#0F172A]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[#E2E8F0] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionLabel>Mã đơn hàng</SectionLabel>
          <p className="mt-0.5 break-all text-xl font-bold tracking-tight text-[#0F172A]">
            #{String(order.code ?? "").trim() || "—"}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Ngày đặt: {placedAt}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {statusLabel ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneBadgeClass(statusTone)}`}>
              {statusLabel}
            </span>
          ) : null}
          {paymentStatusRaw ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentBadgeClass(paymentStatusRaw)}`}>
              {formatPaymentStatus(paymentStatusRaw)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
        <div className="min-w-0 space-y-5">
          {timeline ? <OrderTimelineRail timeline={timeline} /> : null}

          <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <SectionLabel>Sản phẩm</SectionLabel>
            <ul className="mt-3 space-y-4">
              {items.map((it) => {
                const imageUrl = typeof it.imageUrl === "string" ? it.imageUrl.trim() : "";
                const alt = typeof it.imageAlt === "string" ? it.imageAlt : String(it.name ?? "Sản phẩm");
                const slug = typeof it.slug === "string" ? it.slug.trim() : "";
                const variant = typeof it.variantName === "string" ? it.variantName.trim() : "";
                const qty = Number(it.quantity ?? 0);
                const unit = Number(it.unitPrice ?? 0);
                const lineTot = Number(it.lineTotal ?? 0);
                return (
                  <li key={String(it.id ?? "")} className="flex min-w-0 gap-3 border-b border-[#F1F5F9] pb-4 last:border-0 last:pb-0">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={alt}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-[#94A3B8]">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-[#0F172A]">{String(it.name ?? "Sản phẩm")}</p>
                      {variant ? (
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          Phân loại: <span className="font-medium text-[#475569]">{variant}</span>
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-[#64748B]">SKU: {String(it.sku ?? "—")}</p>
                      <div className="mt-2 flex min-w-0 flex-col gap-1 text-xs text-[#475569] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">
                        <span>
                          Đơn giá: <span className="tabular-nums font-medium text-[#0F172A]">{formatMoney(unit)}</span>
                        </span>
                        <span className="tabular-nums">
                          SL: <span className="font-semibold">{qty}</span>
                        </span>
                        <span>
                          Thành tiền:{" "}
                          <span className="tabular-nums font-semibold text-[#0F172A]">{formatMoney(lineTot)}</span>
                        </span>
                      </div>
                      {slug ? (
                        <Link
                          href={`/san-pham/${encodeURIComponent(slug)}`}
                          className="mt-2 inline-flex text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          Xem sản phẩm
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-white p-4 shadow-sm ring-1 ring-[#BFDBFE]/60">
            <SectionLabel>Tổng thanh toán</SectionLabel>
            <p className="mt-2 break-all text-2xl font-bold tabular-nums text-[#1D4ED8]">{formatMoney(total)}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3 border-t border-[#DBEAFE] pt-3">
                <dt className="text-[#64748B]">Tạm tính</dt>
                <dd className="tabular-nums font-medium">{formatMoney(subtotal)}</dd>
              </div>
              {showDiscountAmount ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#64748B]">Giảm giá {couponCode ? `(mã ${couponCode})` : ""}</dt>
                    <dd className="tabular-nums font-medium text-rose-700">-{formatMoney(discount)}</dd>
                  </div>
                  {couponName ? <p className="text-[11px] text-[#64748B]">{couponName}</p> : null}
                </>
              ) : null}
              {!showDiscountAmount && couponCode ? (
                <p className="text-xs text-[#64748B]">
                  Ưu đãi đi kèm đơn: <span className="font-semibold">{couponCode}</span>
                  {couponName ? <span>{` — ${couponName}`}</span> : null}
                </p>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Phí vận chuyển</dt>
                <dd className="tabular-nums font-medium">{shipping > 0 ? formatMoney(shipping) : "Miễn phí / 0₫"}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#BFDBFE] pt-3 text-base font-semibold">
                <dt className="text-[#0F172A]">Khách phải trả</dt>
                <dd className="tabular-nums text-[#1D4ED8]">{formatMoney(total)}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-1 border-t border-[#DBEAFE] pt-4 text-xs">
              <p className="font-semibold text-[#475569]">Thanh toán</p>
              <p>{paymentMethodRaw ? formatPaymentMethod(paymentMethodRaw) : "—"}</p>
              {paymentStatusRaw ? (
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentBadgeClass(paymentStatusRaw)}`}>
                  {formatPaymentStatus(paymentStatusRaw)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm">
            <SectionLabel>Người nhận và địa chỉ</SectionLabel>
            {recipient ? (
              <div className="mt-2 space-y-1.5 break-words text-[#334155]">
                <p className="font-semibold text-[#0F172A]">{String(recipient.fullName ?? "")}</p>
                <p>
                  SĐT: <span className="font-medium">{String(recipient.phone ?? "")}</span>
                </p>
                {recipient.email ? <p className="text-xs">Email: {String(recipient.email)}</p> : null}
                {lineParts.length ? <p className="leading-relaxed">{lineParts.map(String).join(", ")}</p> : null}
                {typeof recipient.fullAddress === "string" && recipient.fullAddress.trim() ? (
                  <p className="text-xs leading-relaxed text-[#64748B]">{recipient.fullAddress.trim()}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#64748B]">Không có dữ liệu người nhận.</p>
            )}
          </div>

          {typeof order.note === "string" && order.note.trim() ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 p-3 text-sm">
              <SectionLabel>Ghi chú đơn</SectionLabel>
              <p className="mt-2 whitespace-pre-wrap break-words text-[#92400E]">{order.note.trim()}</p>
            </div>
          ) : null}

          {order.canceledAt || order.cancelReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <p className="font-semibold">Đơn đã hủy</p>
              {order.canceledAt ? (
                <p className="mt-1">Thời gian hủy: {new Date(String(order.canceledAt)).toLocaleString("vi-VN")}</p>
              ) : null}
              {order.cancelReason ? (
                <p className="mt-1 whitespace-pre-wrap break-words">Lý do: {String(order.cancelReason)}</p>
              ) : null}
            </div>
          ) : null}

          <Link
            href={safeSupportHref}
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#0F172A] px-4 text-center text-sm font-semibold text-white hover:bg-[#1e293b]"
          >
            {supportLabel}
          </Link>
        </aside>
      </div>
    </div>
  );
}

type ListOrderApi = {
  id: string;
  code: string;
  orderStatus: string;
  statusLabel: string;
  statusTone: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  canceledAt?: string | null;
};

function mergeReorderIntoGuestCart(incoming: unknown[]): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  const parsed = safeParseJson<unknown[]>(raw ?? "[]", [], "purchase-history:read-cart");
  const cart = (Array.isArray(parsed) ? parsed : []).map(normalizeCartItem).filter((x): x is GuestCartItem => Boolean(x));
  let addedKinds = 0;
  for (const row of incoming) {
    const item = normalizeCartItem(row);
    if (!item) continue;
    const idx = cart.findIndex((x) => x.id === item.id || x.productId === item.productId);
    const stockCap =
      item.stockQuantity != null && Number.isFinite(item.stockQuantity)
        ? Math.max(1, Math.floor(Number(item.stockQuantity)))
        : 999_999;
    if (idx >= 0) {
      const mergedQty = cart[idx].quantity + item.quantity;
      cart[idx] = {
        ...cart[idx],
        quantity: Math.min(mergedQty, stockCap),
        stockQuantity: item.stockQuantity ?? cart[idx].stockQuantity,
      };
    } else {
      cart.push({
        ...item,
        quantity: Math.min(Math.max(1, item.quantity), stockCap),
      });
    }
    addedKinds += 1;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  return addedKinds;
}

const PHASE2_STATUS_ROWS: Array<{ key: AccountOrderPhase2ApiStatusFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "processing", label: "Đang xử lý" },
  { key: "shipping", label: "Đang giao" },
  { key: "completed", label: "Hoàn thành" },
  { key: "canceled", label: "Đã hủy" },
  { key: "refunded", label: "Hoàn / hoàn tiền" },
];

const DATE_PRESETS: Array<{ key: AccountOrdersDateRangePreset; label: string }> = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "3m", label: "3 tháng" },
  { key: "all", label: "Tất cả" },
];

export default function PurchaseHistoryPanel({
  settings,
  supportHref,
  hideBuyerCommerceActions,
}: {
  settings: CustomerAccountSettings;
  supportHref: string;
  /** CTV chỉ affiliate: chỉ đọc lịch sử, không mua lại / CTA vào cửa hàng. */
  hideBuyerCommerceActions?: boolean;
}): JSX.Element {
  const commerceLocked = hideBuyerCommerceActions === true;
  const pageSizeServer = Math.min(Math.max(settings.purchaseHistoryPageSize ?? 20, 1), 50);
  const title = settings.purchaseHistoryTitle?.trim() || "Lịch sử mua hàng";

  const [statusApi, setStatusApi] = useState<AccountOrderPhase2ApiStatusFilter>("all");
  const effectiveStatus = settings.enableOrderStatusFilter ? statusApi : "all";
  const [datePreset, setDatePreset] = useState<AccountOrdersDateRangePreset>("all");
  const effectiveDate = settings.enableOrderDateFilter ? datePreset : "all";
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [orders, setOrders] = useState<ListOrderApi[]>([]);
  const [meta, setMeta] = useState({ total: 0, hasMore: false, page: 1, pageSize: pageSizeServer });
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailJson, setDetailJson] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setPage(1);
  }, [effectiveStatus, effectiveDate, searchQuery, pageSizeServer]);

  useEffect(() => {
    if (!settings.enableOrderSearch) {
      setSearchQuery("");
      setSearchInput("");
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchInput, settings.enableOrderSearch]);

  useEffect(() => {
    let cancelled = false;
    const append = page > 1;
    async function load() {
      if (append) setLoadMoreLoading(true);
      else setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSizeServer),
          statusFilter: effectiveStatus,
          dateRange: effectiveDate,
        });
        if (settings.enableOrderSearch && searchQuery) qs.set("search", searchQuery);
        const res = await fetch(`/api/account/orders?${qs.toString()}`, { method: "GET", cache: "no-store" });
        const payload = (await res.json()) as {
          orders?: ListOrderApi[];
          meta?: { total: number; hasMore: boolean; page: number; pageSize: number };
          message?: string;
        };
        if (!res.ok) throw new Error(payload.message || "Không thể tải danh sách đơn.");
        if (cancelled) return;
        const nextOrders = payload.orders ?? [];
        const m = payload.meta ?? { total: 0, hasMore: false, page, pageSize: pageSizeServer };
        setMeta({ total: m.total, hasMore: m.hasMore, page: m.page, pageSize: m.pageSize });
        if (append) setOrders((prev) => [...prev, ...nextOrders]);
        else setOrders(nextOrders);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không thể tải danh sách đơn.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadMoreLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveDate,
    effectiveStatus,
    page,
    pageSizeServer,
    reloadKey,
    searchQuery,
    settings.enableOrderSearch,
  ]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.includes("\n") ? 8200 : 4800;
    const t = window.setTimeout(() => setToast(""), ms);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!detailId) {
      setDetailJson(null);
      setDetailError("");
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    setDetailJson(null);
    void (async () => {
      try {
        const res = await fetch(`/api/account/orders/${encodeURIComponent(detailId)}`, { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(typeof body.message === "string" ? body.message : "Không thể tải chi tiết đơn.");
        if (!cancelled) setDetailJson(body);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Không thể tải chi tiết đơn.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const supportLabel =
    settings.orderSupportText?.trim() || "Liên hệ hỗ trợ về đơn hàng";
  const trimmedSupportHref = supportHref.trim();
  const safeSupportHref =
    trimmedSupportHref && trimmedSupportHref !== "#" ? trimmedSupportHref : "/lien-he";

  const bumpReload = () => {
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const openDetail = (id: string) => {
    if (!settings.enableOrderDetail) return;
    setDetailId(id);
  };

  const onStartCancel = (orderId: string) => {
    setCancelId(orderId);
    setCancelReason("");
    setCancelError("");
  };

  const submitCancel = async () => {
    if (!cancelId) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelError("Vui lòng nhập lý do hủy (tối thiểu 3 ký tự).");
      return;
    }
    setCancelSubmitting(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/account/orders/${encodeURIComponent(cancelId)}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(body.message || "Không thể hủy đơn.");
      if (detailId === cancelId) setDetailId(null);
      setCancelId(null);
      setCancelReason("");
      setToast("Đã hủy đơn hàng thành công.\nDanh sách đơn đã được cập nhật.");
      bumpReload();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Không thể hủy đơn.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const runReorder = async (orderId: string) => {
    if (!settings.enableReorder) return;
    setReorderBusyId(orderId);
    try {
      const res = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/reorder`, { method: "POST" });
      const body = (await res.json()) as {
        items?: unknown[];
        skipped?: unknown[];
        message?: string;
        hint?: string | null;
      };
      if (!res.ok) throw new Error(body.message || "Không thể xử lý mua lại.");
      const items = Array.isArray(body.items) ? body.items : [];
      const skipped = Array.isArray(body.skipped) ? body.skipped : [];
      if (!items.length) {
        const hint =
          typeof body.hint === "string" && body.hint.trim()
            ? body.hint
            : skipped.length > 0
              ? "Không có dòng nào thêm được vào giỏ (thiếu hàng / sản phẩm không còn bán)."
              : "Không có sản phẩm khả dụng để mua lại.";
        setToast([hint, skipped.length ? buildSkippedToastLines(skipped) : ""].filter(Boolean).join("\n"));
        bumpReload();
        return;
      }
      const addedKinds = mergeReorderIntoGuestCart(items);
      const toastLines = [
        `Đã thêm ${addedKinds} mặt hàng vào giỏ (lưu trên trình duyệt của bạn).`,
        ...(skipped.length
          ? [
              `${skipped.length} dòng bị bỏ qua:`,
              buildSkippedToastLines(skipped),
              "Mở trang Giỏ hàng để kiểm tra và chỉnh số lượng.",
            ]
          : ["Mở trang Giỏ hàng để tiếp tục.", "Danh sách đơn đã được làm mới."]),
      ];
      setToast(toastLines.join("\n"));
      bumpReload();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Không thể mua lại.");
    } finally {
      setReorderBusyId(null);
    }
  };

  const detailOrder = (
    typeof detailJson === "object" && detailJson !== null && "order" in detailJson
      ? (detailJson as { order: Record<string, unknown> }).order
      : null
  ) as Record<string, unknown> | null;

  const rows = orders.map((order) => (
    <PurchaseHistoryOrderRow
      key={order.id}
      order={order}
      settings={settings}
      commerceLocked={commerceLocked}
      reorderBusy={reorderBusyId === order.id}
      safeSupportHref={safeSupportHref}
      supportLabel={supportLabel}
      onOpenDetail={openDetail}
      onStartCancel={onStartCancel}
      onReorder={runReorder}
    />
  ));

  return (
    <section
      className="w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6"
      aria-labelledby="purchase-history-heading"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 id="purchase-history-heading" className="text-base font-semibold text-[#0F172A] sm:text-lg">
          {title}
        </h3>
        <p className="text-xs text-[#64748B] sm:max-w-xs sm:text-right">
          {meta.total > 0 ? `${meta.total} đơn theo bộ lọc hiện tại` : null}
        </p>
      </div>

      {toast ? (
        <div
          className="mt-3 whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-950"
          role="status"
        >
          {toast.split("\n").map((line, lineIdx) => (
            <p key={`${lineIdx}-${line.slice(0, 32)}`} className="min-w-0 break-words first:mt-0 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 min-w-0 space-y-3">
        {settings.enableOrderStatusFilter ? (
          <div className="-mx-1 min-w-0 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2 px-1 sm:flex-wrap sm:gap-2">
              {PHASE2_STATUS_ROWS.map((row) => {
                const active = statusApi === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setStatusApi(row.key)}
                    className={`min-h-10 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold sm:text-sm ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                        : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {row.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {settings.enableOrderDateFilter ? (
          <div className="-mx-1 min-w-0 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full flex-nowrap items-center gap-2 px-1 sm:flex-wrap">
              <span className="shrink-0 text-xs font-medium text-[#64748B]">Thời gian:</span>
              {DATE_PRESETS.map((row) => {
                const active = datePreset === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setDatePreset(row.key)}
                    className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                      active
                        ? "border-[#F59E0B] bg-amber-50 text-[#B45309]"
                        : "border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {row.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {settings.enableOrderSearch ? (
          <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <span className="sr-only">Tìm mã đơn</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã đơn, tên sản phẩm..."
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] outline-none"
              autoComplete="off"
            />
          </label>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

      {loading && !orders.length ? (
        <p className="mt-6 text-center text-sm text-[#64748B]">Đang tải đơn hàng...</p>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-[#0F172A]">
            {settings.emptyPurchaseHistoryText?.trim() || "Bạn chưa có đơn hàng trong lịch sử này."}
          </p>
          {!commerceLocked ? (
            <Link
              href={settings.continueShoppingUrl || "/"}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              {settings.shoppingCtaText || "Tiếp tục mua sắm"}
            </Link>
          ) : (
            <p className="mx-auto mt-4 max-w-md text-xs leading-snug text-[#64748B]">
              {effectiveAffiliateBlockMessage(settings.affiliateBlockCheckoutMessage)}
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {rows}
      </div>

      {meta.hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadMoreLoading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex min-h-11 min-w-[200px] items-center justify-center rounded-xl border border-[#2563EB] bg-white px-6 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-60"
          >
            {loadMoreLoading ? "Đang tải..." : "Xem thêm"}
          </button>
        </div>
      ) : null}

      {detailId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
            className="max-h-[92vh] w-full min-w-0 max-w-[100vw] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-5xl sm:rounded-2xl sm:p-6 lg:max-w-6xl lg:p-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <p id="order-detail-title" className="text-base font-semibold text-[#0F172A] sm:text-lg">
                {settings.orderDetailTitle?.trim() || "Chi tiết đơn hàng"}
              </p>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="min-h-11 min-w-11 shrink-0 rounded-xl border border-[#E2E8F0] text-xl leading-none text-[#64748B] hover:bg-[#F8FAFC]"
                aria-label="Đóng chi tiết đơn"
              >
                ×
              </button>
            </div>
            {detailLoading ? (
              <p className="mt-6 text-center text-sm text-[#64748B]" aria-busy="true">
                Đang tải chi tiết đơn...
              </p>
            ) : null}
            {detailError ? (
              <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {detailError}
              </p>
            ) : null}
            {detailOrder && !detailLoading && !detailError ? (
              <div className="mt-5 min-w-0">
                <OrderDetailModalContent
                  order={detailOrder}
                  safeSupportHref={safeSupportHref}
                  supportLabel={supportLabel}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {cancelId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCancelId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p id="cancel-order-title" className="text-base font-semibold text-[#0F172A]">
              Hủy đơn hàng
            </p>
            <p className="mt-2 text-sm text-[#64748B]">
              Sau khi xác nhận, cửa hàng sẽ nhận thông báo. Vui lòng nhập rõ lý do (tối thiểu 3 ký tự, tối đa 500 ký
              tự).
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={cancelSubmitting}
              aria-invalid={cancelError ? "true" : "false"}
              className="mt-3 min-h-[100px] w-full rounded-xl border border-[#E2E8F0] p-3 text-sm outline-none focus:border-[#2563EB] disabled:bg-[#F8FAFC]"
              placeholder="Ví dụ: Đổi ý, cần đổi địa chỉ..."
            />
            <p className="mt-1 text-right text-[11px] text-[#94A3B8]">{cancelReason.length}/500</p>
            {cancelError ? <p className="mt-2 text-sm text-rose-700">{cancelError}</p> : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelId(null)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] sm:flex-none"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={cancelSubmitting || cancelReason.trim().length < 3}
                aria-busy={cancelSubmitting}
                onClick={() => void submitCancel()}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 sm:flex-none"
              >
                {cancelSubmitting ? "Đang gửi yêu cầu..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PurchaseHistoryOrderRow({
  order,
  settings,
  commerceLocked,
  reorderBusy,
  safeSupportHref,
  supportLabel,
  onOpenDetail,
  onStartCancel,
  onReorder,
}: {
  order: ListOrderApi;
  settings: CustomerAccountSettings;
  commerceLocked: boolean;
  reorderBusy: boolean;
  safeSupportHref: string;
  supportLabel: string;
  onOpenDetail: (id: string) => void;
  onStartCancel: (id: string) => void;
  onReorder: (id: string) => void;
}): JSX.Element {
  const created = new Date(order.createdAt);
  const showCancel =
    !commerceLocked &&
    settings.enableCancelOrder &&
    canCancelOrder({
      orderStatus: order.orderStatus,
      createdAt: created,
      cancelOrderTimeLimitMinutes: settings.cancelOrderTimeLimitMinutes,
      featureEnabled: true,
    });
  const showReorder = !commerceLocked && settings.enableReorder && canReorder(order.orderStatus);

  return (
    <article className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 border-b border-[#E2E8F0] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A]">Mã đơn #{order.code}</p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Ngày đặt: {created.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass(order.statusTone)}`}
        >
          {order.statusLabel}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-[#64748B]">Tổng tiền</dt>
          <dd className="font-semibold text-[#0F172A]">{formatMoney(order.totalAmount)}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-[#64748B]">Phương thức thanh toán</dt>
          <dd className="text-[#0F172A]">{order.paymentMethod ? formatPaymentMethod(order.paymentMethod) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-[#64748B]">Trạng thái thanh toán</dt>
          <dd className="text-[#0F172A]">{formatPaymentStatus(order.paymentStatus)}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-[#64748B]">Số sản phẩm</dt>
          <dd className="tabular-nums text-[#0F172A]">{order.itemCount}</dd>
        </div>
      </dl>
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        {settings.enableOrderDetail ? (
          <button
            type="button"
            onClick={() => onOpenDetail(order.id)}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] sm:flex-none"
          >
            Xem chi tiết
          </button>
        ) : null}
        {showCancel ? (
          <button
            type="button"
            onClick={() => onStartCancel(order.id)}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-100 sm:flex-none"
          >
            Hủy đơn
          </button>
        ) : null}
        {showReorder ? (
          <button
            type="button"
            disabled={reorderBusy}
            onClick={() => void onReorder(order.id)}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#F59E0B] px-4 text-sm font-semibold text-white hover:bg-[#D97706] disabled:opacity-60 sm:flex-none"
          >
            {reorderBusy ? "Đang xử lý..." : "Mua lại"}
          </button>
        ) : null}
        <Link
          href={safeSupportHref}
          className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-center text-sm font-semibold text-[#0F172A] hover:bg-[#EFF6FF] sm:flex-none"
        >
          {supportLabel}
        </Link>
      </div>
    </article>
  );
}
