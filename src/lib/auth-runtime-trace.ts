/** Dev-only helpers for signOut / session runtime audits. */

export const NEXT_AUTH_TRACKED_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
] as const;

export type AuthSessionSnapshot = {
  hasServerSession: boolean;
  serverSessionUserId: string | null;
  serverSessionRole: string | null;
  cookies: Record<string, boolean>;
  cookieNamesPresent: string[];
  sessionTokenChunks: string[];
};

export function logAuthTrace(label: string, detail: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.log("[AUTH TRACE]", label, detail);
}

export async function fetchAuthSessionSnapshot(): Promise<AuthSessionSnapshot | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/session-snapshot", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthSessionSnapshot;
  } catch {
    return null;
  }
}
