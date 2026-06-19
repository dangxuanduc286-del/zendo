import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { buildR2ObjectKey, uploadBufferToR2 } from "../../../lib/cloudflare-r2";

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

const ALLOWED_FILE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heic",
  "heif",
]);

function safeFolder(folder: unknown): string {
  if (typeof folder !== "string" || !folder.trim()) return "images/customers/avatars";
  return folder
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const tUploadTotal = Date.now();
  console.time(`upload_total:${requestId}`);
  try {
    const tAuthCheck = Date.now();
    console.time(`auth_check:${requestId}`);
    const session = await getServerSession(authOptions);
    console.timeEnd(`auth_check:${requestId}`);
    const authCheckMs = Date.now() - tAuthCheck;
    if (!session?.user?.id) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.info(JSON.stringify({
      requestId,
      stage: "before_formData_parse",
      userId: session.user.id,
    }));
    const tFormDataParse = Date.now();
    console.time(`formdata_parse:${requestId}`);
    const formData = await request.formData();
    console.timeEnd(`formdata_parse:${requestId}`);
    const formDataParseMs = Date.now() - tFormDataParse;
    console.info(JSON.stringify({
      requestId,
      stage: "after_formData_parse",
      formDataParseMs,
    }));
    const file = formData.get("file");
    const folder = formData.get("folder");
    console.info(JSON.stringify({
      requestId,
      stage: "before_validate_file",
      hasFile: file instanceof File,
      folder: typeof folder === "string" ? folder : "(non-string)",
    }));
    if (!(file instanceof File)) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Thiếu tệp ảnh." }, { status: 400 });
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.trim().toLowerCase() || ""
      : "";
    console.info(JSON.stringify({
      requestId,
      stage: "after_validate_file",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extension,
      contentTypeAllowed: ALLOWED_CONTENT_TYPES.has(file.type),
      extensionAllowed: ALLOWED_FILE_EXTENSIONS.has(extension),
    }));
    if (!ALLOWED_CONTENT_TYPES.has(file.type) || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Chỉ chấp nhận tệp ảnh hợp lệ." }, { status: 400 });
    }

    const maxSizeInBytes = 8 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Tệp ảnh vượt giới hạn cho phép." }, { status: 400 });
    }

    const tR2Upload = Date.now();
    console.time(`r2_upload:${requestId}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = buildR2ObjectKey(safeFolder(folder), file.name);
    console.info(JSON.stringify({
      requestId,
      stage: "before_build_key",
      safeFolder: safeFolder(folder),
      fileName: file.name,
      objectKey,
    }));
    const url = await uploadBufferToR2({
      objectKey,
      body: buffer,
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      requestId,
    });
    console.info(JSON.stringify({
      requestId,
      stage: "after_putobject_and_public_url",
      objectKey,
      url,
    }));
    console.timeEnd(`r2_upload:${requestId}`);
    const r2UploadMs = Date.now() - tR2Upload;

    const uploadTotalMs = Date.now() - tUploadTotal;
    console.timeEnd(`upload_total:${requestId}`);

    console.info(JSON.stringify({
      requestId,
      uploadTotalMs,
      authCheckMs,
      formDataParseMs,
      r2UploadMs,
    }));

    console.log(
      JSON.stringify({
        event: "upload_metrics",
        fileSize: file.size,
        fileType: file.type,
      }),
    );

    return NextResponse.json({ url, objectKey });
  } catch (error) {
    console.timeEnd(`upload_total:${requestId}`);
    console.error(JSON.stringify({
      requestId,
      stage: "runtime_exception",
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
    return NextResponse.json({ message: "Không thể tải ảnh lên. Vui lòng thử lại." }, { status: 500 });
  }
}
