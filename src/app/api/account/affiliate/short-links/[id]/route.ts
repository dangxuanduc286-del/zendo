import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAffiliateAuthErr, requireActiveAffiliateProfileId } from "../../analytics/_shared";

const patchSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const { id } = await ctx.params;
  const linkId = id?.trim().slice(0, 32) ?? "";
  if (!linkId) return NextResponse.json({ ok: false, message: "Thiếu id." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const updated = await db.affiliateTrackingLink.updateMany({
    where: { id: linkId, affiliateProfileId: auth.affiliateProfileId },
    data: { isActive: parsed.data.isActive },
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy link hoặc không thuộc tài khoản của bạn." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
