import "server-only";

/** Wrapper gọi handler/query (giữ điểm mở rộng profiling sau này nếu cần). */
export async function profileAffiliateQuery<T>(_label: string, fn: () => Promise<T>): Promise<T> {
  return await fn();
}
