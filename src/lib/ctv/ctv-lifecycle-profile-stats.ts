import type { PrismaClient } from "@prisma/client";

const WRITE_OPS = new Set([
  "create",
  "update",
  "delete",
  "createMany",
  "updateMany",
  "deleteMany",
  "upsert",
  "updateManyAndReturn",
]);

export type CtvLifecycleStepMetric = {
  name: string;
  ms: number;
  queryCount: number;
  writeCount: number;
  children?: CtvLifecycleStepMetric[];
};

type Session = {
  steps: CtvLifecycleStepMetric[];
  stack: CtvLifecycleStepMetric[];
  queryCount: number;
  writeCount: number;
  queries: Array<{ model: string; operation: string; ms: number }>;
};

let session: Session | null = null;

export function isCtvLifecycleProfiling(): boolean {
  return session != null;
}

export function startCtvLifecycleProfileSession(): void {
  session = {
    steps: [],
    stack: [],
    queryCount: 0,
    writeCount: 0,
    queries: [],
  };
}

export function endCtvLifecycleProfileSession(): {
  steps: CtvLifecycleStepMetric[];
  totalMs: number;
  queryCount: number;
  writeCount: number;
  slowestQueries: Array<{ model: string; operation: string; ms: number }>;
} {
  const s = session;
  session = null;
  if (!s) {
    return { steps: [], totalMs: 0, queryCount: 0, writeCount: 0, slowestQueries: [] };
  }
  const totalMs = s.steps.reduce((sum, row) => sum + row.ms, 0);
  const slowestQueries = [...s.queries].sort((a, b) => b.ms - a.ms).slice(0, 15);
  return {
    steps: s.steps,
    totalMs,
    queryCount: s.queryCount,
    writeCount: s.writeCount,
    slowestQueries,
  };
}

export async function profileCtvLifecycleStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!session) return fn();

  const parent = session.stack[session.stack.length - 1];
  const q0 = session.queryCount;
  const w0 = session.writeCount;
  const t0 = performance.now();

  session.stack.push({ name, ms: 0, queryCount: 0, writeCount: 0, children: [] });
  try {
    return await fn();
  } finally {
    const step = session.stack.pop();
    if (!step) return;
    step.ms = Math.round(performance.now() - t0);
    step.queryCount = session.queryCount - q0;
    step.writeCount = session.writeCount - w0;
    if (parent) parent.children!.push(step);
    else session.steps.push(step);
  }
}

export function wrapPrismaForLifecycleProfile(client: PrismaClient): PrismaClient {
  const enableHook =
    process.env.CTV_LIFECYCLE_PROFILE === "1" || process.env.NODE_ENV !== "production";
  if (!enableHook) return client;

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const t0 = performance.now();
          const result = await query(args);
          const ms = Math.round(performance.now() - t0);
          if (session) {
            session.queryCount += 1;
            if (WRITE_OPS.has(operation)) session.writeCount += 1;
            session.queries.push({ model, operation, ms });
          }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
