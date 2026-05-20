import { cache } from "react";

/**
 * Request-scope memoization for Server Components / RSC.
 * No global mutable caches, no external infra.
 */
export function memoizePerRequest<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return cache(fn) as T;
}

export function memoizeArgsPerRequest<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return memoizePerRequest(fn as unknown as (...args: unknown[]) => unknown) as unknown as (...args: A) => R;
}

