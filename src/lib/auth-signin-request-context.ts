import { AsyncLocalStorage } from "node:async_hooks";

export type AuthSignInRequestSnapshot = {
  forwardedIp: string | null;
  userAgent: string | null;
};

const storage = new AsyncLocalStorage<AuthSignInRequestSnapshot>();

/** Gọi trước NextAuth handler để `events.signIn` đọc được IP/User-Agent request. */
export function runWithAuthSignInSnapshot<T>(snapshot: AuthSignInRequestSnapshot, fn: () => T): T {
  return storage.run(snapshot, fn);
}

export function getAuthSignInSnapshot(): AuthSignInRequestSnapshot | undefined {
  return storage.getStore();
}

export function snapshotAuthRequestFromHeaders(headers: Headers): AuthSignInRequestSnapshot {
  const xf = headers.get("x-forwarded-for");
  const first = xf
    ?.split(",")[0]
    ?.trim()
    .replace(/^"|"$/g, "");
  const xr = headers.get("x-real-ip")?.trim() ?? null;
  const forwardedIp = first || xr || null;
  return {
    forwardedIp,
    userAgent: headers.get("user-agent"),
  };
}
