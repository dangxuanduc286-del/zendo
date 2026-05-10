import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured for seed.");
}
const prismaPool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({
  adapter: new PrismaPg(prismaPool),
});
const mediaBaseUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "https://media.zendo.vn").replace(
  /\/+$/g,
  "",
);

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mediaUrl(path: string): string {
  const normalized = path.replace(/^\/+/g, "");
  return `${mediaBaseUrl}/${normalized}`;
}

async function main() {
  const rolesSeed = [
    {
      name: "SUPER_ADMIN",
      slug: "super-admin",
      description: "Toàn quyền quản trị hệ thống",
      permissions: {
        all: true,
        modules: ["dashboard", "catalog", "orders", "customers", "content", "settings"],
      },
      isSystem: true,
    },
    {
      name: "ADMIN",
      slug: "admin",
      description: "Quản trị vận hành hệ thống",
      permissions: {
        all: false,
        modules: ["dashboard", "catalog", "orders", "content", "settings"],
      },
      isSystem: true,
    },
    {
      name: "CONTENT_MANAGER",
      slug: "content-manager",
      description: "Quản lý nội dung, banner, blog và SEO",
      permissions: {
        all: false,
        modules: ["content", "seo", "banner", "blog", "page", "faq"],
      },
      isSystem: true,
    },
    {
      name: "USER",
      slug: "user",
      description: "Tài khoản người dùng thông thường",
      permissions: {
        all: false,
        modules: ["profile", "orders"],
      },
      isSystem: true,
    },
  ];

  for (const role of rolesSeed) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
      create: role,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "admin" },
  });

  const adminPhoneLogin = "0564162222";
  const adminPasswordHash = await hash("duc120897", 12);
  const existingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: "admin@zendo.vn" }, { username: adminPhoneLogin }],
    },
    select: { id: true },
  });

  if (existingAdmin) {
    await prisma.admin.update({
      where: { id: existingAdmin.id },
      data: {
        email: "admin@zendo.vn",
        fullName: "Zendo Admin",
        username: adminPhoneLogin,
        passwordHash: adminPasswordHash,
        status: "ACTIVE" as const,
        roleId: adminRole.id,
      },
    });
  } else {
    await prisma.admin.create({
      data: {
        email: "admin@zendo.vn",
        fullName: "Zendo Admin",
        username: adminPhoneLogin,
        passwordHash: adminPasswordHash,
        status: "ACTIVE" as const,
        roleId: adminRole.id,
      },
    });
  }

  await prisma.admin.deleteMany({
    where: {
      NOT: {
        username: adminPhoneLogin,
      },
    },
  });

  const categoriesSeed = [
    {
      name: "Điện Tử",
      slug: "dien-tu",
      description: "Sản phẩm điện tử, công nghệ chính hãng",
      imageUrl: mediaUrl("images/categories/dien-tu.jpg"),
      seoTitle: "Danh mục điện tử chính hãng",
      seoDescription: "Mua sắm điện tử chính hãng với giá tốt, giao nhanh toàn quốc",
      status: "PUBLISHED" as const,
      sortOrder: 1,
    },
    {
      name: "Thời Trang",
      slug: "thoi-trang",
      description: "Thời trang nam nữ theo xu hướng mới",
      imageUrl: mediaUrl("images/categories/thoi-trang.jpg"),
      seoTitle: "Danh mục thời trang xu hướng",
      seoDescription: "Thời trang phong cách, chất liệu cao cấp, giá hợp lý",
      status: "PUBLISHED" as const,
      sortOrder: 2,
    },
    {
      name: "Nhà Cửa",
      slug: "nha-cua",
      description: "Đồ gia dụng và trang trí nhà cửa",
      imageUrl: mediaUrl("images/categories/nha-cua.jpg"),
      seoTitle: "Đồ gia dụng nhà cửa chất lượng",
      seoDescription: "Sản phẩm gia dụng bền đẹp, tối ưu không gian sống",
      status: "PUBLISHED" as const,
      sortOrder: 3,
    },
    {
      name: "Mẹ Và Bé",
      slug: "me-va-be",
      description: "Sản phẩm dành cho mẹ bầu và trẻ em",
      imageUrl: mediaUrl("images/categories/me-va-be.jpg"),
      seoTitle: "Sản phẩm mẹ và bé an toàn",
      seoDescription: "Đồ dùng mẹ và bé chính hãng, an toàn và tiện lợi",
      status: "PUBLISHED" as const,
      sortOrder: 4,
    },
    {
      name: "Làm Đẹp",
      slug: "lam-dep",
      description: "Mỹ phẩm và chăm sóc cá nhân",
      imageUrl: mediaUrl("images/categories/lam-dep.jpg"),
      seoTitle: "Mỹ phẩm chính hãng giá tốt",
      seoDescription: "Mỹ phẩm dưỡng da, chăm sóc tóc và cơ thể an toàn",
      status: "PUBLISHED" as const,
      sortOrder: 5,
    },
  ];

  const brandsSeed = [
    {
      name: "Zendo Tech",
      slug: "zendo-tech",
      description: "Thương hiệu công nghệ cho đời sống hiện đại",
      logoUrl: mediaUrl("images/brands/zendo-tech.png"),
      website: "https://zendo.vn/brands/zendo-tech",
      seoTitle: "Zendo Tech Official Brand",
      seoDescription: "Công nghệ thông minh, bền bỉ và tối ưu trải nghiệm",
      status: "PUBLISHED" as const,
    },
    {
      name: "Urban Mode",
      slug: "urban-mode",
      description: "Thương hiệu thời trang trẻ trung, năng động",
      logoUrl: mediaUrl("images/brands/urban-mode.png"),
      website: "https://zendo.vn/brands/urban-mode",
      seoTitle: "Urban Mode - Thời trang đô thị",
      seoDescription: "Trang phục thanh lịch và thoải mái cho mỗi ngày",
      status: "PUBLISHED" as const,
    },
    {
      name: "HomeNest",
      slug: "home-nest",
      description: "Đồ gia dụng thông minh cho căn hộ hiện đại",
      logoUrl: mediaUrl("images/brands/home-nest.png"),
      website: "https://zendo.vn/brands/home-nest",
      seoTitle: "HomeNest - Đồ gia dụng thông minh",
      seoDescription: "Giải pháp gia dụng tiện lợi cho gia đình Việt",
      status: "PUBLISHED" as const,
    },
    {
      name: "BabyBloom",
      slug: "baby-bloom",
      description: "Sản phẩm cao cấp cho mẹ và bé",
      logoUrl: mediaUrl("images/brands/baby-bloom.png"),
      website: "https://zendo.vn/brands/baby-bloom",
      seoTitle: "BabyBloom - Mẹ và bé",
      seoDescription: "Sản phẩm an toàn cho hành trình phát triển của bé",
      status: "PUBLISHED" as const,
    },
    {
      name: "PureSkin",
      slug: "pure-skin",
      description: "Thương hiệu chăm sóc da từ thành phần lành tính",
      logoUrl: mediaUrl("images/brands/pure-skin.png"),
      website: "https://zendo.vn/brands/pure-skin",
      seoTitle: "PureSkin - Chăm sóc da chuẩn khoa học",
      seoDescription: "Công thức dịu nhẹ, phù hợp nhiều loại da",
      status: "PUBLISHED" as const,
    },
  ];

  for (const category of categoriesSeed) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const brand of brandsSeed) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    });
  }

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  await prisma.review.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  const productsPayload = Array.from({ length: 20 }).map((_, idx) => {
    const productNo = idx + 1;
    const category = categories[idx % categories.length];
    const brand = brands[idx % brands.length];
    const basePrice = 250000 + productNo * 15000;
    const salePrice = idx % 3 === 0 ? basePrice - 30000 : null;
    const name = `${category.name} Premium ${productNo}`;
    const slug = slugify(`${category.slug}-premium-${productNo}`);
    const sku = `ZEN-${String(productNo).padStart(4, "0")}`;
    const isFeatured = idx % 4 === 0;
    const isNew = idx % 2 === 0;
    const isBestSeller = idx % 5 === 0;

    return {
      name,
      slug,
      sku,
      shortDescription: `${name} phu hop nhu cau su dung hang ngay, chat luong cao.`,
      description: `${name} duoc thiet ke toi uu do ben, trai nghiem su dung va tinh tham my.`,
      specifications: {
        warranty: "12 months",
        material: "Composite",
        origin: "Viet Nam",
        package: ["San pham", "Huong dan su dung", "Phieu bao hanh"],
      },
      basePrice,
      salePrice,
      stockQuantity: 80 + productNo,
      isFeatured,
      isNew,
      isBestSeller,
      seoTitle: `${name} - Gia tot tai Zendo`,
      seoDescription: `Mua ${name} chinh hang, nhieu uu dai va giao nhanh trong ngay.`,
      status: "ACTIVE" as const,
      categoryId: category.id,
      brandId: brand.id,
      images: [
        {
          url: mediaUrl(`images/products/${slug}/thumbnail.jpg`),
          altText: `${name} thumbnail`,
          sortOrder: 0,
          isPrimary: true,
        },
        {
          url: mediaUrl(`images/products/${slug}/gallery-1.jpg`),
          altText: `${name} gallery image 1`,
          sortOrder: 1,
          isPrimary: false,
        },
        {
          url: mediaUrl(`images/products/${slug}/gallery-2.jpg`),
          altText: `${name} gallery image 2`,
          sortOrder: 2,
          isPrimary: false,
        },
      ],
      variants: [
        {
          name: "Standard",
          sku: `${sku}-STD`,
          options: { size: "M", color: "Default" },
          price: salePrice ?? basePrice,
          stockQuantity: 45,
          isDefault: true,
          isActive: true,
        },
        {
          name: "Premium",
          sku: `${sku}-PRO`,
          options: { size: "L", color: "Default" },
          price: (salePrice ?? basePrice) + 50000,
          stockQuantity: 30,
          isDefault: false,
          isActive: true,
        },
      ],
    };
  });

  for (const product of productsPayload) {
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        shortDescription: product.shortDescription,
        description: product.description,
        specifications: product.specifications,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        stockQuantity: product.stockQuantity,
        isFeatured: product.isFeatured,
        isNew: product.isNew,
        isBestSeller: product.isBestSeller,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        status: product.status,
        categoryId: product.categoryId,
        brandId: product.brandId,
        images: {
          create: product.images,
        },
        variants: {
          create: product.variants,
        },
      },
    });
  }

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { email: "admin@zendo.vn" },
  });

  const postsSeed = Array.from({ length: 5 }).map((_, idx) => {
    const no = idx + 1;
    const title = `Bí quyết mua sắm thông minh ${no}`;
    const slug = `bi-quyet-mua-sam-thong-minh-${no}`;
    return {
      title,
      slug,
      excerpt: `Tổng hợp kinh nghiệm mua sắm online an toàn và tiết kiệm chi phí - phần ${no}.`,
      content: `<h2>${title}</h2><p>Nội dung hướng dẫn chi tiết cho người mua hàng đa ngành trên Zendo.</p><p>Bạn nên ưu tiên sản phẩm có đánh giá tốt và thông tin rõ ràng.</p>`,
      seoTitle: `${title} | Blog Zendo`,
      seoDescription: `Chia sẻ kinh nghiệm mua sắm, tối ưu ngân sách và chọn sản phẩm phù hợp (${no}).`,
      tags: ["mua-sam", "kinh-nghiem", "zendo"],
      status: "PUBLISHED" as const,
      publishedAt: new Date(Date.now() - no * 24 * 60 * 60 * 1000),
      authorId: admin.id,
    };
  });

  for (const post of postsSeed) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        tags: post.tags,
        status: post.status,
        publishedAt: post.publishedAt,
        authorId: post.authorId,
      },
      create: {
        ...post,
        thumbnailUrl: null,
      },
    });
  }

  await prisma.post.updateMany({
    where: {
      OR: [
        { thumbnailUrl: { contains: "images/blog/bi-quyet-mua-sam-thong-minh-" } },
        { thumbnailUrl: { contains: "images/blog/post-" } },
      ],
    },
    data: { thumbnailUrl: null },
  });

  const bannersSeed = [
    {
      title: "Mega Sale Đa Ngành",
      slug: "mega-sale-da-nganh",
      imageUrl: mediaUrl("images/banners/mega-sale-desktop.jpg"),
      mobileImageUrl: mediaUrl("images/banners/mega-sale-mobile.jpg"),
      targetUrl: "/khuyen-mai/mega-sale",
      position: "home_top",
      status: "ACTIVE" as const,
      sortOrder: 1,
      startsAt: new Date(),
      endsAt: null,
    },
    {
      title: "Ưu Đãi Thành Viên Mới",
      slug: "uu-dai-thanh-vien-moi",
      imageUrl: mediaUrl("images/banners/member-sale-desktop.jpg"),
      mobileImageUrl: mediaUrl("images/banners/member-sale-mobile.jpg"),
      targetUrl: "/dang-ky",
      position: "home_middle",
      status: "ACTIVE" as const,
      sortOrder: 2,
      startsAt: new Date(),
      endsAt: null,
    },
    {
      title: "Flash Deal Cuối Tuần",
      slug: "flash-deal-cuoi-tuan",
      imageUrl: mediaUrl("images/banners/flash-deal-desktop.jpg"),
      mobileImageUrl: mediaUrl("images/banners/flash-deal-mobile.jpg"),
      targetUrl: "/flash-deal",
      position: "home_bottom",
      status: "ACTIVE" as const,
      sortOrder: 3,
      startsAt: new Date(),
      endsAt: null,
    },
  ];

  for (const banner of bannersSeed) {
    await prisma.banner.upsert({
      where: { slug: banner.slug },
      update: banner,
      create: banner,
    });
  }

  const couponsSeed = [
    {
      code: "WELCOME10",
      name: "Giảm 10% đơn đầu",
      description: "Áp dụng cho khách mới, tối đa 100.000đ",
      type: "PERCENT" as const,
      scope: "ORDER" as const,
      value: 10,
      maxDiscountAmount: 100000,
      minOrderAmount: 300000,
      usageLimit: 2000,
      usagePerCustomer: 1,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: "ACTIVE" as const,
    },
    {
      code: "FREESHIP30K",
      name: "Miễn phí vận chuyển 30k",
      description: "Ưu đãi phí vận chuyển cho đơn từ 199.000đ",
      type: "FREE_SHIPPING" as const,
      scope: "SHIPPING" as const,
      value: 30000,
      maxDiscountAmount: 30000,
      minOrderAmount: 199000,
      usageLimit: 5000,
      usagePerCustomer: 5,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: "ACTIVE" as const,
    },
    {
      code: "SAVE50K",
      name: "Giảm trực tiếp 50k",
      description: "Giảm 50.000đ cho đơn hàng từ 799.000đ",
      type: "FIXED_AMOUNT" as const,
      scope: "ORDER" as const,
      value: 50000,
      maxDiscountAmount: null,
      minOrderAmount: 799000,
      usageLimit: 1500,
      usagePerCustomer: 2,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE" as const,
    },
  ];

  for (const coupon of couponsSeed) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
  }

  const allProducts = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const faqSeed = [
    {
      question: "Thời gian giao hàng dự kiến bao lâu?",
      slug: "thoi-gian-giao-hang-du-kien-bao-lau",
      answer: "Đơn hàng nội thành giao trong 2-24 giờ, ngoại tỉnh 2-5 ngày làm việc.",
      category: "van-chuyen",
    },
    {
      question: "Tôi có thể đổi trả sản phẩm trong bao nhiêu ngày?",
      slug: "doi-tra-san-pham-trong-bao-nhieu-ngay",
      answer: "Bạn có thể đổi trả trong 7 ngày nếu sản phẩm lỗi nhà sản xuất hoặc giao sai.",
      category: "doi-tra",
    },
    {
      question: "Khách không đăng ký có đặt hàng được không?",
      slug: "khach-khong-dang-ky-co-dat-hang-duoc-khong",
      answer: "Có. Hệ thống hỗ trợ guest checkout với xác nhận qua số điện thoại/email.",
      category: "thanh-toan",
    },
    {
      question: "Có những hình thức thanh toán nào?",
      slug: "co-nhung-hinh-thuc-thanh-toan-nao",
      answer: "Hỗ trợ COD, chuyển khoản, ví điện tử và thẻ quốc tế.",
      category: "thanh-toan",
    },
    {
      question: "Làm sao để kiểm tra khuyến mãi hiện tại?",
      slug: "lam-sao-de-kiem-tra-khuyen-mai-hien-tai",
      answer: "Bạn truy cập trang khuyến mãi hoặc đăng ký nhận bản tin từ Zendo.",
      category: "khuyen-mai",
    },
  ];

  for (let idx = 0; idx < faqSeed.length; idx += 1) {
    await prisma.fAQ.upsert({
      where: { slug: faqSeed[idx].slug },
      update: {
        ...faqSeed[idx],
        productId: allProducts[idx % allProducts.length]?.id ?? null,
        status: "PUBLISHED" as const,
      },
      create: {
        ...faqSeed[idx],
        productId: allProducts[idx % allProducts.length]?.id ?? null,
        status: "PUBLISHED" as const,
      },
    });
  }

  const pagesSeed = [
    {
      title: "Câu hỏi thường gặp",
      slug: "cau-hoi-thuong-gap",
      content:
        "<p>Phần này tổng hợp câu hỏi thường gặp của khách về đặt hàng, thanh toán và giao nhận. Bạn có thể chỉnh sửa nội dung chi tiết theo đúng quy trình kinh doanh hiện tại.</p><ul><li>Kiểm tra email xác nhận sau khi đặt hàng.</li><li>Hỗ trợ COD và chuyển khoản theo cổng được bật trên cửa hàng.</li><li>Xem chi tiết vận chuyển tại chính sách giao hàng và đổi trả.</li></ul>",
      seoTitle: "Câu hỏi thường gặp | Zendo.vn",
      seoDescription: "Giải đáp thắc mắc về đặt hàng, thanh toán, vận chuyển và hậu mãi tại Zendo.vn.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Chính sách giao hàng",
      slug: "chinh-sach-giao-hang",
      content:
        "<p>Zendo.vn luôn cập nhật trạng thái đơn và thông báo đến khách trong thời gian hợp lý. Thời gian giao hàng có thể thay đổi theo khu vực và nhà vận chuyển.</p><ul><li>Đơn được xử lý theo hàng chờ và thời gian làm việc.</li><li>Khách nhận hàng kiểm tra có thể từ chối nếu bao bì hư hại nghiêm trọng và liên hệ hỗ trợ.</li></ul>",
      seoTitle: "Chính sách giao hàng | Zendo.vn",
      seoDescription: "Phạm vi giao hàng, thời gian và lưu ý nhận hàng.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Chính sách đổi trả",
      slug: "chinh-sach-doi-tra",
      content:
        "<p>Chúng tôi hỗ trợ đổi trả theo điều kiện sản phẩm còn nguyên tem, đủ chứng từ và trong khung thời gian công bố. Vui lòng bổ sung điều khoản riêng theo nhóm hàng hóa của bạn.</p>",
      seoTitle: "Chính sách đổi trả | Zendo.vn",
      seoDescription: "Điều kiện đổi trả, hoàn tiền và quy trình xử lý.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Hướng dẫn mua hàng",
      slug: "huong-dan-mua-hang",
      content:
        "<ol><li>Chọn sản phẩm và điều chỉnh số lượng trong chi tiết hoặc nhanh tại danh mục.</li><li>Điền thông tin giao hàng và chọn phương thức thanh toán.</li><li>Xác nhận đơn và theo dõi mã vận đơn tại trang tra cứu đơn hàng.</li></ol>",
      seoTitle: "Hướng dẫn mua hàng | Zendo.vn",
      seoDescription: "Các bước đặt hàng, thanh toán và nhận sản phẩm.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Giới thiệu Zendo.vn",
      slug: "gioi-thieu",
      content:
        "<p>Zendo.vn là nền tảng mua sắm đa ngành được tối ưu trên điện thoại và máy tính, nhằm giúp bạn đặt nhanh, so sánh dễ và hiểu rõ chính sách sau bán.</p><h2>Cam kết dịch vụ</h2><p>Chúng tôi ưu tiên hiển thị thật giá và tồn, hỗ trợ và chính sách phân quyền rõ trong trang cửa hàng.</p>",
      seoTitle: "Giới thiệu Zendo.vn",
      seoDescription: "Định hướng phát triển, giá trị cốt lõi và cam kết của Zendo.vn.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Chính sách bảo mật",
      slug: "chinh-sach-bao-mat",
      content:
        "<p>Chúng tôi thu thập tối thiểu dữ liệu cần cho xử lý đơn, giao nhận và hỗ trợ khách. Dữ liệu chỉ chia sẻ với nhà vận chuyển/chủ thể được bạn đồng ý khi mua hoặc theo luật.</p><p>Vui lòng bổ sung chính sách cookie và quyền xóa dữ liệu nếu cần đáp ứng quy định hiện hành.</p>",
      seoTitle: "Chính sách bảo mật | Zendo.vn",
      seoDescription: "Cách Zendo.vn xử lý và bảo vệ thông tin người dùng.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Điều khoản sử dụng",
      slug: "dieu-khoan-su-dung",
      content:
        "<p>Bằng việc sử dụng website và đặt hàng, người dùng đồng ý tuân thủ luật pháp Việt Nam và các điều kiện công bố tại các trang nội dung liên quan (giao hàng, đổi trả, bảo mật).</p>",
      seoTitle: "Điều khoản sử dụng | Zendo.vn",
      seoDescription: "Quy định và điều kiện sử dụng dịch vụ của Zendo.vn.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Liên hệ",
      slug: "lien-he",
      content:
        "<p>Đội hỗ trợ của Zendo.vn sẵn sàng giải đáp thắc mắc về đơn hàng và chính sách.</p><ul><li>Hotline: 1900 6868</li><li>Email: support@zendo.vn</li><li>Cập nhật địa chỉ văn phòng và giờ làm việc trực tiếp trong mục này trong quản trị.</li></ul>",
      seoTitle: "Liên hệ Zendo.vn",
      seoDescription: "Liên hệ đội ngũ hỗ trợ Zendo.vn.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
    {
      title: "Chính sách bảo hành",
      slug: "chinh-sach-bao-hanh",
      content:
        "<p>Bảo hành áp dụng khác nhau theo chủng loại và thương hiệu. Khi có lỗi thuộc phạm vi bảo hành, khách được hướng dẫn gửi yêu cầu và mã đơn hàng để được xử lý.</p>",
      seoTitle: "Chính sách bảo hành | Zendo.vn",
      seoDescription: "Điều kiện bảo hành và hỗ trợ sau mua.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      authorId: admin.id,
    },
  ];

  for (const page of pagesSeed) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: page,
      create: page,
    });
  }

  await prisma.page.deleteMany({
    where: { slug: "chinh-sach-van-chuyen" },
  });

  const websiteSettings = {
    logo: mediaUrl("images/logo/zendo-logo.svg"),
    hotline: "1900 6868",
    email: "support@zendo.vn",
    footer: {
      company: "Công ty Cổ phần Thương mại Zendo",
      address: "01 Nguyễn Văn Linh, Quận 7, TP.HCM",
      copyright: `© ${new Date().getFullYear()} Zendo.vn. All rights reserved.`,
    },
    seoDefault: {
      siteName: "Zendo.vn",
      title: "Zendo - Nền tảng mua sắm đa ngành",
      description: "Nền tảng thương mại điện tử đa ngành, giao hàng nhanh, giá tốt mỗi ngày.",
      keywords: ["zendo", "thương mại điện tử", "mua sắm online", "giá tốt"],
      ogImage: "",
    },
    affiliateEnabled: false,
    commissionRate: 5,
    payoutThreshold: 100000,
    cookieDuration: 30,
    attributionRule: "last_click",
    rewardPointEnabled: false,
    withdrawalEnabled: false,
    ctvGuideContent:
      "Chuong trinh CTV Zendo.vn cho phep gioi thieu don hang va nhan hoa hong theo quy dinh. Vui long doc ky dieu kien thanh toan, thoi gian doi soat va quy tac ghi nhan don.",
    // Backward-compatible keys
    affiliateCommissionRate: 5,
    affiliatePayoutThreshold: 100000,
    affiliateCookieDurationDays: 30,
    affiliateAttributionRule: "last_click",
    affiliateRewardPointsEnabled: false,
  };

  const themeSettings = {
    primaryColor: "#0F766E",
    secondaryColor: "#F97316",
    homeBanner: {
      desktop: "",
      mobile: "",
    },
    toggleSections: {
      showFeaturedProducts: true,
      showBestSellerProducts: true,
      showNewProducts: true,
      showBlogSection: true,
      showBrandStrip: true,
      showTestimonials: false,
    },
  };

  const socialLinks = [
    { platform: "facebook", label: "Facebook", url: "https://facebook.com/zendo.vn", icon: "facebook" },
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/zendo.vn", icon: "instagram" },
    { platform: "tiktok", label: "TikTok", url: "https://tiktok.com/@zendo.vn", icon: "music2" },
    { platform: "youtube", label: "YouTube", url: "https://youtube.com/@zendo.vn", icon: "youtube" },
    { platform: "zalo", label: "Zalo", url: "https://zalo.me/zendo", icon: "message-circle" },
  ];

  await prisma.setting.upsert({
    where: { key: "website_settings" },
    update: {
      value: websiteSettings,
      group: "website",
      description: "Cấu hình website mặc định",
      isPublic: true,
    },
    create: {
      key: "website_settings",
      value: websiteSettings,
      group: "website",
      description: "Cấu hình website mặc định",
      isPublic: true,
    },
  });

  await prisma.setting.upsert({
    where: { key: "theme_settings" },
    update: {
      value: themeSettings,
      group: "theme",
      description: "Cấu hình giao diện mặc định",
      isPublic: true,
    },
    create: {
      key: "theme_settings",
      value: themeSettings,
      group: "theme",
      description: "Cấu hình giao diện mặc định",
      isPublic: true,
    },
  });

  await prisma.setting.upsert({
    where: { key: "social_links" },
    update: {
      value: socialLinks,
      group: "website",
      description: "Danh sách mạng xã hội",
      isPublic: true,
    },
    create: {
      key: "social_links",
      value: socialLinks,
      group: "website",
      description: "Danh sách mạng xã hội",
      isPublic: true,
    },
  });

  const customerSeed = [
    {
      email: "nguyen.anh@example.com",
      phone: "0901000001",
      fullName: "Nguyen Thi Anh",
      passwordHash: await hash("Customer@123", 10),
      isGuest: false,
      marketingConsent: true,
    },
    {
      email: "tran.minh@example.com",
      phone: "0901000002",
      fullName: "Tran Quang Minh",
      passwordHash: await hash("Customer@123", 10),
      isGuest: false,
      marketingConsent: true,
    },
    {
      email: "le.ha@example.com",
      phone: "0901000003",
      fullName: "Le Thu Ha",
      passwordHash: await hash("Customer@123", 10),
      isGuest: false,
      marketingConsent: false,
    },
  ];

  for (const customer of customerSeed) {
    await prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    });
  }

  const reviewProducts = await prisma.product.findMany({
    take: 10,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const reviewCustomers = await prisma.customer.findMany({
    where: { isGuest: false },
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  for (let idx = 0; idx < reviewProducts.length; idx += 1) {
    const product = reviewProducts[idx];
    const linkedCustomer = reviewCustomers[idx % reviewCustomers.length];
    const reviewStatus: "PENDING" | "APPROVED" = idx % 3 === 0 ? "PENDING" : "APPROVED";
    await prisma.review.create({
      data: {
        productId: product.id,
        customerId: idx % 2 === 0 ? linkedCustomer?.id : null,
        guestName: idx % 2 === 0 ? null : `Guest User ${idx + 1}`,
        guestEmail: idx % 2 === 0 ? null : `guest${idx + 1}@mail.test`,
        rating: 4 + (idx % 2),
        title: `Danh gia cho ${product.name}`,
        content: "San pham dung mo ta, giao nhanh, dong goi can than.",
        isVerifiedPurchase: idx % 2 === 0,
        status: reviewStatus,
        approvedById: null,
        approvedAt: idx % 3 === 0 ? null : new Date(),
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log("Admin: 0564162222 | Password: duc120897");
}

main()
  .catch(async (error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPool.end();
  });
