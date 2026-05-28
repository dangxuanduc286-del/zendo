import { NextResponse } from "next/server";
import {
  listAdminActivityFeed,
  type AdminActivityCategoryFilter,
} from "@/lib/admin/admin-operational-events";
import type { AdminActivityCategory } from "@prisma/client";

const CATEGORIES = new Set<string>([
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

function parseCategory(raw: string | null): AdminActivityCategoryFilter {
  if (!raw || raw === "ALL") return "ALL";
  return CATEGORIES.has(raw) ? (raw as AdminActivityCategory) : "ALL";
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const category = parseCategory(url.searchParams.get("category"));
    const limit = Number(url.searchParams.get("limit") ?? "40");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const data = await listAdminActivityFeed({ category, limit, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/operational-events]", e);
    return NextResponse.json({ ok: false, message: "Không tải được lịch sử." }, { status: 500 });
  }
}
