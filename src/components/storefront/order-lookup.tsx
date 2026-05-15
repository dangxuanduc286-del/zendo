"use client";

import { useState } from "react";
import Link from "next/link";
import MediaImage from "../shared/media-image";
import { formatVnd } from "../../lib/currency";
import { adminInputLg, adminLabel, adminPrimaryButtonLg } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

interface LookupItem {
  id: string;
  productName: string;
  productSlug: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string;
}

interface LookupResult {
  code: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  items: LookupItem[];
}

function formatStatus(value: string): string {
  const normalized = value.replace(/_/g, " ").toLowerCase();
  const statusMap: Record<string, string> = {
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao",
    delivered: "Đã giao",
    completed: "Hoàn tất",
    canceled: "Đã hủy",
    refunded: "Đã hoàn tiền",
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    failed: "Thất bại",
    "partially refunded": "Hoàn tiền một phần",
  };
  return statusMap[normalized] ?? value.replace(/_/g, " ");
}

function statusPillClass(kind: "order" | "payment", raw: string): string {
  const v = raw.trim().toUpperCase();
  if (kind === "payment") {
    if (v === "PAID") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    if (v === "UNPAID" || v === "PENDING") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
    if (v === "FAILED" || v === "REFUNDED") return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
  } else {
    if (v === "COMPLETED" || v === "DELIVERED") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    if (v === "CANCELLED" || v === "CANCELED") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    if (v === "PENDING" || v === "PROCESSING" || v === "SHIPPING") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200";
  }
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

export type OrderLookupVariant = "storefront" | "admin";

export default function OrderLookup({ variant = "storefront" }: { variant?: OrderLookupVariant }): JSX.Element {
  const isAdmin = variant === "admin";
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const onLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode,
          phone,
        }),
      });

      const payload = (await response.json()) as LookupResult & { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Tra cứu thất bại.");
        setLoading(false);
        return;
      }

      setResult(payload);
      setLoading(false);
    } catch {
      setError("Có lỗi xảy ra trong quá trình tra cứu.");
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <form
        onSubmit={onLookup}
        className={cn(
          "grid grid-cols-1 gap-3 sm:items-end",
          isAdmin
            ? "rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3 sm:p-5"
            : "rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:p-5",
        )}
      >
        <label className="space-y-1.5">
          <span
            className={cn(
              "text-sm font-medium",
              isAdmin ? adminLabel : "text-zinc-700",
            )}
          >
            Mã đơn hàng
          </span>
          <input
            required
            value={orderCode}
            onChange={(event) => setOrderCode(event.target.value.toUpperCase())}
            placeholder="VD: ZD20260422123456"
            className={cn(
              isAdmin
                ? adminInputLg
                : "h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500",
            )}
          />
        </label>
        <label className="space-y-1.5">
          <span
            className={cn(
              "text-sm font-medium",
              isAdmin ? adminLabel : "text-zinc-700",
            )}
          >
            Số điện thoại đặt hàng
          </span>
          <input
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Nhập số điện thoại"
            className={cn(
              isAdmin
                ? adminInputLg
                : "h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500",
            )}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            isAdmin
              ? `${adminPrimaryButtonLg} shrink-0 sm:w-auto`
              : "inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {loading ? "Đang tra cứu..." : "Tra cứu"}
        </button>
      </form>

      {error ? (
        <p
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm font-medium",
            isAdmin ? "border-rose-200 bg-rose-50 text-rose-800" : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <article
          className={cn(
            "rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
            isAdmin ? "border-slate-200" : "border-zinc-200",
          )}
        >
          <header
            className={cn(
              "grid grid-cols-1 gap-3 border-b pb-4 text-sm sm:grid-cols-2",
              isAdmin ? "border-slate-200" : "border-zinc-200",
            )}
          >
            <p>
              <span className={cn("text-xs font-medium uppercase tracking-wide", isAdmin ? "text-slate-500" : "text-zinc-500")}>
                Mã đơn
              </span>
              <br />
              <span
                className={cn(
                  "mt-0.5 inline-block font-mono text-lg font-bold tracking-tight sm:text-xl",
                  isAdmin ? "text-slate-900" : "font-semibold text-zinc-900",
                )}
              >
                {result.code}
              </span>
            </p>
            <p>
              <span className={cn("text-xs", isAdmin ? "text-slate-500" : "text-zinc-500")}>Ngày tạo: </span>
              <span className={cn("font-medium", isAdmin ? "text-slate-900" : "text-zinc-900")}>
                {new Date(result.createdAt).toLocaleString("vi-VN")}
              </span>
            </p>
            <p className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className={cn("text-xs shrink-0", isAdmin ? "text-slate-500" : "text-zinc-500")}>Trạng thái đơn: </span>
              {isAdmin ? (
                <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass("order", result.orderStatus)}`}>
                  {formatStatus(result.orderStatus)}
                </span>
              ) : (
                <span className="font-medium text-zinc-900">{formatStatus(result.orderStatus)}</span>
              )}
            </p>
            <p className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className={cn("text-xs shrink-0", isAdmin ? "text-slate-500" : "text-zinc-500")}>Thanh toán: </span>
              {isAdmin ? (
                <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass("payment", result.paymentStatus)}`}>
                  {formatStatus(result.paymentStatus)}
                </span>
              ) : (
                <span className="font-medium text-zinc-900">{formatStatus(result.paymentStatus)}</span>
              )}
            </p>
          </header>

          <div className="space-y-3 py-4">
            {result.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[64px_1fr_auto] gap-3 p-2.5",
                  isAdmin ? "rounded-xl border border-slate-100 bg-slate-50/60" : "rounded-lg border border-zinc-100 bg-zinc-50",
                )}
              >
                <div className={cn("relative h-16 w-16 overflow-hidden rounded-md", isAdmin ? "bg-slate-100" : "bg-zinc-100")}>
                  <MediaImage
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="64px"
                    fallbackLabel={item.productName}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  {item.productSlug ? (
                    <Link
                      href={`/san-pham/${item.productSlug}`}
                      className={cn(
                        "line-clamp-2 text-sm font-semibold transition",
                        isAdmin ? "text-slate-900 hover:text-sky-700" : "text-zinc-900 hover:text-zinc-700",
                      )}
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className={cn("line-clamp-2 text-sm font-semibold", isAdmin ? "text-slate-900" : "text-zinc-900")}>{item.productName}</p>
                  )}
                  <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-zinc-500")}>Số lượng: {item.quantity}</p>
                </div>
                <p className={cn("text-sm font-semibold tabular-nums", isAdmin ? "text-slate-900" : "text-zinc-900")}>{formatVnd(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <footer className={cn("border-t pt-4", isAdmin ? "border-slate-200" : "border-zinc-200")}>
            <div className="flex items-center justify-between gap-3">
              <span className={cn("text-sm font-semibold", isAdmin ? "text-slate-700" : "text-zinc-900")}>Tổng tiền</span>
              <span className={cn("text-lg font-bold tabular-nums sm:text-xl", isAdmin ? "text-slate-900" : "text-zinc-900")}>
                {formatVnd(result.totalAmount)}
              </span>
            </div>
          </footer>
        </article>
      ) : null}
    </section>
  );
}
