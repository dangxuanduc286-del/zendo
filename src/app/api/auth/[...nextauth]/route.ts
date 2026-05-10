import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

function isDisabledOtpPathFromUrl(request: Request): boolean {
  const pathname = new URL(request.url).pathname;
  // Matches: /api/auth/otp or /api/auth/otp/...
  return /\/api\/auth\/otp(\/|$)/.test(pathname);
}

function buildNextauthParamsFromUrl(request: Request): { nextauth: string[] } {
  const pathname = new URL(request.url).pathname;
  // /api/auth/<...>
  const parts = pathname.split("/").filter(Boolean);
  const apiIdx = parts.indexOf("api");
  const authIdx = apiIdx >= 0 ? parts.indexOf("auth", apiIdx + 1) : -1;
  const tail = authIdx >= 0 ? parts.slice(authIdx + 1) : [];
  return { nextauth: tail };
}

export async function GET(
  request: Request,
): Promise<Response> {
  if (isDisabledOtpPathFromUrl(request)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  try {
    const params = buildNextauthParamsFromUrl(request);
    return handler(request, { params });
  } catch (error) {
    void error;
    return NextResponse.json({ message: "Auth handler error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
): Promise<Response> {
  if (isDisabledOtpPathFromUrl(request)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  try {
    const params = buildNextauthParamsFromUrl(request);
    return handler(request, { params });
  } catch (error) {
    void error;
    return NextResponse.json({ message: "Auth handler error" }, { status: 500 });
  }
}
