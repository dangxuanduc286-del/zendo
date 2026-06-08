/**
 * Script audit: Kiểm tra tại sao "Sản phẩm liên quan" không hiển thị
 * Chạy: node scripts/audit-related-products.cjs
 * KHÔNG sửa code. CHỈ AUDIT.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const db = new PrismaClient();
  try {
    // 1. Tìm post
    const slug = "may-loc-khong-khi-co-thuc-su-can-thiet-cho-gia-dinh-hien-dai";
    const post = await db.post.findFirst({ where: { slug } });
    if (!post) {
      console.log("=== POST NOT FOUND ===");
      return;
    }
    console.log("=== POST FOUND ===");
    console.log("id:", post.id);
    console.log("slug:", post.slug);
    console.log("status:", post.status);
    console.log("");

    // 2. Đếm PostProduct rows
    let ppRows;
    try {
      ppRows = await db.$queryRawUnsafe(
        'SELECT * FROM "PostProduct" WHERE "postId" = $1 ORDER BY "sortOrder" ASC',
        post.id
      );
    } catch (e) {
      console.log("PostProduct table error:", e.message);
      ppRows = [];
    }
    console.log("=== PostProduct rows:", ppRows.length, "===");
    if (ppRows.length > 0) {
      for (const r of ppRows) {
        console.log("  postId:", r.postId, "| productId:", r.productId, "| sortOrder:", r.sortOrder);
      }
    }
    console.log("");

    // 3. Lấy product details
    let products = [];
    try {
      products = await db.$queryRawUnsafe(
        `SELECT p.id, p.name, p.slug, p.status, p."basePrice"::text AS base_price,
                p."salePrice"::text AS sale_price,
                (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) AS thumbnail
         FROM "Product" p
         INNER JOIN "PostProduct" pp ON p.id = pp."productId"
         WHERE pp."postId" = $1
         ORDER BY pp."sortOrder" ASC`,
        post.id
      );
    } catch (e) {
      console.log("Product join error:", e.message);
    }

    console.log("=== Products from JOIN:", products.length, "===");
    for (const p of products) {
      const check1 = p.status !== "ARCHIVED";
      const check2 = !!p.slug;
      const check3 = !!p.name;
      const passed = check1 && check2 && check3;
      console.log("  id:", p.id);
      console.log("  name:", p.name);
      console.log("  slug:", p.slug);
      console.log("  status:", p.status);
      console.log("  status !== ARCHIVED:", check1);
      console.log("  slug exists:", check2);
      console.log("  name exists:", check3);
      console.log("  PASSES FILTER:", passed ? "YES" : "NO");
      if (!passed) {
        if (!check1) console.log("  >> BỊ LOẠI ở dòng 139: sp.product.status !== \"ARCHIVED\"");
        if (!check2) console.log("  >> BỊ LOẠI ở dòng 140: sp.product.slug");
        if (!check3) console.log("  >> BỊ LOẠI ở dòng 141: sp.product.name");
      }
      console.log("");
    }

    // 4. Đếm raw từ PostProduct (không filter)
    console.log("=== KẾT LUẬN ===");
    if (products.length === 0) {
      console.log("KHÔNG có product nào trong PostProduct cho post này.");
      console.log("=> 'Sản phẩm liên quan' không hiển thị vì seoProductsRaw = []");
      console.log("=> Nguyên nhân: bảng PostProduct không có dòng nào cho postId=" + post.id);
    } else {
      const allPassed = products.every(p => p.status !== "ARCHIVED" && !!p.slug && !!p.name);
      if (allPassed) {
        console.log("Tất cả product đều pass filter. relatedProducts sẽ có", products.length, "items.");
        console.log("=> Nếu frontend không hiển thị, kiểm tra component PostRelatedProducts");
      } else {
        console.log("Một số product bị filter loại (xem chi tiết ở trên).");
      }
    }

    // 5. Kiểm tra file code thực tế đang chạy - dòng filter
    console.log("");
    console.log("=== CODE CHECK ===");
    console.log("File: src/app/(storefront)/(with-chrome)/bai-viet/[slug]/page.tsx");
    console.log("Filter code dòng 136-142:");
    console.log("  seoProductsRaw.filter((sp) =>");
    console.log("    sp.product.status !== \"ARCHIVED\" &&");
    console.log("    sp.product.slug &&");
    console.log("    sp.product.name");
    console.log("  )");
    console.log("=> Filter là **!== \"ARCHIVED\"** (hiển thị ACTIVE + OUT_OF_STOCK)");
    console.log("=> KHÔNG phải === \"ACTIVE\"");

    await db.$disconnect();
  } catch (err) {
    console.error("FATAL:", err);
    await db.$disconnect();
  }
}

main();
