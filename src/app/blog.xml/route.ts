import { NextResponse } from "next/server";
import { resolveSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 1800;

type BlogPostRow = {
  slug: string;
  updatedAt: Date;
  publishedAt: Date | null;
};

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("@/lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function siteOrigin(): string {
  return resolveSiteUrl().replace(/\/+$/, "");
}

function xmlEscape(value: string): string {
  const amp = String.fromCharCode(38, 97, 109, 112, 59);
  const lt = String.fromCharCode(38, 108, 116, 59);
  const gt = String.fromCharCode(38, 103, 116, 59);
  const quot = String.fromCharCode(38, 113, 117, 111, 116, 59);
  const apos = String.fromCharCode(38, 97, 112, 111, 115, 59);

  return value
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

function formatLastmod(value: Date): string {
  return value.toISOString();
}

async function loadPublishedPosts(): Promise<BlogPostRow[]> {
  const db = await getDbClient();
  if (!db) return [];
  try {
    return (await db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: { slug: true, updatedAt: true, publishedAt: true },
    })) as BlogPostRow[];
  } catch {
    return [];
  }
}

function buildBlogSitemap(posts: BlogPostRow[], base: string): string {
  const now = new Date();
  const indexLastmod = formatLastmod(
    posts.length > 0 ? (posts[0].updatedAt ?? posts[0].publishedAt ?? now) : now,
  );

  const urls: string[] = [
    [
      "  <url>",
      `    <loc>${xmlEscape(`${base}/bai-viet`)}</loc>`,
      `    <lastmod>${indexLastmod}</lastmod>`,
      "    <changefreq>daily</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    ].join("\n"),
  ];

  for (const post of posts) {
    const lastmodSource = post.updatedAt ?? post.publishedAt ?? now;
    urls.push(
      [
        "  <url>",
        `    <loc>${xmlEscape(`${base}/bai-viet/${post.slug}`)}</loc>`,
        `    <lastmod>${formatLastmod(lastmodSource)}</lastmod>`,
        "    <changefreq>weekly</changefreq>",
        "    <priority>0.7</priority>",
        "  </url>",
      ].join("\n"),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

export async function GET(): Promise<NextResponse> {
  const base = siteOrigin();
  const posts = await loadPublishedPosts();
  const xml = buildBlogSitemap(posts, base);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex",
      "X-Post-Count": String(posts.length),
    },
  });
}
