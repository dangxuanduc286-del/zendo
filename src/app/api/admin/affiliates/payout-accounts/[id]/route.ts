import { NextResponse } from "next/server";
import { getAffiliatePayoutAccountDetail, requireAdminActor } from "@/lib/admin/affiliate-payout-accounts";

type ParamsInput = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  try {
    await requireAdminActor();
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await getAffiliatePayoutAccountDetail(id);
  if (!row) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: row.id,
        verificationStatus: row.verificationStatus,
        createdAt: row.createdAt.toISOString(),
        verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
        rejectionReason: row.rejectionReason ?? "",
        bankName: row.bankName,
        bankAccountNumber: row.bankAccountNumber,
        bankAccountHolder: row.bankAccountHolder,
        citizenIdFrontObjectKey: row.citizenIdFrontObjectKey,
        citizenIdBackObjectKey: row.citizenIdBackObjectKey,
        verifiedByAdmin: row.verifiedByAdmin,
        customer: row.customer,
        auditLogs: row.auditLogs.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          action: a.action,
          admin: a.admin,
          statusBefore: a.statusBefore,
          statusAfter: a.statusAfter,
          reason: a.reason,
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

