import { NextResponse } from "next/server";

/**
 * Endpoint cho `/ads.txt`.
 *
 * Bối cảnh:
 * - Google AdSense và các ad network yêu cầu file `ads.txt` tại root domain
 *   để xác thực inventory (`https://zendo.vn/ads.txt`).
 * - Chưa có AdSense Publisher ID → trả nội dung placeholder (comment) thay vì
 *   để route bị fallback về dynamic `[slug]/page.tsx` → HTML 404.
 *
 * Khi được duyệt AdSense, thay nội dung body bằng:
 *   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
 *
 * Static segment `ads.txt/route.ts` có precedence cao hơn dynamic
 * `[slug]/page.tsx`, đảm bảo không có React page nào render ở route này.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

const ADS_TXT_BODY =
  "# ads.txt sẽ được cập nhật sau khi AdSense được duyệt\n";

export function GET(): NextResponse {
  return new NextResponse(ADS_TXT_BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

export function HEAD(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
