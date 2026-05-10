import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildR2ObjectKey, uploadBufferToR2 } from "@/lib/cloudflare-r2";
import { db } from "@/lib/db";

const CHANGE_DRAFT_RE = /^[a-zA-Z0-9-]{8,128}$/;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const ALLOWED_FILE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const side = String(formData.get("side") ?? "").trim().toLowerCase();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Thiếu tệp ảnh." }, { status: 400 });
  }
  if (side !== "front" && side !== "back") {
    return NextResponse.json({ ok: false, message: "Thiếu thông tin mặt CCCD (front/back)." }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.trim().toLowerCase() || "" : "";
  if (!ALLOWED_CONTENT_TYPES.has(file.type) || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return NextResponse.json({ ok: false, message: "Chỉ chấp nhận tệp ảnh hợp lệ." }, { status: 400 });
  }

  const maxSizeInBytes = 8 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return NextResponse.json({ ok: false, message: "Tệp ảnh vượt giới hạn cho phép." }, { status: 400 });
  }

  try {
    const draftTokenRaw = String(formData.get("changeDraftToken") ?? "").trim();
    let folderBase = `private/affiliate-payout-accounts/${session.user.id}`;
    if (draftTokenRaw) {
      if (!CHANGE_DRAFT_RE.test(draftTokenRaw)) {
        return NextResponse.json({ ok: false, message: "Mã tải lên không hợp lệ." }, { status: 400 });
      }
      const payout = await db.affiliatePayoutAccount.findFirst({
        where: {
          affiliateProfile: {
            customerId: session.user.id,
            status: "ACTIVE",
          },
          verificationStatus: "APPROVED",
        },
        select: { id: true },
      });
      if (!payout) {
        return NextResponse.json(
          { ok: false, message: "Chỉ tài khoản đã duyệt mới được tải ảnh cho yêu cầu thay đổi." },
          { status: 403 },
        );
      }
      folderBase = `private/affiliate-payout-change-drafts/${session.user.id}/${draftTokenRaw}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `${folderBase}/${side}`;
    const objectKey = buildR2ObjectKey(folder, file.name);

    await uploadBufferToR2({
      objectKey,
      body: buffer,
      contentType: file.type,
      cacheControl: "private, no-store",
    });

    // IMPORTANT: do not return public URL to avoid exposing CCCD publicly.
    return NextResponse.json({ ok: true, objectKey });
  } catch (e) {
    console.error("[affiliate/payout-account/upload]", e);
    return NextResponse.json({ ok: false, message: "Không thể tải ảnh lên. Vui lòng thử lại." }, { status: 500 });
  }
}

