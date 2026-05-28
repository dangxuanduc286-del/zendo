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

/** application/octet-stream is accepted only when extension indicates a common mobile photo format. */
const OCTET_STREAM_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

function getFileExtension(fileName: string): string {
  if (!fileName.includes(".")) return "";
  return fileName.split(".").pop()?.trim().toLowerCase() || "";
}

function inferMimeFromExtension(extension: string): string | null {
  return EXTENSION_TO_MIME[extension] ?? null;
}

function isAllowedMime(mime: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(mime);
}

function isAllowedOctetStream(mime: string, extension: string): boolean {
  return mime === "application/octet-stream" && OCTET_STREAM_EXTENSIONS.has(extension);
}

type PayoutCccdFileValidation =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; extension: string; mime: string; reason: string };

function validatePayoutCccdFile(file: File): PayoutCccdFileValidation {
  const extension = getFileExtension(file.name);
  const mime = (file.type || "").trim().toLowerCase();

  const extensionOk = ALLOWED_FILE_EXTENSIONS.has(extension);
  const mimeOk = mime ? isAllowedMime(mime) : false;
  const octetOk = isAllowedOctetStream(mime, extension);

  if (!extensionOk && !mimeOk && !octetOk) {
    return {
      ok: false,
      extension,
      mime: mime || "(empty)",
      reason: "Chỉ chấp nhận tệp ảnh hợp lệ.",
    };
  }

  let contentType = mime;
  if (!contentType || contentType === "application/octet-stream") {
    contentType = inferMimeFromExtension(extension) ?? "";
  }
  if (!isAllowedMime(contentType)) {
    const inferred = inferMimeFromExtension(extension);
    if (inferred) contentType = inferred;
  }
  if (!isAllowedMime(contentType)) {
    return {
      ok: false,
      extension,
      mime: mime || "(empty)",
      reason: "Chỉ chấp nhận tệp ảnh hợp lệ.",
    };
  }

  return { ok: true, contentType, extension };
}

function logUploadFailure(
  context: string,
  details: { mime: string; extension: string; size: number; message: string; side?: string; userId?: string },
): void {
  console.error(`[affiliate/payout-account/upload] ${context}`, details);
}

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

  const validation = validatePayoutCccdFile(file);
  if (validation.ok === false) {
    logUploadFailure("validation rejected", {
      mime: validation.mime,
      extension: validation.extension || "(none)",
      size: file.size,
      message: validation.reason,
      side,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: false, message: validation.reason }, { status: 400 });
  }

  const maxSizeInBytes = 8 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    const message = "Tệp ảnh vượt giới hạn cho phép.";
    logUploadFailure("size exceeded", {
      mime: file.type || "(empty)",
      extension: validation.extension || "(none)",
      size: file.size,
      message,
      side,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  try {
    const draftTokenRaw = String(formData.get("changeDraftToken") ?? "").trim();
    let folderBase = `private/affiliate-payout-accounts/${session.user.id}`;
    if (draftTokenRaw) {
      if (!CHANGE_DRAFT_RE.test(draftTokenRaw)) {
        const message = "Mã tải lên không hợp lệ.";
        logUploadFailure("invalid draft token", {
          mime: file.type || "(empty)",
          extension: validation.extension || "(none)",
          size: file.size,
          message,
          side,
          userId: session.user.id,
        });
        return NextResponse.json({ ok: false, message }, { status: 400 });
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
        const message = "Chỉ tài khoản đã duyệt mới được tải ảnh cho yêu cầu thay đổi.";
        logUploadFailure("change upload forbidden", {
          mime: file.type || "(empty)",
          extension: validation.extension || "(none)",
          size: file.size,
          message,
          side,
          userId: session.user.id,
        });
        return NextResponse.json({ ok: false, message }, { status: 403 });
      }
      folderBase = `private/affiliate-payout-change-drafts/${session.user.id}/${draftTokenRaw}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `${folderBase}/${side}`;
    const objectKey = buildR2ObjectKey(folder, file.name);

    await uploadBufferToR2({
      objectKey,
      body: buffer,
      contentType: validation.contentType,
      cacheControl: "private, no-store",
    });

    // IMPORTANT: do not return public URL to avoid exposing CCCD publicly.
    return NextResponse.json({ ok: true, objectKey });
  } catch (e) {
    const message = "Không thể tải ảnh lên. Vui lòng thử lại.";
    logUploadFailure("storage error", {
      mime: file.type || "(empty)",
      extension: validation.extension || "(none)",
      size: file.size,
      message: e instanceof Error ? e.message : message,
      side,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
