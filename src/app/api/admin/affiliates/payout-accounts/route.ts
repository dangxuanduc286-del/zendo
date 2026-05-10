import { NextResponse } from "next/server";
import {
  listAffiliatePayoutAccounts,
  requireAdminActor,
  type AdminPayoutAccountStatus,
} from "@/lib/admin/affiliate-payout-accounts";

function parseStatus(value: string | null): AdminPayoutAccountStatus {
  if (value === "APPROVED" || value === "REJECTED") return value;
  return "PENDING";
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdminActor();
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

  const data = await listAffiliatePayoutAccounts({ status, q });
  return NextResponse.json(
    {
      ok: true,
      data: data.map((r) => ({
        id: r.id,
        verificationStatus: r.verificationStatus,
        createdAt: r.createdAt.toISOString(),
        verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
        bankName: r.bankName,
        bankAccountNumberMasked: r.bankAccountNumberMasked,
        bankAccountHolder: r.bankAccountHolder,
        customer: r.customer,
      })),
    },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

