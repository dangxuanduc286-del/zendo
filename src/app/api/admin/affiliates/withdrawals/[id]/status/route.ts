import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateAffiliateWithdrawalStatus,
  type AffiliateWithdrawalAction,
} from "@/lib/admin/affiliate";

type ParamsInput = Promise<{ id: string }>;

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

function parseAction(value: unknown): AffiliateWithdrawalAction | null {
  if (value === "approve" || value === "reject" || value === "mark_paid") return value;
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const form = await request.formData();
  const action = parseAction(form.get("withdrawalAction"));
  const redirectToRaw = String(
    form.get("redirectTo") ?? "/admin/collaborators?tab=rut-tien",
  );
  const redirectUrl = new URL(redirectToRaw, request.url);
  const adminNoteRaw = form.get("adminNote");
  const adminNote =
    typeof adminNoteRaw === "string" ? adminNoteRaw : undefined;

  if (!action) {
    redirectUrl.searchParams.set("withdrawalError", "invalid_action");
    return NextResponse.redirect(redirectUrl);
  }

  const { id } = await params;
  try {
    await updateAffiliateWithdrawalStatus(id, action, {
      adminNote: action === "reject" ? adminNote : undefined,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message.slice(0, 200) : "unknown";
    redirectUrl.searchParams.set("withdrawalError", code);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
