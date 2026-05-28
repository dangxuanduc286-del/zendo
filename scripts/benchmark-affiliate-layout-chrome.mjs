/**
 * Báo cáo tĩnh: so sánh loader layout affiliate (chrome) vs dashboard đầy đủ.
 * Chạy: node scripts/benchmark-affiliate-layout-chrome.mjs
 *
 * Đo runtime (TTFB / RSC): cần server + session; dùng DevTools Network trên
 * `/tai-khoan/affiliate/analytics` — so sánh thời gian document + kích thước RSC flight.
 */

const FULL_DASHBOARD_QUERIES = [
  "customer.findUnique (+ addresses embed)",
  "resolveCustomerAffiliateProfile (affiliateProfile.findFirst)",
  "order.count (total)",
  "order.count (processing)",
  "order.findMany (20 × items × product.images)",
  "coupon.findMany (active)",
  "coupon.findMany (used)",
  "coupon.findMany (expired)",
  "address.count",
  "affiliate metrics: click.count, order.count, commission.aggregate, rewardPointLedger.aggregate (khi ACTIVE)",
  "loyaltyTransaction.findMany (25)",
  "notification.count",
  "notification.groupBy",
  "notification.findMany (60)",
];

const CHROME_QUERIES = [
  "resolveCustomerAffiliateProfile (affiliateProfile.findFirst)",
  "notification.count",
  "notification.groupBy",
  "notification.findMany (60)",
];

const fullCount = FULL_DASHBOARD_QUERIES.length;
const chromeCount = CHROME_QUERIES.length;
const removed = fullCount - chromeCount;

/** Ước lượng payload RSC serialize (layout chỉ pass `data` vào client chrome). */
function estimatePayloadBytes() {
  const notifications = {
    unread: 3,
    groups: { order: 1, promotion: 0, system: 2, commission: 1 },
    items: Array.from({ length: 60 }, (_, i) => ({
      id: `n-${i}`,
      category: "commission",
      title: "Hoa hồng khả dụng",
      body: "Bạn có thêm hoa hồng chờ nhận trong ví CTV.",
      read: i > 2,
      createdAt: new Date().toISOString(),
      actionHref: "/tai-khoan?tab=affiliate&sub=overview",
      metadata: { kind: "commission_unlock" },
    })),
  };

  const chrome = { affiliate: { isActive: true }, notifications };
  const full = {
    displayName: "Nguyễn Văn A",
    avatarUrl: "https://cdn.example/avatar.jpg",
    contactText: "user@example.com",
    birthDate: "1990-01-01",
    gender: "male",
    badge: "CTV",
    stats: {
      totalOrders: 42,
      processingOrders: 2,
      vouchers: 5,
      rewardPoints: 1200,
      affiliateCommission: 3500000,
      addresses: 3,
    },
    addresses: Array.from({ length: 3 }, (_, i) => ({
      id: `addr-${i}`,
      receiverName: "Nguyễn Văn A",
      phone: "0900000000",
      province: "Hà Nội",
      district: "Cầu Giấy",
      ward: "Dịch Vọng",
      detail: "Số 1",
      isDefault: i === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    orders: Array.from({ length: 20 }, (_, i) => ({
      id: `ord-${i}`,
      code: `ZD-${1000 + i}`,
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      totalAmount: 500000 + i * 1000,
      createdAt: new Date().toISOString(),
      itemCount: 3,
      productNames: ["Áo thun", "Quần jean", "Giày"],
      linePreviews: [
        { productName: "Áo thun", quantity: 1, imageUrl: "https://cdn.example/p1.jpg" },
        { productName: "Quần jean", quantity: 1, imageUrl: "https://cdn.example/p2.jpg" },
      ],
    })),
    vouchers: {
      active: Array.from({ length: 10 }, (_, i) => ({
        code: `SALE${i}`,
        name: "Giảm 10%",
        description: "Mô tả voucher",
        expiresAt: new Date().toISOString(),
      })),
      used: [],
      expired: [],
    },
    notifications,
    personalized: { wishlist: [], recentlyViewed: [], recommended: [] },
    affiliate: {
      hasProfile: true,
      isActive: true,
      refCode: "CTV123",
      referralUrl: "/?ref=CTV123",
      totalClicks: 1200,
      referredOrders: 88,
    },
    loyalty: {
      points: 5000,
      memberRank: "GOLD",
      lifetimeSpent: 25000000,
      completedOrders: 40,
      transactions: Array.from({ length: 25 }, (_, i) => ({
        id: `lt-${i}`,
        points: 100,
        type: "EARN",
        description: "Tích điểm đơn hàng",
        createdAt: new Date().toISOString(),
        orderCode: `ZD-${i}`,
      })),
    },
  };

  const chromeJson = JSON.stringify(chrome);
  const fullJson = JSON.stringify(full);
  const saved = fullJson.length - chromeJson.length;
  const pct = fullJson.length > 0 ? ((saved / fullJson.length) * 100).toFixed(1) : "0";

  return {
    chromeKb: (chromeJson.length / 1024).toFixed(2),
    fullKb: (fullJson.length / 1024).toFixed(2),
    savedKb: (saved / 1024).toFixed(2),
    pct,
  };
}

const payload = estimatePayloadBytes();

console.log("=== Affiliate layout chrome benchmark (static) ===\n");
console.log("Full dashboard loader queries (~):");
FULL_DASHBOARD_QUERIES.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log(`\nTotal (full): ~${fullCount} Prisma operations\n`);

console.log("Chrome layout loader queries:");
CHROME_QUERIES.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log(`\nTotal (chrome): ${chromeCount}`);
console.log(`Removed from layout path: ~${removed} operations (~${((removed / fullCount) * 100).toFixed(0)}% fewer DB round-trips)\n`);

console.log("Estimated RSC/client props payload (representative fixture, UTF-8 JSON):");
console.log(`  Full dashboard data:  ${payload.fullKb} KB`);
console.log(`  Layout chrome only:   ${payload.chromeKb} KB`);
console.log(`  Saved at layout:      ${payload.savedKb} KB (~${payload.pct}% smaller)\n`);

console.log("Runtime verification:");
console.log("  1. npm run build && npm run start");
console.log("  2. DevTools → Network → document / RSC for /tai-khoan/affiliate/analytics");
console.log("  3. Compare TTFB + transferred size before/after (same account, same notifications count)");
