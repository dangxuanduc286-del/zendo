import { NextResponse } from "next/server";
import {
  getAffiliatePayoutAccountChangeRequestDetail,
  requireAdminActorForChangeRequests,
} from "@/lib/admin/affiliate-payout-change-requests";

type ParamsInput = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    await requireAdminActorForChangeRequests();
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await getAffiliatePayoutAccountChangeRequestDetail(id);
  if (!row) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: row.id,
        status: row.status,
        rejectionReason: row.rejectionReason ?? "",
        requestedAt: row.requestedAt.toISOString(),
        reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
        payoutAccountId: row.payoutAccountId,
        payoutVerificationStatus: row.payoutVerificationStatus,
        currentBankName: row.currentBankName,
        currentBankAccountNumber: row.currentBankAccountNumber,
        currentBankAccountHolder: row.currentBankAccountHolder,
        requestedBankName: row.requestedBankName,
        requestedBankAccountNumber: row.requestedBankAccountNumber,
        requestedBankAccountHolder: row.requestedBankAccountHolder,
        citizenIdFrontObjectKey: row.citizenIdFrontObjectKey,
        citizenIdBackObjectKey: row.citizenIdBackObjectKey,
        reviewedByAdmin: row.reviewedByAdmin,
        customer: row.customer,
        siblingHistory: row.siblingHistory.map((s) => ({
          id: s.id,
          status: s.status,
          requestedAt: s.requestedAt.toISOString(),
          reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
        })),
        auditLogs: row.auditLogs.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          action: a.action,
          admin: a.admin,
          metadata: a.metadata,
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
