import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateAffiliateCommissionStatus,
  type AffiliateCommissionAction,
} from "@/lib/admin/affiliate";

type ParamsInput = Promise<{ id: string }>;

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

function parseAction(value: unknown): AffiliateCommissionAction | null {
  if (value === "approve" || value === "cancel" || value === "mark_paid") return value;
  return null;
}

export async function POST(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const form = await request.formData();
  const action = parseAction(form.get("commissionAction"));
  const redirectToRaw = String(form.get("redirectTo") ?? "/admin/collaborators?tab=hoa-hong");
  const redirectUrl = new URL(redirectToRaw, request.url);

  if (!action) {
    redirectUrl.searchParams.set("commissionError", "invalid_action");
    return NextResponse.redirect(redirectUrl);
  }

  const { id } = await params;
  try {
    await updateAffiliateCommissionStatus(id, action);
  } catch (e) {
    const code = e instanceof Error ? e.message.slice(0, 200) : "unknown";
    redirectUrl.searchParams.set("commissionError", code);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
