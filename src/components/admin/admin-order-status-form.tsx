"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatOrderStatus,
  formatPaymentStatus,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "../../lib/admin-order";
import { adminPrimaryButton } from "../../lib/admin-ui";

interface AdminOrderStatusFormProps {
  orderId: string;
  initialOrderStatus: (typeof ORDER_STATUS_OPTIONS)[number];
  initialPaymentStatus: (typeof PAYMENT_STATUS_OPTIONS)[number];
}

export default function AdminOrderStatusForm({
  orderId,
  initialOrderStatus,
  initialPaymentStatus,
}: AdminOrderStatusFormProps): JSX.Element {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSave = async () => {
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể cập nhật trạng thái.");
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      router.replace(`/admin/orders?updated=${encodeURIComponent(orderId)}`);
    } catch {
      setError("Có lỗi xảy ra khi cập nhật đơn hàng.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900">Cập nhật trạng thái</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Trạng thái đơn</span>
          <select
            value={orderStatus}
            onChange={(event) =>
              setOrderStatus(event.target.value as (typeof ORDER_STATUS_OPTIONS)[number])
            }
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatOrderStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-zinc-700">Trạng thái thanh toán</span>
          <select
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as (typeof PAYMENT_STATUS_OPTIONS)[number])
            }
            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          >
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatPaymentStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSave}
        disabled={isSubmitting}
        className={`${adminPrimaryButton} mt-4`}
      >
        {isSubmitting ? "Đang cập nhật..." : "Lưu trạng thái"}
      </button>
    </section>
  );
}

