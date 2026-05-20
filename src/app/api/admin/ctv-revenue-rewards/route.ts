import { NextResponse } from "next/server";
import { getCtvRevenueRewardAuditList } from "@/lib/admin/ctv-revenue-reward-audit";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const { rows, total } = await getCtvRevenueRewardAuditList({
      query: searchParams.get("q") ?? undefined,
      tierId: searchParams.get("tierId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 200),
    });
    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        ...r,
        receivedAt: r.receivedAt.toISOString(),
      })),
      total,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
