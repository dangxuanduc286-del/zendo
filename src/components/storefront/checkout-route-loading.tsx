export function CheckoutRouteLoading(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]" aria-busy aria-label="Đang tải thanh toán">
      <div className="h-[28rem] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
      <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
    </div>
  );
}
