import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCtvAccountHistoryForCustomer } from "@/lib/affiliate/ctv-account-history";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(100, Math.max(10, Number(searchParams.get("take")) || 80));

  try {
    const data = await getCtvAccountHistoryForCustomer({
      customerId: String(session.user.id),
      take,
    });
    return NextResponse.json(
      { ok: true, ...data },
      { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (e) {
    console.error("[account/affiliate/history]", e);
    return NextResponse.json({ ok: false, message: "Không tải được lịch sử CTV." }, { status: 500 });
  }
}
