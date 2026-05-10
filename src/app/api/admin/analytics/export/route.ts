import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getAnalyticsCsvRows } from "../../../../../lib/admin/analytics";

function toCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function isAllowedRole(role: unknown): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "7d";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const pathname = searchParams.get("pathname") ?? undefined;
  const device = searchParams.get("device") ?? undefined;
  // TODO(analytics): hiện export vẫn giới hạn theo nguồn recent visits (top 50 gần nhất), sẽ nâng full range ở bước sau.
  const rows = await getAnalyticsCsvRows({ range, from, to, pathname, device });
  const header = ["visitedAt", "pathname", "referrer", "deviceType", "userAgent", "visitorKey", "sessionKey"];
  const body = rows.map((row) =>
    [
      row.visitedAt,
      row.pathname,
      row.referrer ?? "",
      row.deviceType ?? "",
      row.userAgent ?? "",
      row.visitorKey ?? "",
      row.sessionKey ?? "",
    ]
      .map((cell) => toCsvCell(String(cell)))
      .join(","),
  );

  const csv = [header.join(","), ...body].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${range}-${from ?? "auto"}-${to ?? "auto"}.csv"`,
    },
  });
}
