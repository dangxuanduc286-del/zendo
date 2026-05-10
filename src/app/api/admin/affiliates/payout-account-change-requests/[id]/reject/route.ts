import { NextResponse } from "next/server";
import {
  rejectAffiliatePayoutAccountChangeRequest,
  requireAdminActorForChangeRequests,
} from "@/lib/admin/affiliate-payout-change-requests";

type ParamsInput = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
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

  let body: { reason?: unknown };
  try {
    body = (await request.json()) as { reason?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Thiếu dữ liệu." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ ok: false, message: "Vui lòng nhập lý do." }, { status: 400 });

  const { id } = await params;
  try {
    await rejectAffiliatePayoutAccountChangeRequest(id, reason, actor);
    return NextResponse.json({ ok: true, id, status: "REJECTED" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MISSING_REASON") return NextResponse.json({ ok: false, message: "Vui lòng nhập lý do." }, { status: 400 });
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền." }, { status: 403 });
    }
    if (msg === "INVALID_STATE") {
      return NextResponse.json({ ok: false, message: "Không thể từ chối trạng thái hiện tại." }, { status: 409 });
    }
    console.error("[admin/payout-account-change-requests/reject]", e);
    return NextResponse.json({ ok: false, message: "Không thể từ chối yêu cầu." }, { status: 500 });
  }

}
