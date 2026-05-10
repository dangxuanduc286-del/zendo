import { NextResponse } from "next/server";
import {
  listAffiliatePayoutAccountChangeRequests,
  requireAdminActorForChangeRequests,
  type AdminChangeRequestStatus,
} from "@/lib/admin/affiliate-payout-change-requests";

function parseStatus(value: string | null): AdminChangeRequestStatus {
  if (value === "APPROVED" || value === "REJECTED") return value;
  return "PENDING";
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdminActorForChangeRequests();
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = parseStatus(url.searchParams.get("status"));
  const q = (url.searchParams.get("q") ?? "").trim();

  const data = await listAffiliatePayoutAccountChangeRequests({ status, q });
  return NextResponse.json(
    {
      ok: true,
      data: data.map((r) => ({
        id: r.id,
        status: r.status,
        requestedAt: r.requestedAt.toISOString(),
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        payoutAccountId: r.payoutAccountId,
        requestedBankName: r.requestedBankName,
        requestedBankAccountNumberMasked: r.requestedBankAccountNumberMasked,
        requestedBankAccountHolder: r.requestedBankAccountHolder,
        customer: r.customer,
      })),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
