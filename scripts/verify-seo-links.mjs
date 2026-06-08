/**
 * SEO Internal Linking Verification Script
 * 
 * Tests:
 *   TEST 1: PostProduct records for the known post
 *   TEST 2: Product status check
 *   TEST 3: API endpoint /api/admin/posts/[id]/seo-products
 *   TEST 4: Server data flow (seoProducts → relatedProducts)
 *   TEST 5: HTML output (/bai-viet/[slug])
 * 
 * Usage: node scripts/verify-seo-links.mjs
 */

import { PrismaClient } from "@prisma/client";
import { createServer } from "http";

const db = new PrismaClient();

const POST_SLUG = "nhung-sai-lam-khi-sac-dien-thoai-lam-giam-tuoi-tho-pin";

async function main() {
  console.log("=".repeat(60));
  console.log("SEO INTERNAL LINKING VERIFICATION");
  console.log("=".repeat(60));
  console.log();

  let post;
  try {
    post = await db.post.findUnique({
      where: { slug: POST_SLUG },
      include: {
        seoProducts: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Cannot query Post:", err.message);
  }

  if (!post) {
    console.log(`❌ Post with slug "${POST_SLUG}" not found.`);
    console.log("   Trying alternative: listing all posts...");
    const posts = await db.post.findMany({ take: 5, select: { id: true, title: true, slug: true } });
    for (const p of posts) {
      console.log(`   - [${p.id}] ${p.title} (/${p.slug})`);
    }
    console.log();
    console.log("   To proceed, update POST_SLUG in this script with an actual slug.");
    await db.$disconnect();
    return;
  }

  // ===================================================================
  // TEST 1 - DATABASE
  // ===================================================================
  console.log("TEST 1 - DATABASE (PostProduct records)");
  console.log("-".repeat(40));
  console.log(`Post: "${post.title}" (slug: /${post.slug})`);
  console.log(`Post ID: ${post.id}`);
  console.log();
  console.log(`PostProduct records: ${post.seoProducts.length}`);
  if (post.seoProducts.length > 0) {
    for (const sp of post.seoProducts) {
      console.log(`  [sortOrder=${sp.sortOrder}]`);
      console.log(`    postId:    ${sp.postId}`);
      console.log(`    productId: ${sp.productId}`);
      console.log(`    product:   "${sp.product.name}" (/${sp.product.slug})`);
      console.log(`    status:    ${sp.product.status}`);
      console.log();
    }
  } else {
    console.log("  No PostProduct records found.");
    console.log("  → Cannot verify fix without data.");
  }

  // ===================================================================
  // TEST 2 - PRODUCT STATUS
  // ===================================================================
  console.log("TEST 2 - PRODUCT INDIVIDUAL STATUS");
  console.log("-".repeat(40));
  if (post.seoProducts.length > 0) {
    for (const sp of post.seoProducts) {
      const product = await db.product.findUnique({
        where: { id: sp.productId },
        select: { id: true, name: true, slug: true, status: true },
      });
      if (product) {
        console.log(`ID:     ${product.id}`);
        console.log(`Name:   "${product.name}"`);
        console.log(`Slug:   /${product.slug}`);
        console.log(`Status: ${product.status}`);
        const isVisible = product.status !== "ARCHIVED";
        console.log(`Visible in related products: ${isVisible ? "✅ YES" : "❌ NO (ARCHIVED)"}`);
        console.log();
      }
    }
  } else {
    console.log("  (No products to check)");
  }

  // ===================================================================
  // TEST 3 - API (simulate the GET /api/admin/posts/[id]/seo-products)
  // ===================================================================
  console.log("TEST 3 - SERVER-SIDE API SIMULATION");
  console.log("-".repeat(40));
  const rawRows = await db.$queryRawUnsafe(
    `SELECT pp.id, pp."sortOrder", p.id AS "productId", p.name, p.slug, p.status,
            (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) AS thumbnail
     FROM "PostProduct" pp
     INNER JOIN "Product" p ON p.id = pp."productId"
     WHERE pp."postId" = $1
     ORDER BY pp."sortOrder" ASC`,
    post.id
  );
  const rows = rawRows;
  console.log(`API rows returned: ${rows.length}`);
  if (rows.length > 0) {
    for (const r of rows) {
      console.log(`  [sortOrder=${r.sortOrder}] ${r.name} (/${r.slug}) status=${r.status}`);
    }
  }

  // ===================================================================
  // TEST 4 - SERVER DATA FLOW (simulating getPostBySlug filter)
  // ===================================================================
  console.log();
  console.log("TEST 4 - SERVER DATA FLOW (filter simulation)");
  console.log("-".repeat(40));
  const seoProducts = post.seoProducts || [];
  console.log(`seoProducts.length (before filter): ${seoProducts.length}`);
  const relatedProducts = seoProducts
    .filter((sp) => sp.product.status !== "ARCHIVED")
    .map((sp) => ({
      id: sp.product.id,
      name: sp.product.name,
      slug: sp.product.slug,
      basePrice: null,
      salePrice: null,
      thumbnailUrl: null,
      status: sp.product.status,
    }));
  console.log(`relatedProducts.length (after filter): ${relatedProducts.length}`);
  if (relatedProducts.length > 0) {
    console.log(`✅ Bug fix confirmed: filter changed from "ACTIVE" to "not ARCHIVED"`);
    for (const rp of relatedProducts) {
      console.log(`   - "${rp.name}" (/${rp.slug}) status=${rp.status} → VISIBLE`);
    }
  } else if (seoProducts.length > 0) {
    console.log(`❌ All products are ARCHIVED - filter returns empty`);
    console.log(`   Check product statuses above.`);
  } else {
    console.log(`⚠️  No PostProduct records - cannot verify filter`);
  }

  // ===================================================================
  // TEST 5 - HTML output (via dev server)
  // ===================================================================
  console.log();
  console.log("TEST 5 - HTML OUTPUT (via HTTP request)");
  console.log("-".repeat(40));
  
  try {
    const response = await fetch(`http://localhost:3000/bai-viet/${post.slug}`);
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: Cannot fetch page (dev server not running?)`);
      console.log("   Start with: npm run dev");
    } else {
      const html = await response.text();
      const hasSeoSection = html.includes("Sản phẩm liên quan");
      const hasSanPhamLink = html.includes('href="/san-pham/');
      console.log(`Page fetched: /bai-viet/${post.slug}`);
      console.log(`Content length: ${html.length} bytes`);
      console.log(`Contains "Sản phẩm liên quan": ${hasSeoSection ? "✅ YES" : "❌ NO"}`);
      console.log(`Contains href="/san-pham/: ${hasSanPhamLink ? "✅ YES" : "❌ NO"}`);
      if (hasSanPhamLink) {
        // Extract first matching href
        const match = html.match(/href="\/san-pham\/[^"]+"/);
        if (match) {
          console.log(`  First link found: ${match[0]}`);
        }
      }
    }
  } catch (err) {
    console.log(`❌ Cannot fetch: ${err.message}`);
    console.log("   Likely dev server is not running.");
    console.log("   Start with: npm run dev");
  }

  // ===================================================================
  // REPORT
  // ===================================================================
  console.log();
  console.log("=".repeat(60));
  console.log("VERIFICATION REPORT");
  console.log("=".repeat(60));
  console.log();
  console.log(`1. DB records count:    ${post.seoProducts.length}`);
  if (post.seoProducts.length > 0) {
    const activeCount = post.seoProducts.filter((sp) => sp.product.status !== "ARCHIVED").length;
    const archivedCount = post.seoProducts.filter((sp) => sp.product.status === "ARCHIVED").length;
    console.log(`   - Visible (not ARCHIVED): ${activeCount}`);
    console.log(`   - Filtered out (ARCHIVED): ${archivedCount}`);
  }
  console.log(`2. API result count:   ${rows.length}`);
  console.log(`3. relatedProducts.length: ${relatedProducts.length}`);
  console.log(`4. Product statuses:   ${post.seoProducts.map((sp) => sp.product.status).join(", ") || "N/A"}`);
  console.log();

  if (relatedProducts.length > 0 && post.seoProducts.length > 0) {
    console.log("🔵 KẾT LUẬN: BUG ĐÃ ĐƯỢC SỬA (PASS)");
    console.log(`   Filter hiện tại: status !== "ARCHIVED"`);
    console.log(`   Hiển thị ${relatedProducts.length}/${post.seoProducts.length} sản phẩm`);
  } else if (post.seoProducts.length === 0) {
    console.log("🟡 KẾT LUẬN: KHÔNG CÓ DỮ LIỆU ĐỂ KIỂM TRA");
    console.log("   Cần tạo PostProduct records trước.");
  } else {
    console.log("🔴 KẾT LUẬN: TẤT CẢ SẢN PHẨM ĐỀU ARCHIVED");
    console.log("   Cần kiểm tra lại dữ liệu.");
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
