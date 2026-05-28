import { NextResponse } from "next/server";
import {
  isOperationalHistoryScope,
  listUnifiedHistoryTimeline,
  type UnifiedHistoryScope,
} from "@/lib/admin/admin-unified-history-feed";
import { listAdminActivityFeed } from "@/lib/admin/admin-operational-events";

const SCOPES = new Set<string>([
  "ALL",
  "REVENUE_REWARD",
  "TIER",
  "NOTIFICATION",
  "CTV",
  "CUSTOMER",
  "ORDER",
  "PAYMENT",
  "WITHDRAWAL",
  "PAYOUT_ACCOUNT",
  "CTV_APPLICATION",
  "COMMISSION",
  "REWARD_POINTS",
  "SUPPORT",
  "SYSTEM",
]);

function parseScope(raw: string | null): UnifiedHistoryScope {
  const s = (raw ?? "ALL").trim();
  return SCOPES.has(s) ? (s as UnifiedHistoryScope) : "ALL";
}

/** Read-only aggregator — không thay API/domain hiện có. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const scope = parseScope(new URL(request.url).searchParams.get("scope"));

    if (scope === "ALL") {
      const data = await listUnifiedHistoryTimeline("ALL");
      return NextResponse.json({ ok: true, mode: "timeline", ...data });
    }

    if (scope === "REVENUE_REWARD" || scope === "TIER" || scope === "NOTIFICATION") {
      return NextResponse.json({ ok: true, mode: "embed", scope });
    }

    if (isOperationalHistoryScope(scope)) {
      const data = await listAdminActivityFeed({ category: scope, limit: 50, offset: 0 });
      return NextResponse.json({
        ok: true,
        mode: "operational",
        items: data.items,
        total: data.total,
      });
    }

    return NextResponse.json({ ok: true, mode: "timeline", items: [], total: 0 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/unified-history]", e);
    return NextResponse.json({ ok: false, message: "Không tải được lịch sử." }, { status: 500 });
  }
}
