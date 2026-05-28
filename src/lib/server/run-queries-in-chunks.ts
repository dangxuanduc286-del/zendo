import "server-only";

type UnwrapQueryTask<F> = F extends () => Promise<infer U> ? U : never;

type UnwrapQueryTasks<T extends readonly (() => Promise<unknown>)[]> = {
  [K in keyof T]: UnwrapQueryTask<T[K]>;
};

/** Giới hạn truy vấn Prisma song song để tránh cạn pool PG trong một request. */
export async function runQueriesInChunks<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  chunkSize: number,
): Promise<UnwrapQueryTasks<T>> {
  const results: unknown[] = [];
  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    results.push(...(await Promise.all(chunk.map((run) => run()))));
  }
  return results as UnwrapQueryTasks<T>;
}

export const AFFILIATE_DB_QUERY_CONCURRENCY = 4;
