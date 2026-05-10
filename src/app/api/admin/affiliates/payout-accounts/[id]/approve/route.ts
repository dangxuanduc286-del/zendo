import { NextResponse } from "next/server";
import {
  approveAffiliatePayoutAccount,
  requireAdminActor,
} from "@/lib/admin/affiliate-payout-accounts";

type ParamsInput = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  let actor: Awaited<ReturnType<typeof requireAdminActor>>;
  try {
    actor = await requireAdminActor();
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (code === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await approveAffiliatePayoutAccount(id, actor);
    return NextResponse.json({ ok: true, id, verificationStatus: "APPROVED" });
  } catch (e) {
    console.error("[admin/affiliate-payout-account/approve]", e);
    return NextResponse.json({ ok: false, message: "Không thể duyệt tài khoản nhận tiền." }, { status: 500 });
  }
}

