import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ADMIN_AFFILIATE_APPLICATIONS_HREF } from "@/lib/admin-menu";
import { rejectAffiliateApplicationByAdmin } from "@/lib/admin/affiliate";

type ParamsInput = Promise<{ id: string }>;

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

function safeApplicationsRedirect(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("/admin/collaborators")) return s.split("#")[0];
  if (s.startsWith(ADMIN_AFFILIATE_APPLICATIONS_HREF)) return s.split("#")[0];
  return ADMIN_AFFILIATE_APPLICATIONS_HREF;
}

function redirectWithAppError(request: Request, redirectTo: string, code: string): NextResponse {
  const u = new URL(redirectTo, request.url);
  u.searchParams.set("app_error", code);
  return NextResponse.redirect(u);
}

export async function POST(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const { id: applicationId } = await params;
  const form = await request.formData();
  const redirectTo = safeApplicationsRedirect(form.get("redirectTo"));
  const adminNote = form.get("adminNote");
  const internalQuickNote = form.get("internalQuickNote");

  try {
    await rejectAffiliateApplicationByAdmin({
      applicationId,
      adminNote: typeof adminNote === "string" ? adminNote : null,
      internalQuickNote: typeof internalQuickNote === "string" ? internalQuickNote : null,
      reviewerAdminId: session.user.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "NOT_FOUND") {
      return redirectWithAppError(request, redirectTo, "not_found");
    }
    if (msg === "INVALID_STATUS") {
      return redirectWithAppError(request, redirectTo, "invalid_status");
    }
    return redirectWithAppError(request, redirectTo, "server_error");
  }

  revalidatePath("/admin/collaborators");
  revalidatePath(ADMIN_AFFILIATE_APPLICATIONS_HREF);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
