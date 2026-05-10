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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Thiếu tệp ảnh." }, { status: 400 });
    }

    if (typeof kind !== "string" || !(kind in UPLOAD_FOLDER_BY_KIND)) {
      return NextResponse.json({ message: "Loại ảnh không hợp lệ." }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop()?.trim().toLowerCase() || "" : "";
    if (!ALLOWED_CONTENT_TYPES.has(file.type) || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
      return NextResponse.json({ message: "Chỉ hỗ trợ ảnh PNG, JPG, JPEG, WEBP, SVG hoặc ICO." }, { status: 400 });
    }

    const maxSizeInBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: "Ảnh vượt quá 4MB." }, { status: 400 });
    }

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
    const url = await uploadBufferToR2({
      objectKey,
      body: Buffer.from(arrayBuffer),
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    });

    return NextResponse.json({ url, objectKey, kind });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Upload ảnh thất bại." },
      { status: 500 },
    );
  }
}
