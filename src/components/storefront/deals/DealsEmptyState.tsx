"use client";

export default function DealsEmptyState({
  title = "Chưa có ưu đãi phù hợp",
  subtitle = "Vui lòng quay lại sau hoặc xem thêm sản phẩm trong cửa hàng.",
}: {
  title?: string;
  subtitle?: string;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-medium text-slate-600">{subtitle}</p>
    </div>
  );
}

