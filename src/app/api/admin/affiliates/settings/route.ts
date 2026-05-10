import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_AFFILIATE_SETTINGS,
  parseAffiliateProgramSettingsForm,
  persistAffiliateProgramSettings,
} from "@/lib/admin/affiliate";

function isAllowedRole(role: string | undefined): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

function setCtvErrorParam(redirectUrl: URL, message: string): void {
  const safe = message.length > 220 ? `${message.slice(0, 220)}…` : message;
  redirectUrl.searchParams.set("ctvSettingsError", safe);
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
  const redirectToRaw = String(form.get("redirectTo") ?? "/admin/collaborators?tab=cai-dat");
  const redirectUrl = new URL(redirectToRaw, request.url);
  const action = String(form.get("ctv_settings_action") ?? "save");

  try {
    if (action === "restore_defaults") {
      await persistAffiliateProgramSettings("restore_defaults", DEFAULT_AFFILIATE_SETTINGS);
    } else {
      const parsed = parseAffiliateProgramSettingsForm(form);
      if (parsed.ok === false) {
        setCtvErrorParam(redirectUrl, parsed.message);
        return NextResponse.redirect(redirectUrl);
      }
      await persistAffiliateProgramSettings("save", parsed.settings);
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Không thể lưu cài đặt chương trình CTV. Vui lòng thử lại.";
    setCtvErrorParam(redirectUrl, msg);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.delete("ctvSettingsError");
  redirectUrl.searchParams.set("ctvSettingsSaved", "1");
  revalidatePath("/admin/collaborators");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("storefront-settings");
  return NextResponse.redirect(redirectUrl);
}
