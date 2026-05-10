import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  payApprovedCommissionsForProfile,
  RECONCILIATION_PAY_BELOW_THRESHOLD,
} from "@/lib/admin/affiliate";

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const form = await request.formData();
  const profileId = String(form.get("affiliateProfileId") ?? "").trim();
  const redirectToRaw = String(form.get("redirectTo") ?? "/admin/collaborators?tab=doi-soat");
  const redirectUrl = new URL(redirectToRaw, request.url);
  const confirmBelow =
    form.get("confirmBelowThreshold") === "1" || form.get("confirmBelowThreshold") === "on";

  if (!profileId) {
    redirectUrl.searchParams.set("payError", "missing_profile");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await payApprovedCommissionsForProfile(profileId, { confirmBelowThreshold: confirmBelow });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === RECONCILIATION_PAY_BELOW_THRESHOLD) {
      redirectUrl.searchParams.set("payError", "below_threshold");
      return NextResponse.redirect(redirectUrl);
    }
    redirectUrl.searchParams.set("payError", msg.slice(0, 200) || "error");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
