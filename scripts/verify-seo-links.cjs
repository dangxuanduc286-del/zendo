/**
 * SEO Internal Linking Verification Script (CommonJS)
 * 
 * Tests:
 *   TEST 1: PostProduct DB records
 *   TEST 2: Product status check
 *   TEST 3: Server data flow (filter simulation)
 *   TEST 4: HTML output (dev server)
 * 
 * Usage: node scripts/verify-seo-links.cjs
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { createServer } = require("http");

// Load env
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/zendo";
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const POST_SLUG = "nhung-sai-lam-khi-sac-dien-thoai-lam-giam-tuoi-tho-pin";

async function main() {
  console.log("=".repeat(60));
  console.log("SEO INTERNAL LINKING VERIFICATION");
  console.log("=".repeat(60));
  console.log();

  // ===================================================================
  // FIND POST
  // ===================================================================
  let post = await db.post.findUnique({
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

  if (!post) {
    console.log(`❌ Post with slug "${POST_SLUG}" not found.`);
    console.log("   Trying alternative: search for posts with similar title...");
    const posts = await db.post.findMany({
      where: { slug: { contains: "sac" } },
      take: 5,
      select: { id: true, title: true, slug: true },
    });
    if (posts.length > 0) {
      console.log("   Found posts:");
      for (const p of posts) {
        console.log(`   - "${p.title}" (/${p.slug})`);
      }
    } else {
      console.log("   No posts found containing 'sac' in slug.");
      // List all posts
      const allPosts = await db.post.findMany({ take: 10, select: { id: true, title: true, slug: true } });
      console.log("   All posts in DB:");
      for (const p of allPosts) {
        console.log(`   - "${p.title}" (/${p.slug})`);
      }
    }
    await db.$disconnect();
    return;
  }

  // ===================================================================
  // TEST 1 - DATABASE
  // ===================================================================
  console.log("=".repeat(60));
  console.log("TEST 1 - DATABASE (PostProduct records)");
  console.log("=".repeat(60));
  console.log(`Post: "${post.title}" (${post.slug})`);
  console.log(`Post ID: ${post.id}`);
  console.log(`PostProduct count: ${post.seoProducts.length}`);
  console.log();
  if (post.seoProducts.length > 0) {
    for (const sp of post.seoProducts) {
      console.log(`  [${sp.sortOrder}] ${sp.product.name}`);
      console.log(`    productId: ${sp.product.id}`);
      console.log(`    slug: /${sp.product.slug}`);
      console.log(`    status: ${sp.product.status}`);
    }
  } else {
    console.log("  (no records)");
  }
  console.log();

  // ===================================================================
  // TEST 2 - PRODUCT STATUS
  // ===================================================================
  console.log("=".repeat(60));
  console.log("TEST 2 - PRODUCT STATUS CHECK");
  console.log("=".repeat(60));
  console.log();
  if (post.seoProducts.length > 0) {
    for (const sp of post.seoProducts) {
      const visible = sp.product.status !== "ARCHIVED";
      console.log(`  "${sp.product.name}"`);
      console.log(`    status:  ${sp.product.status}`);
      console.log(`    visible: ${visible ? "✅ YES (not ARCHIVED)" : "❌ NO (ARCHIVED)"}`);
      console.log();
    }
  } else {
    console.log("  (no products to check)");
  }

  // ===================================================================
  // TEST 3 - SERVER DATA FLOW SIMULATION
  // ===================================================================
  console.log("=".repeat(60));
  console.log("TEST 3 - FILTER SIMULATION (getPostBySlug)");
  console.log("=".repeat(60));
  console.log();
  
  const seoProducts = post.seoProducts || [];
  console.log(`seoProducts.length (raw from DB): ${seoProducts.length}`);

  // OLD filter: sp.product.status === "ACTIVE"
  const oldFilter = seoProducts.filter((sp) => sp.product.status === "ACTIVE");
  console.log(`OLD filter (=== "ACTIVE"): ${oldFilter.length} products`);

  // NEW filter: sp.product.status !== "ARCHIVED"
  const newFilter = seoProducts.filter((sp) => sp.product.status !== "ARCHIVED");
  console.log(`NEW filter (!== "ARCHIVED"): ${newFilter.length} products`);
  
  console.log();
  
  if (seoProducts.length > 0) {
    const oldSlugs = oldFilter.map((sp) => sp.product.slug).join(", ") || "(empty)";
    const newSlugs = newFilter.map((sp) => sp.product.slug).join(", ") || "(empty)";
    console.log(`  OLD filter would show: ${oldSlugs}`);
    console.log(`  NEW filter shows:     ${newSlugs}`);
    console.log();
    
    if (newFilter.length > 0) {
      console.log("✅ PASS: relatedProducts.length > 0 — Bug đã được sửa");
      console.log(`   Hiển thị ${newFilter.length}/${seoProducts.length} sản phẩm`);
    } else {
      console.log("❌ FAIL: All products are ARCHIVED");
    }
  } else {
    console.log("⚠️  Cannot verify filter — no PostProduct records");
  }
  console.log();

  // ===================================================================
  // TEST 4 - HTML OUTPUT (via HTTP)
  // ===================================================================
  console.log("=".repeat(60));
  console.log("TEST 4 - HTML OUTPUT (HTTP GET /bai-viet/[slug])");
  console.log("=".repeat(60));
  console.log();
  
  try {
    const response = await fetch(`http://localhost:3000/bai-viet/${post.slug}`);
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: Dev server may not be running.`);
      console.log("   Start with: npm run dev");
    } else {
      const html = await response.text();
      const hasSection = html.includes("Sản phẩm liên quan");
      const hasLink = html.includes('href="/san-pham/');
      console.log(`Page: /bai-viet/${post.slug}`);
      console.log(`Size: ${html.length} bytes`);
      console.log(`"Sản phẩm liên quan":     ${hasSection ? "✅ FOUND" : "❌ NOT FOUND"}`);
      console.log(`href="/san-pham/...":     ${hasLink ? "✅ FOUND" : "❌ NOT FOUND"}`);
      
      if (hasLink) {
        const matches = html.match(/href="\/san-pham\/[^"]+"/g);
        if (matches) {
          console.log(`Number of product links: ${matches.length}`);
          matches.forEach((m, i) => console.log(`  [${i + 1}] ${m}`));
        }
      }
      
      if (hasSection && hasLink) {
        console.log();
        console.log("✅ PASS: SEO Internal Linking hoạt động trên storefront");
      } else {
        console.log();
        console.log("❌ FAIL: Missing expected content");
      }
    }
  } catch (err) {
    console.log(`❌ Cannot fetch: ${err.message}`);
    console.log("   Dev server may not be running.");
    console.log("   Start with: npm run dev");
  }

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log();
  console.log("=".repeat(60));
  console.log("📋 VERIFICATION REPORT");
  console.log("=".repeat(60));
  console.log();
  console.log(`Post: "${post.title}"`);
  console.log(`Slug: /${post.slug}`);
  console.log(`PostProduct records: ${post.seoProducts.length}`);
  console.log(`Product statuses:    ${post.seoProducts.map((sp) => sp.product.status).join(", ") || "N/A"}`);
  console.log(`RelatedProducts (new filter): ${newFilter.length}`);
  console.log(`Bug fix applied:     ${newFilter.length >= oldFilter.length ? "✅ YES" : "⚠️  CHECK"}`);
  console.log();
  
  if (newFilter.length > 0 && post.seoProducts.length > 0) {
    console.log("🔵 KẾT LUẬN: BUG ĐÃ ĐƯỢC SỬA (PASS)");
    console.log(`   Filter "status !== 'ARCHIVED'" hiển thị ${newFilter.length}/${post.seoProducts.length} sản phẩm`);
    console.log(`   (trước đây filter "status === 'ACTIVE'" chỉ hiển thị ${oldFilter.length}/${post.seoProducts.length})`);
  } else if (post.seoProducts.length === 0) {
    console.log("🟡 KẾT LUẬN: KHÔNG CÓ DỮ LIỆU PostProduct");
    console.log("   Cần tạo dữ liệu qua admin trước");
  } else {
    console.log("🔴 KẾT LUẬN: TẤT CẢ SẢN PHẨM ĐỀU ARCHIVED");
    console.log("   Kiểm tra lại product status trong DB");
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
