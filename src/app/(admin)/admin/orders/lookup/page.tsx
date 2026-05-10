import OrderLookup from "../../../../../components/storefront/order-lookup";

export default function AdminOrderLookupPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Tra cứu đơn</h1>
        <p className="text-sm leading-6 text-slate-600">
          Nhập mã đơn hàng và số điện thoại đặt hàng — cùng biểu mẫu tra cứu công khai trên cửa hàng.
        </p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <OrderLookup />
      </div>
    </div>
  );
}
