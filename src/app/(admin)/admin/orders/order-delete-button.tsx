"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrderDeleteButton({
  orderId,
}: {
  orderId: string;
}): JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onDelete(): Promise<void> {
    if (submitting) return;
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác.",
    );

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        window.alert(payload.message || "Không thể xóa đơn hàng. Vui lòng thử lại.");
        return;
      }

      window.alert(payload.message || "Đã xóa đơn hàng.");
      router.refresh();
    } catch {
      window.alert("Không thể xóa đơn hàng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        onDelete().catch(() => {});
      }}
      disabled={submitting}
      className="inline-flex h-8 items-center rounded-xl border border-[#FCA5A5] px-3 text-xs font-medium text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? "Đang xóa..." : "Xóa"}
    </button>
  );
}

