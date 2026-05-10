import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { signDealsPreviewToken } from "../../../../../lib/deals/preview-token";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as unknown;
  const scope =
    body && typeof body === "object" && "scope" in body ? String((body as Record<string, unknown>).scope) : "draft";
  const hours =
    body && typeof body === "object" && "hours" in body ? Number((body as Record<string, unknown>).hours) : 6;

  if (scope !== "draft" && scope !== "scheduled") {
    return NextResponse.json({ message: "Invalid scope" }, { status: 400 });
  }

  try {
    const token = signDealsPreviewToken(scope, hours);
    return NextResponse.json({ token, expiresInHours: Math.max(1, Math.min(72, Number(hours) || 6)) });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Cannot sign token" }, { status: 500 });
  }
}

