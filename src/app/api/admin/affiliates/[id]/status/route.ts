import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { updateAffiliateProfileStatus } from "../../../../../../lib/admin/affiliate";

type ParamsInput = Promise<{ id: string }>;

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

function parseStatus(value: unknown): "ACTIVE" | "PAUSED" | "LOCKED" | null {
  if (value === "ACTIVE" || value === "PAUSED" || value === "LOCKED") return value;
  return null;
}

export async function PATCH(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const body = (await request.json()) as { status?: string };
  const status = parseStatus(body.status);
  if (!status) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
  }

  const { id } = await params;
  await updateAffiliateProfileStatus(id, status);

  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  const form = await request.formData();
  const status = parseStatus(form.get("status"));
  const redirectTo = String(form.get("redirectTo") ?? "/admin/collaborators?tab=danh-sach");
  if (!status) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const { id } = await params;
  await updateAffiliateProfileStatus(id, status);

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
