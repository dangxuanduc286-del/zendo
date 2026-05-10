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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Thiếu tệp ảnh." }, { status: 400 });
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.trim().toLowerCase() || ""
      : "";
    if (!ALLOWED_CONTENT_TYPES.has(file.type) || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
      return NextResponse.json({ message: "Chỉ chấp nhận tệp ảnh hợp lệ." }, { status: 400 });
    }

    const maxSizeInBytes = 8 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: "Tệp ảnh vượt giới hạn cho phép." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = buildR2ObjectKey(safeFolder(folder), file.name);
    const url = await uploadBufferToR2({
      objectKey,
      body: buffer,
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    });
    return NextResponse.json({ url, objectKey });
  } catch {
    return NextResponse.json({ message: "Không thể tải ảnh lên. Vui lòng thử lại." }, { status: 500 });
  }
}
