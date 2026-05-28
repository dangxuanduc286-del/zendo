import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { NEXT_AUTH_TRACKED_COOKIE_NAMES } from "@/lib/auth-runtime-trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function collectSessionTokenChunkNames(cookieStore: Awaited<ReturnType<typeof cookies>>): string[] {
  const names = new Set<string>();
  for (const cookie of cookieStore.getAll()) {
    const name = cookie.name;
    if (
      name === "next-auth.session-token" ||
      name === "__Secure-next-auth.session-token" ||
      name.startsWith("next-auth.session-token.") ||
      name.startsWith("__Secure-next-auth.session-token.")
    ) {
      names.add(name);
    }
  }
  return [...names].sort();
}

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieStatus = Object.fromEntries(
    NEXT_AUTH_TRACKED_COOKIE_NAMES.map((name) => [name, cookieStore.has(name)]),
  );
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    hasServerSession: Boolean(session?.user?.id),
    serverSessionUserId: session?.user?.id ?? null,
    serverSessionRole: session?.user?.role ?? null,
    cookies: cookieStatus,
    cookieNamesPresent: NEXT_AUTH_TRACKED_COOKIE_NAMES.filter((name) => cookieStore.has(name)),
    sessionTokenChunks: collectSessionTokenChunkNames(cookieStore),
  });
}
