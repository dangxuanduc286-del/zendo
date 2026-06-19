import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { buildR2ObjectKey, uploadBufferToR2 } from "../../../../../lib/cloudflare-r2";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const ALLOWED_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg", "ico"]);
const UPLOAD_FOLDER_BY_KIND: Record<string, string> = {
  logo: "images/settings/logo",
  favicon: "images/settings/favicon",
  og: "images/settings/og",
  banner: "images/banners",
  product: "images/products",
  category: "images/categories",
  brand: "images/brands",
  post: "images/posts",
  theme: "images/theme",
};

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

    console.info(JSON.stringify({ requestId, stage: "before_formData_parse", userId: session.user.id }));
    const tFormDataParse = Date.now();
    console.time(`formdata_parse:${requestId}`);
    const formData = await request.formData();
    console.timeEnd(`formdata_parse:${requestId}`);
    const formDataParseMs = Date.now() - tFormDataParse;
    console.info(JSON.stringify({ requestId, stage: "after_formData_parse", formDataParseMs }));
    const file = formData.get("file");
    const kind = formData.get("kind");
    const folder = formData.get("folder");

    console.info(JSON.stringify({
      requestId,
      stage: "before_validate_file",
      hasFile: file instanceof File,
      kind: typeof kind === "string" ? kind : "(non-string)",
      folder: typeof folder === "string" ? folder : "(non-string)",
    }));
    if (!(file instanceof File)) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Thiếu tệp ảnh." }, { status: 400 });
    }

    if (typeof kind !== "string" || !(kind in UPLOAD_FOLDER_BY_KIND)) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Loại ảnh không hợp lệ." }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop()?.trim().toLowerCase() || "" : "";
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
      return NextResponse.json({ message: "Chỉ hỗ trợ ảnh PNG, JPG, JPEG, WEBP, SVG hoặc ICO." }, { status: 400 });
    }

    const maxSizeInBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      console.timeEnd(`upload_total:${requestId}`);
      return NextResponse.json({ message: "Ảnh vượt quá 4MB." }, { status: 400 });
    }

    const tR2Upload = Date.now();
    console.time(`r2_upload:${requestId}`);
    const arrayBuffer = await file.arrayBuffer();
    const safeFolder =
      typeof folder === "string" && folder.trim()
        ? folder
            .trim()
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "")
            .replace(/\.\./g, "")
        : UPLOAD_FOLDER_BY_KIND[kind];
    const objectKey = buildR2ObjectKey(safeFolder, file.name);
    console.info(JSON.stringify({ requestId, stage: "before_build_key", safeFolder, fileName: file.name, objectKey }));
    const url = await uploadBufferToR2({
      objectKey,
      body: Buffer.from(arrayBuffer),
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      requestId,
    });
    console.info(JSON.stringify({ requestId, stage: "after_putobject_and_public_url", objectKey, url }));
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
        kind,
        fileSize: file.size,
        fileType: file.type,
      }),
    );

    return NextResponse.json({ url, objectKey, kind });
  } catch (error) {
    console.timeEnd(`upload_total:${requestId}`);
    console.error(JSON.stringify({
      requestId,
      stage: "runtime_exception",
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
    return NextResponse.json(
      { message: "Upload ảnh thất bại." },
      { status: 500 },
    );
  }
}
