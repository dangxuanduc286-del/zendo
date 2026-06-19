import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

process.loadEnvFile?.(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured for safe seed.");
}

const prismaPool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({
  adapter: new PrismaPg(prismaPool),
});

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

const ZENDO_CHECKOUT_COUPON_ORDER = [
  "FREESHIP30",
  "SAVE5",
  "SAVE20",
  "SAVE50",
  "SAVE10",
  "SAVE80",
  "SAVE120",
  "SAVE15VIP",
  "SAVE250",
  "SAVE25VIP",
  "SAVE350VIP",
] as const;

const checkoutCoupons = [
  {
    code: "FREESHIP30",
    name: "🚚 FREESHIP30 - Được chọn nhiều nhất",
    description: "Giảm phí vận chuyển tối đa 30.000đ. Tag: Được chọn nhiều nhất",
    type: "FREE_SHIPPING" as const,
    scope: "SHIPPING" as const,
    value: 30000,
    maxDiscountAmount: 30000,
    minOrderAmount: 299000,
    usageLimit: 5000,
    usagePerCustomer: 5,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE5",
    name: "⚡ SAVE5 - Ưu đãi nhanh",
    description: "Giảm 5%, tối đa 20.000đ. Tag: Ưu đãi nhanh",
    type: "PERCENT" as const,
    scope: "ORDER" as const,
    value: 5,
    maxDiscountAmount: 20000,
    minOrderAmount: 399000,
    usageLimit: 5000,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE20",
    name: "🎁 SAVE20 - Tiết kiệm",
    description: "Giảm trực tiếp 20.000đ. Tag: Tiết kiệm",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 20000,
    maxDiscountAmount: null,
    minOrderAmount: 499000,
    usageLimit: 4000,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE50",
    name: "🎁 SAVE50 - Phổ biến",
    description: "Giảm trực tiếp 50.000đ. Tag: Phổ biến",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 50000,
    maxDiscountAmount: null,
    minOrderAmount: 999000,
    usageLimit: 3500,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE10",
    name: "⭐ SAVE10 - Được yêu thích",
    description: "Giảm 10%, tối đa 50.000đ. Tag: Được yêu thích",
    type: "PERCENT" as const,
    scope: "ORDER" as const,
    value: 10,
    maxDiscountAmount: 50000,
    minOrderAmount: 1490000,
    usageLimit: 3000,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE80",
    name: "🎁 SAVE80 - Đơn lớn",
    description: "Giảm trực tiếp 80.000đ. Tag: Đơn lớn",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 80000,
    maxDiscountAmount: null,
    minOrderAmount: 1990000,
    usageLimit: 2500,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE120",
    name: "🎁 SAVE120 - Tiết kiệm cao",
    description: "Giảm trực tiếp 120.000đ. Tag: Tiết kiệm cao",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 120000,
    maxDiscountAmount: null,
    minOrderAmount: 2990000,
    usageLimit: 2000,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE15VIP",
    name: "💎 SAVE15VIP - Khách VIP",
    description: "Giảm 15%, tối đa 120.000đ. Tag: Khách VIP",
    type: "PERCENT" as const,
    scope: "ORDER" as const,
    value: 15,
    maxDiscountAmount: 120000,
    minOrderAmount: 2990000,
    usageLimit: 1500,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE250",
    name: "🔥 SAVE250 - Giá trị cao",
    description: "Giảm trực tiếp 250.000đ. Tag: Giá trị cao",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 250000,
    maxDiscountAmount: null,
    minOrderAmount: 4990000,
    usageLimit: 1200,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE25VIP",
    name: "👑 SAVE25VIP - Ưu đãi cực lớn",
    description: "Giảm 25%, tối đa 200.000đ. Tag: Ưu đãi cực lớn",
    type: "PERCENT" as const,
    scope: "ORDER" as const,
    value: 25,
    maxDiscountAmount: 200000,
    minOrderAmount: 4990000,
    usageLimit: 1000,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
  {
    code: "SAVE350VIP",
    name: "👑 SAVE350VIP - Cao cấp",
    description: "Giảm trực tiếp 350.000đ. Tag: Cao cấp",
    type: "FIXED_AMOUNT" as const,
    scope: "ORDER" as const,
    value: 350000,
    maxDiscountAmount: null,
    minOrderAmount: 6990000,
    usageLimit: 800,
    usagePerCustomer: 2,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "ACTIVE" as const,
  },
] as const;

async function main(): Promise<void> {
  console.log("Running safe Prisma seed: non-destructive system data only.");
  console.log("Safe seed will not delete records or overwrite Admin-managed catalog/coupon/content data.");

  for (const role of rolesSeed) {
    const existingRole = await prisma.role.findUnique({
      where: { slug: role.slug },
      select: { id: true },
    });

    if (!existingRole) {
      await prisma.role.create({ data: role });
    }
  }

  for (const code of ZENDO_CHECKOUT_COUPON_ORDER) {
    await prisma.coupon.updateMany({
      where: { code },
      data: { status: "ACTIVE" },
    });
  }

  await prisma.coupon.updateMany({
    where: {
      code: { notIn: ZENDO_CHECKOUT_COUPON_ORDER as unknown as string[] },
      status: "ACTIVE" as const,
    },
    data: { status: "DRAFT" },
  });

  for (const coupon of checkoutCoupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
  }

  console.log("Safe seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Safe seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPool.end();
  });
