import { NextResponse } from "next/server";
import {
  rejectAffiliatePayoutAccount,
  requireAdminActor,
} from "@/lib/admin/affiliate-payout-accounts";

type ParamsInput = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
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

  let body: { reason?: unknown } = {};
  try {
    body = (await request.json()) as { reason?: unknown };
  } catch {
    body = {};
  }
  const reason = String(body.reason ?? "").trim().slice(0, 2000);
  if (!reason) {
    return NextResponse.json({ ok: false, message: "Vui lòng nhập lý do từ chối." }, { status: 400 });
  }

  const { id } = await params;
  try {
    await rejectAffiliatePayoutAccount(id, reason, actor);
    return NextResponse.json({ ok: true, id, verificationStatus: "REJECTED" });
  } catch (e) {
    console.error("[admin/affiliate-payout-account/reject]", e);
    return NextResponse.json({ ok: false, message: "Không thể từ chối tài khoản nhận tiền." }, { status: 500 });
  }
}

