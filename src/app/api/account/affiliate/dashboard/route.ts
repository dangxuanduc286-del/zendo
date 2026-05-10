import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getStorefrontAffiliateDashboardForCustomer } from "../../../../../lib/storefront-affiliate-dashboard";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  try {
    const data = await getStorefrontAffiliateDashboardForCustomer(session.user.id);
    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy hồ sơ CTV.", code: "NO_PROFILE" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[affiliate/dashboard]", e);
    return NextResponse.json({ ok: false, message: "Không tải được dữ liệu CTV." }, { status: 500 });
  }
}
