import { NextResponse } from "next/server";

/**
 * Endpoint chuyên dụng cho `/account.xml`.
 *
 * Bối cảnh:
 * - Google Search Console từng phát hiện URL `https://zendo.vn/account.xml`
 *   (kiểu sitemap Shopify) và liên tục báo các lỗi:
 *     • Couldn't fetch
 *     • HTTP 404
 *     • Sitemap is HTML
 * - Codebase Next.js hiện tại KHÔNG khai báo URL này ở:
 *   `sitemap.ts`, `robots.ts`, `next.config.mjs`, hay `middleware.ts`.
 * - Tuy nhiên dynamic catch-all `src/app/(storefront)/(with-chrome)/[slug]/page.tsx`
 *   sẽ match `slug = "account.xml"` → DB không có page → `notFound()`
 *   → Next.js render `src/app/not-found.tsx` (React/HTML 404 page).
 *   Đó là lý do GSC nhận về `Sitemap is HTML` và "Couldn't fetch".
 *
 * Mục tiêu:
 * - URL `/account.xml` không tồn tại như một sitemap (không có resource công khai
 *   nào cần index dưới đường dẫn này — `sitemap.xml` đã bao phủ toàn bộ).
 * - Vì vậy phải trả về `404` THẬT SỰ với `Content-Type: text/plain`
 *   (KHÔNG render React, KHÔNG trả HTML, KHÔNG redirect, KHÔNG sitemap giả).
 *
 * Static segment `account.xml/route.ts` có precedence cao hơn dynamic
 * `[slug]/page.tsx`, nên chặn được fallback về 404 page React.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

const NOT_FOUND_BODY = "Not Found";

function notFoundResponse(): NextResponse {
  return new NextResponse(NOT_FOUND_BODY, {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function GET(): NextResponse {
  return notFoundResponse();
}

export function HEAD(): NextResponse {
  return notFoundResponse();
}
