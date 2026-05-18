/** Skeleton nhẹ khi lazy-load dashboard tài khoản (không kéo thêm vendor). */
export function AccountRouteLoading(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6" aria-busy aria-label="Đang tải tài khoản">
      <div className="h-28 animate-pulse rounded-2xl bg-[#E2E8F0]/80" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[#E2E8F0]/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-[#E2E8F0]/60" />
    </div>
  );
}
