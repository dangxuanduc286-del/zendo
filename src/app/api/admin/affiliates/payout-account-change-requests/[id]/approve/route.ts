import { NextResponse } from "next/server";
import {
  approveAffiliatePayoutAccountChangeRequest,
  requireAdminActorForChangeRequests,
} from "@/lib/admin/affiliate-payout-change-requests";

type ParamsInput = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  let actor: Awaited<ReturnType<typeof requireAdminActorForChangeRequests>>;
  try {
    actor = await requireAdminActorForChangeRequests();
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await approveAffiliatePayoutAccountChangeRequest(id, actor);
    return NextResponse.json({ ok: true, id, status: "APPROVED" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền." }, { status: 403 });
    }
    if (msg === "INVALID_STATE" || msg === "INVALID_PAYOUT_ACCOUNT") {
      return NextResponse.json(
        { ok: false, message: "Không thể duyệt trạng thái hiện tại của yêu cầu này." },
        { status: 409 },
      );
    }
    console.error("[admin/payout-account-change-requests/approve]", e);
    return NextResponse.json({ ok: false, message: "Không thể duyệt yêu cầu." }, { status: 500 });
  }

}
