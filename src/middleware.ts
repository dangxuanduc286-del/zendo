import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function normalizeAuthUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const isVercelRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_URL || process.env.VERCEL_ENV);
const resolvedAuthUrl =
  normalizeAuthUrl(process.env.AUTH_URL) ??
  normalizeAuthUrl(process.env.NEXTAUTH_URL) ??
  (!isVercelRuntime ? "http://localhost:3000" : null) ??
  "https://zendo.vn";
process.env.AUTH_URL = resolvedAuthUrl;
process.env.NEXTAUTH_URL = resolvedAuthUrl;

function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
  }
  return "zendo-dev-auth-secret";
}

const resolvedAuthSecret = resolveAuthSecret();
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? resolvedAuthSecret;
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? resolvedAuthSecret;

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  const allowedAdminRoles = new Set(["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"]);
  const authSecret = resolvedAuthSecret;

  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  try {
    token = await getToken({ req, secret: authSecret });
  } catch (error) {
    void error;
    token = null;
  }
  const tokenRole =
    token && typeof token === "object" && "role" in token && typeof token.role === "string"
      ? token.role
      : "";

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowedAdminRoles.has(tokenRole)) {
    const loginUrl = new URL("/tai-khoan", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    loginUrl.searchParams.set("authError", "admin-denied");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
