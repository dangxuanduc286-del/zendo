"use client";

import { useState } from "react";
import Link from "next/link";
import MediaImage from "../shared/media-image";
import { formatVnd } from "../../lib/currency";

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

export default function OrderLookup(): JSX.Element {
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
        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5"
      >
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Mã đơn hàng</span>
          <input
            required
            value={orderCode}
            onChange={(event) => setOrderCode(event.target.value.toUpperCase())}
            placeholder="VD: ZD20260422123456"
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Số điện thoại đặt hàng</span>
          <input
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Nhập số điện thoại"
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang tra cứu..." : "Tra cứu"}
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <article className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
          <header className="grid grid-cols-1 gap-2 border-b border-zinc-200 pb-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-zinc-500">Mã đơn: </span>
              <span className="font-semibold text-zinc-900">{result.code}</span>
            </p>
            <p>
              <span className="text-zinc-500">Ngày tạo: </span>
              <span className="font-medium text-zinc-900">
                {new Date(result.createdAt).toLocaleString("vi-VN")}
              </span>
            </p>
            <p>
              <span className="text-zinc-500">Trạng thái đơn: </span>
              <span className="font-medium text-zinc-900">{formatStatus(result.orderStatus)}</span>
            </p>
            <p>
              <span className="text-zinc-500">Thanh toán: </span>
              <span className="font-medium text-zinc-900">
                {formatStatus(result.paymentStatus)}
              </span>
            </p>
          </header>

          <div className="space-y-3 py-4">
            {result.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[64px_1fr_auto] gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5">
                <div className="relative h-16 w-16 overflow-hidden rounded-md bg-zinc-100">
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
                      className="line-clamp-2 text-sm font-semibold text-zinc-900 transition hover:text-zinc-700"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{item.productName}</p>
                  )}
                  <p className="text-xs text-zinc-500">Số lượng: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{formatVnd(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <footer className="border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900">Tổng tiền</span>
              <span className="text-lg font-bold text-zinc-900">{formatVnd(result.totalAmount)}</span>
            </div>
          </footer>
        </article>
      ) : null}
    </section>
  );
}
