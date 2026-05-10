import { NextResponse } from "next/server";
import { requireAdminCanAccessKycMedia } from "@/lib/admin/affiliate-payout-accounts";
import { streamFromR2 } from "@/lib/cloudflare-r2";
import { rateLimitFixedWindow } from "@/lib/rate-limit";

function getClientIp(request: Request): string {
  const raw =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "";
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.slice(0, 120);
}

export async function GET(request: Request): Promise<NextResponse> {
  let adminId = "";
  try {
    const actor = await requireAdminCanAccessKycMedia();
    adminId = actor.adminId;
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rlKey = adminId ? `admin:${adminId}:media_r2` : `ip:${getClientIp(request)}:media_r2`;
  const rl = rateLimitFixedWindow({ key: rlKey, max: 30, windowMs: 60_000 });
  if (rl.ok === false) {
    const retryAfterSeconds = rl.retryAfterSeconds;
    return NextResponse.json(
      { message: "Too many requests" },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  const url = new URL(request.url);
  const objectKey = (url.searchParams.get("key") ?? "").trim();
  if (!objectKey) {
    return NextResponse.json({ message: "Missing key" }, { status: 400 });
  }

  // Only allow payout-account private files to avoid turning this into a general-purpose file browser.
  if (!objectKey.startsWith("private/affiliate-payout-accounts/")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { body, contentType, contentLength } = await streamFromR2(objectKey, { signal: request.signal });
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // Expected when client disconnects / route changes mid-load.
    if (request.signal.aborted || (e instanceof Error && e.name === "AbortError")) {
      return new NextResponse(null, {
        status: 499,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}

