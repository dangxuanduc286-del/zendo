import {
  notifyAffiliateCommissionApproved,
  notifyAffiliateCommissionPaid,
} from "@/lib/affiliate/affiliate-referral-notifications";
import { getServerSession } from "next-auth";
import type {
  AffiliateApplicationStatus,
  AffiliateCommissionStatus,
  AffiliateWithdrawalStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RewardPointStatus,
  RewardPointType,
} from "@prisma/client";
import { authOptions } from "../auth";
import {
  DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS,
  normalizeAffiliateCommissionTabSettings,
  serializeAffiliateCommissionTabForWebsiteJson,
  type AffiliateCommissionTabSettings,
} from "../affiliate-commission-tab-settings";
import { getWebsiteSettings } from "../settings";
import { composeWebsiteDbPayload } from "../website-settings-compose";

export type { AffiliateCommissionTabSettings };

type AffiliateListStatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "LOCKED";
type AffiliateListSort =
  | "newest"
  | "most_clicks"
  | "highest_revenue"
  | "highest_commission";

export type AffiliateProfileListItem = {
  id: string;
  refCode: string;
  status: "ACTIVE" | "PAUSED" | "LOCKED";
  commissionRate: number | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  admin: { id: string; fullName: string; email: string; username: string | null } | null;
  clicks: number;
  orderCount: number;
  commissionAmount: number;
  rewardPoints: number;
  revenueAmount: number;
};

export type AffiliateSettings = {
  affiliateEnabled: boolean;
  commissionRate: number;
  payoutThreshold: number;
  cookieDuration: number;
  attributionRule: string;
  rewardPointEnabled: boolean;
  withdrawalEnabled: boolean;
  ctvGuideContent: string;
  commissionTab: AffiliateCommissionTabSettings;
};

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettings = {
  affiliateEnabled: false,
  commissionRate: 5,
  payoutThreshold: 100000,
  cookieDuration: 30,
  attributionRule: "last_click",
  rewardPointEnabled: false,
  withdrawalEnabled: false,
  /** Chuỗi rỗng: không ghi đè nội dung đã lưu; tab hướng dẫn dùng `DEFAULT_CTV_GUIDE_CONTENT_VI` khi hiển thị. */
  ctvGuideContent: "",
  commissionTab: { ...DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS },
};

/** Bản hướng dẫn mẫu (tiếng Việt có dấu) khi `ctvGuideContent` trong settings còn trống — chỉ dùng cho hiển thị, không tự ghi DB. */
export const DEFAULT_CTV_GUIDE_CONTENT_VI = `1. Cách lấy link giới thiệu

Đăng nhập tài khoản đã được gắn hồ sơ cộng tác viên (CTV) trên Zendo.vn. Trong khu vực tài khoản hoặc trang dành cho CTV (nếu storefront đã bật), bạn sẽ thấy liên kết giới thiệu cá nhân kèm mã ref. Nhấn “Sao chép liên kết” để lấy URL và bắt đầu chia sẻ.

2. Cách chia sẻ link CTV

- Chia sẻ công khai trên mạng xã hội, blog, video hoặc gửi cho người thân có nhu cầu mua hàng.
- Không gửi tin nhắn quảng cáo không được phép (spam), không giả mạo thương hiệu Zendo.vn.
- Khuyến khích mô tả trung thực sản phẩm và ưu đãi đang áp dụng trên website.

3. Cách tính hoa hồng

Hoa hồng thường được tính theo tỷ lệ phần trăm trên giá trị đơn hàng hợp lệ sau khi đơn được xác nhận theo quy tắc chương trình (ví dụ: sau khi thanh toán thành công và đơn không thuộc trường hợp loại trừ). Tỷ lệ cụ thể do Zendo.vn cấu hình và có thể khác nhau theo từng CTV hoặc chiến dịch — xem phần cài đặt / thông báo nội bộ để biết mức áp dụng cho tài khoản của bạn.

4. Khi nào hoa hồng được duyệt

Đơn hàng phát sinh từ liên kết giới thiệu hợp lệ sẽ được ghi nhận hoa hồng ở trạng thái “chờ duyệt”. Đội vận hành duyệt hoa hồng khi đơn đạt điều kiện theo chính sách (đã thanh toán, không hủy, không vi phạm quy tắc ghi nhận). Bạn có thể theo dõi trạng thái trong khu vực dành cho CTV trên tài khoản.

5. Khi nào được thanh toán

Sau khi hoa hồng ở trạng thái “đã duyệt”, Zendo.vn sẽ thực hiện đối soát theo chu kỳ và ngưỡng thanh toán đã công bố. Khi đủ điều kiện, khoản thanh toán sẽ được chuyển theo phương thức bạn đã đăng ký (nếu chương trình rút tiền / thanh toán CTV được bật).

6. Quy định đơn hợp lệ

- Đơn phát sinh từ cookie / liên kết giới thiệu còn hiệu lực theo thời gian cookie cấu hình.
- Đơn không bị hủy, không hoàn tiền toàn phần theo chính sách loại trừ hoa hồng.
- Thông tin người mua và sản phẩm trung thực; không lạm dụng mã giảm giá hoặc gian lận ghi nhận.

7. Chính sách hủy / hoàn tiền (refund)

Nếu đơn hàng bị hủy trước khi giao hoặc được hoàn tiền theo chính sách đổi trả của Zendo.vn, hoa hồng có thể không được ghi nhận hoặc bị điều chỉnh / hủy tương ứng. Mọi thay đổi tuân theo điều khoản chương trình CTV và chính sách bán hàng hiện hành trên website.

8. Hỏi chung

- Tôi có thể đổi link giới thiệu không? Mã ref gắn với hồ sơ CTV; thay đổi nếu có sẽ do quản trị viên cấu hình.
- Tại sao đơn của tôi không có hoa hồng? Có thể do cookie hết hạn, đơn không hợp lệ, hoặc sản phẩm thuộc danh mục loại trừ — kiểm tra trạng thái đơn và liên hệ hỗ trợ nếu cần.
- Làm sao để biết chương trình CTV có đang bật? Trên website, phần hướng dẫn / khu vực CTV chỉ hiển thị khi chương trình được kích hoạt phía hệ thống.`;

export function resolveCtvGuideContentForDisplay(settings: AffiliateSettings): string {
  const raw = settings.ctvGuideContent?.trim() ?? "";
  return raw.length > 0 ? settings.ctvGuideContent : DEFAULT_CTV_GUIDE_CONTENT_VI;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeAffiliateSettings(
  raw: Record<string, unknown> | null | undefined,
): AffiliateSettings {
  const source = raw ?? {};
  return {
    affiliateEnabled: toBoolean(
      source.affiliateEnabled,
      DEFAULT_AFFILIATE_SETTINGS.affiliateEnabled,
    ),
    commissionRate: toNumber(
      source.commissionRate ?? source.affiliateCommissionRate,
      DEFAULT_AFFILIATE_SETTINGS.commissionRate,
    ),
    payoutThreshold: toNumber(
      source.payoutThreshold ?? source.affiliatePayoutThreshold,
      DEFAULT_AFFILIATE_SETTINGS.payoutThreshold,
    ),
    cookieDuration: toNumber(
      source.cookieDuration ?? source.affiliateCookieDurationDays,
      DEFAULT_AFFILIATE_SETTINGS.cookieDuration,
    ),
    attributionRule: toString(
      source.attributionRule ?? source.affiliateAttributionRule,
      DEFAULT_AFFILIATE_SETTINGS.attributionRule,
    ),
    rewardPointEnabled: toBoolean(
      source.rewardPointEnabled ?? source.affiliateRewardPointsEnabled,
      DEFAULT_AFFILIATE_SETTINGS.rewardPointEnabled,
    ),
    withdrawalEnabled: toBoolean(
      source.withdrawalEnabled,
      DEFAULT_AFFILIATE_SETTINGS.withdrawalEnabled,
    ),
    ctvGuideContent: toString(
      source.ctvGuideContent,
      DEFAULT_AFFILIATE_SETTINGS.ctvGuideContent,
    ),
    commissionTab: normalizeAffiliateCommissionTabSettings(source),
  };
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function parseCtvStatusFromNotes(notes: string | null): "ACTIVE" | "PAUSED" | "LOCKED" | "NONE" {
  const value = notes ?? "";
  if (!value.includes("[CTV]")) return "NONE";
  if (value.includes("[CTV_LOCKED]")) return "LOCKED";
  if (value.includes("[CTV_PAUSED]")) return "PAUSED";
  return "ACTIVE";
}

function parseCtvRefCodeFromNotes(notes: string | null): string | null {
  const matched = (notes ?? "").match(/\[CTV_REF:([A-Z0-9]+)\]/);
  return matched?.[1] ?? null;
}

async function syncAffiliateProfilesFromAccounts(
  db: NonNullable<Awaited<ReturnType<typeof getDbClient>>>,
): Promise<void> {
  const [customers, admins] = await Promise.all([
    db.customer.findMany({
      where: { notes: { contains: "[CTV]" } },
      select: { id: true, notes: true },
      take: 1000,
    }),
    db.admin.findMany({
      where: { role: { name: "CONTENT_MANAGER" } },
      select: { id: true },
      take: 1000,
    }),
  ]);

  for (const customer of customers) {
    const status = parseCtvStatusFromNotes(customer.notes);
    if (status === "NONE") continue;
    const refCode = parseCtvRefCodeFromNotes(customer.notes) ?? `CTV${customer.id.slice(-8).toUpperCase()}`;
    const existing = await db.affiliateProfile.findFirst({
      where: { customerId: customer.id },
      select: { id: true },
    });
    if (existing) {
      await db.affiliateProfile.update({
        where: { id: existing.id },
        data: { status, refCode },
      });
    } else {
      await db.affiliateProfile.create({
        data: {
          customerId: customer.id,
          refCode,
          status,
        },
      });
    }
  }

  for (const admin of admins) {
    const existing = await db.affiliateProfile.findFirst({
      where: { adminId: admin.id },
      select: { id: true },
    });
    if (!existing) {
      await db.affiliateProfile.create({
        data: {
          adminId: admin.id,
          refCode: `ADMCTV${admin.id.slice(-6).toUpperCase()}`,
          status: "ACTIVE",
        },
      });
    }
  }
}

async function assertAdminAccess(): Promise<void> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "";
  const isAllowed = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role);
  if (!session?.user?.id || !isAllowed) {
    throw new Error("Unauthorized");
  }
}

export async function getAffiliateSettings(): Promise<AffiliateSettings> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) return DEFAULT_AFFILIATE_SETTINGS;
  const row = await db.setting.findUnique({
    where: { key: "website_settings" },
    select: { value: true },
  });
  const raw =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? (row.value as Record<string, unknown>)
      : null;
  return normalizeAffiliateSettings(raw);
}

export async function getAffiliateOverview(): Promise<{
  totalProfiles: number;
  activeProfiles: number;
  totalClicks: number;
  totalOrders: number;
  pendingCommissions: number;
  approvedCommissions: number;
  paidCommissions: number;
  ctvRevenue: number;
  trackedRewardPoints: number;
  conversionRate: number;
}> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return {
      totalProfiles: 0,
      activeProfiles: 0,
      totalClicks: 0,
      totalOrders: 0,
      pendingCommissions: 0,
      approvedCommissions: 0,
      paidCommissions: 0,
      ctvRevenue: 0,
      trackedRewardPoints: 0,
      conversionRate: 0,
    };
  }
  const [
    totalProfiles,
    activeProfiles,
    totalClicks,
    totalOrders,
    pendingCommissions,
    approvedCommissions,
    paidCommissions,
    rewardSum,
    revenueSum,
  ] =
    await Promise.all([
      db.affiliateProfile.count(),
      db.affiliateProfile.count({ where: { status: "ACTIVE" } }),
      db.affiliateClick.count(),
      db.order.count({ where: { affiliateProfileId: { not: null } } }),
      db.affiliateCommission.count({ where: { status: "PENDING" } }),
      db.affiliateCommission.count({ where: { status: "APPROVED" } }),
      db.affiliateCommission.count({ where: { status: "PAID" } }),
      db.rewardPointLedger.aggregate({
        _sum: { points: true },
        where: { status: { in: ["PENDING", "AVAILABLE"] } },
      }),
      db.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          OR: [{ affiliateProfileId: { not: null } }, { affiliateRefCode: { not: null } }],
        },
      }),
    ]);
  const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
  const ctvRevenue = Number(revenueSum._sum.totalAmount ?? 0);

  return {
    totalProfiles,
    activeProfiles,
    totalClicks,
    totalOrders,
    pendingCommissions,
    approvedCommissions,
    paidCommissions,
    ctvRevenue,
    trackedRewardPoints: Number(rewardSum._sum.points ?? 0),
    conversionRate,
  };
}

export async function getAffiliateProfiles(params?: {
  query?: string;
  status?: AffiliateListStatusFilter;
  sort?: AffiliateListSort;
}) {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) return [];
  await syncAffiliateProfilesFromAccounts(db);
  const query = params?.query?.trim() ?? "";
  const status = params?.status ?? "ALL";
  const sort = params?.sort ?? "newest";
  const statusFilter =
    status === "ALL" ? undefined : status;

  const rows = await db.affiliateProfile.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { refCode: { contains: query, mode: "insensitive" } },
              { customer: { fullName: { contains: query, mode: "insensitive" } } },
              { customer: { email: { contains: query, mode: "insensitive" } } },
              { customer: { phone: { contains: query, mode: "insensitive" } } },
              { admin: { fullName: { contains: query, mode: "insensitive" } } },
              { admin: { email: { contains: query, mode: "insensitive" } } },
              { admin: { username: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      status: true,
      commissionRate: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      admin: { select: { id: true, fullName: true, email: true, username: true } },
    },
  });
  if (!rows.length) return [];

  const profileIds = rows.map((row) => row.id);
  const refCodes = rows.map((row) => row.refCode);
  const [clicksByProfile, ordersByProfile, ordersByRefCode, commissionsByProfile, rewardsByProfile] =
    await Promise.all([
      db.affiliateClick.groupBy({
        by: ["affiliateProfileId"],
        where: { affiliateProfileId: { in: profileIds } },
        _count: { _all: true },
      }),
      db.order.groupBy({
        by: ["affiliateProfileId"],
        where: { affiliateProfileId: { in: profileIds } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      db.order.groupBy({
        by: ["affiliateRefCode"],
        where: { affiliateRefCode: { in: refCodes }, affiliateProfileId: null },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      db.affiliateCommission.groupBy({
        by: ["affiliateProfileId"],
        where: { affiliateProfileId: { in: profileIds } },
        _sum: { amount: true },
      }),
      db.rewardPointLedger.groupBy({
        by: ["affiliateProfileId"],
        where: { affiliateProfileId: { in: profileIds }, status: { in: ["PENDING", "AVAILABLE"] } },
        _sum: { points: true },
      }),
    ]);

  const clickMap = new Map(clicksByProfile.map((item) => [item.affiliateProfileId, item._count._all]));
  const orderMap = new Map(
    ordersByProfile.map((item) => [
      item.affiliateProfileId ?? "",
      { count: item._count._all, revenue: Number(item._sum.totalAmount ?? 0) },
    ]),
  );
  const orderRefMap = new Map(
    ordersByRefCode.map((item) => [
      item.affiliateRefCode ?? "",
      { count: item._count._all, revenue: Number(item._sum.totalAmount ?? 0) },
    ]),
  );
  const commissionMap = new Map(
    commissionsByProfile.map((item) => [item.affiliateProfileId, Number(item._sum.amount ?? 0)]),
  );
  const rewardMap = new Map(
    rewardsByProfile.map((item) => [item.affiliateProfileId, Number(item._sum.points ?? 0)]),
  );

  const enriched: AffiliateProfileListItem[] = rows.map((row) => {
    const byProfile = orderMap.get(row.id) ?? { count: 0, revenue: 0 };
    const byRef = orderRefMap.get(row.refCode) ?? { count: 0, revenue: 0 };
    return {
      ...row,
      commissionRate: row.commissionRate !== null ? Number(row.commissionRate) : null,
      clicks: clickMap.get(row.id) ?? 0,
      orderCount: byProfile.count + byRef.count,
      commissionAmount: commissionMap.get(row.id) ?? 0,
      rewardPoints: rewardMap.get(row.id) ?? 0,
      revenueAmount: byProfile.revenue + byRef.revenue,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    if (sort === "most_clicks") return b.clicks - a.clicks || b.createdAt.getTime() - a.createdAt.getTime();
    if (sort === "highest_revenue") {
      return b.revenueAmount - a.revenueAmount || b.createdAt.getTime() - a.createdAt.getTime();
    }
    if (sort === "highest_commission") {
      return b.commissionAmount - a.commissionAmount || b.createdAt.getTime() - a.createdAt.getTime();
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return sorted;
}

export async function updateAffiliateProfileStatus(
  profileId: string,
  status: "ACTIVE" | "PAUSED" | "LOCKED",
): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");
  }
  await db.affiliateProfile.update({
    where: { id: profileId },
    data: { status },
  });
}

const VN_TZ = "Asia/Ho_Chi_Minh";

export type AffiliateClickRangePreset = "all" | "today" | "7d" | "30d" | "month" | "year";
export type AffiliateClickOrderLinkFilter = "ALL" | "NO_ORDER" | "HAS_ORDER";
export type AffiliateClickSortOrder = "newest" | "oldest";

export type AffiliateClickListParams = {
  query?: string;
  orderLink?: AffiliateClickOrderLinkFilter;
  range?: AffiliateClickRangePreset;
  sort?: AffiliateClickSortOrder;
  limit?: number;
};

export type AffiliateClickKpis = {
  totalClicks: number;
  validClicks: number;
  clicksWithOrder: number;
  conversionRate: number;
};

export type AffiliateClickRow = {
  id: string;
  createdAt: Date;
  affiliateDisplayName: string;
  refCode: string;
  landingPage: string | null;
  sourceLabel: string;
  utmSource: string | null;
  utmCampaign: string | null;
  device: string | null;
  browser: string | null;
  orderAttached: boolean;
};

const EMPTY_CLICK_KPIS: AffiliateClickKpis = {
  totalClicks: 0,
  validClicks: 0,
  clicksWithOrder: 0,
  conversionRate: 0,
};

function vnCalendarYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: VN_TZ });
}

function vnStartOfYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+07:00`);
}

function vnEndOfYmd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

function createdAtRangeFilter(range: AffiliateClickRangePreset | undefined): Prisma.DateTimeFilter | undefined {
  const preset = range ?? "all";
  if (preset === "all") return undefined;
  const now = new Date();
  const todayYmd = vnCalendarYmd(now);
  if (preset === "today") {
    return { gte: vnStartOfYmd(todayYmd), lte: vnEndOfYmd(todayYmd) };
  }
  if (preset === "7d") {
    return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), lte: now };
  }
  if (preset === "30d") {
    return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), lte: now };
  }
  if (preset === "month") {
    const [y, m] = todayYmd.split("-");
    const monthStart = `${y}-${m}-01`;
    return { gte: vnStartOfYmd(monthStart), lte: vnEndOfYmd(todayYmd) };
  }
  if (preset === "year") {
    const [y] = todayYmd.split("-");
    return { gte: vnStartOfYmd(`${y}-01-01`), lte: vnEndOfYmd(todayYmd) };
  }
  return undefined;
}

/** Loại click nghi ngờ bot hoặc khu vực quản trị — dùng cho KPI "hợp lệ" (tránh substring "bot" khớp nhầm ví dụ Roboto). */
function excludedClickWhere(): Prisma.AffiliateClickWhereInput {
  const botUaFragments = [
    "Googlebot",
    "bingbot",
    "YandexBot",
    "Baiduspider",
    "DuckDuckBot",
    "SemrushBot",
    "AhrefsBot",
    "PetalBot",
    "Bytespider",
    "facebookexternalhit",
    "Slackbot",
    "HeadlessChrome",
    "lighthouse",
    "PhantomJS",
  ] as const;
  return {
    OR: [
      { landingPage: { contains: "/admin", mode: "insensitive" } },
      ...botUaFragments.map(
        (frag): Prisma.AffiliateClickWhereInput => ({
          browser: { contains: frag, mode: "insensitive" },
        }),
      ),
    ],
  };
}

function buildAffiliateClickWhere(params: AffiliateClickListParams): Prisma.AffiliateClickWhereInput {
  const q = (params.query ?? "").trim();
  const range = createdAtRangeFilter(params.range);
  const orderLink = params.orderLink ?? "ALL";
  const parts: Prisma.AffiliateClickWhereInput[] = [];
  if (range) parts.push({ createdAt: range });
  if (orderLink === "NO_ORDER") parts.push({ orderId: null });
  if (orderLink === "HAS_ORDER") parts.push({ orderId: { not: null } });
  if (q) {
    parts.push({
      OR: [
        { refCode: { contains: q, mode: "insensitive" } },
        { landingPage: { contains: q, mode: "insensitive" } },
        { utmSource: { contains: q, mode: "insensitive" } },
        { referrer: { contains: q, mode: "insensitive" } },
        { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { phone: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { username: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return parts.length ? { AND: parts } : {};
}

function mapClickSourceLabel(utmSource: string | null, referrer: string | null): string {
  const utm = (utmSource ?? "").trim();
  if (utm) return utm;
  const ref = (referrer ?? "").trim();
  if (!ref) return "—";
  try {
    const host = new URL(ref).hostname;
    return host || "—";
  } catch {
    return ref.length > 48 ? `${ref.slice(0, 45)}…` : ref;
  }
}

function mapAffiliateDisplayName(row: {
  refCode: string;
  affiliateProfile: {
    customer: { fullName: string | null } | null;
    admin: { fullName: string } | null;
  } | null;
}): string {
  const c = row.affiliateProfile?.customer;
  const a = row.affiliateProfile?.admin;
  return (c?.fullName?.trim() || a?.fullName?.trim() || row.refCode) ?? row.refCode;
}

export async function getAffiliateClicks(
  params?: AffiliateClickListParams,
): Promise<{ rows: AffiliateClickRow[]; kpis: AffiliateClickKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return { rows: [], kpis: { ...EMPTY_CLICK_KPIS } };
  }

  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const sort = params?.sort ?? "newest";
  const where = buildAffiliateClickWhere(params ?? {});

  const [totalClicks, clicksWithOrder, excludedCount] = await Promise.all([
    db.affiliateClick.count({ where }),
    db.affiliateClick.count({ where: { ...where, orderId: { not: null } } }),
    db.affiliateClick.count({ where: { AND: [where, excludedClickWhere()] } }),
  ]);

  const validClicks = Math.max(0, totalClicks - excludedCount);
  const conversionRate = totalClicks > 0 ? (clicksWithOrder / totalClicks) * 100 : 0;

  const rawRows = await db.affiliateClick.findMany({
    where,
    orderBy: [{ createdAt: sort === "oldest" ? "asc" : "desc" }],
    take: limit,
    select: {
      id: true,
      refCode: true,
      landingPage: true,
      referrer: true,
      utmSource: true,
      utmCampaign: true,
      device: true,
      browser: true,
      orderId: true,
      createdAt: true,
      affiliateProfile: {
        select: {
          customer: { select: { fullName: true } },
          admin: { select: { fullName: true } },
        },
      },
    },
  });

  const rows: AffiliateClickRow[] = rawRows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    affiliateDisplayName: mapAffiliateDisplayName(row),
    refCode: row.refCode,
    landingPage: row.landingPage,
    sourceLabel: mapClickSourceLabel(row.utmSource, row.referrer),
    utmSource: row.utmSource,
    utmCampaign: row.utmCampaign,
    device: row.device,
    browser: row.browser,
    orderAttached: row.orderId !== null,
  }));

  return {
    rows,
    kpis: {
      totalClicks,
      validClicks,
      clicksWithOrder,
      conversionRate,
    },
  };
}

export type AffiliateCtvOrderRangePreset = AffiliateClickRangePreset;
export type AffiliateCtvOrderStatusFilter =
  | "ALL"
  | "PENDING"
  | "PAID"
  | "COMPLETED"
  | "CANCELED"
  | "FAILED"
  | "REFUNDED";
export type AffiliateCtvOrderSort = "newest" | "oldest" | "highest_value";

export type AffiliateCtvOrderListParams = {
  query?: string;
  /** Lọc nhanh theo mã ref (ví dụ từ link Danh sách CTV). */
  refCode?: string;
  orderStatus?: AffiliateCtvOrderStatusFilter;
  range?: AffiliateCtvOrderRangePreset;
  sort?: AffiliateCtvOrderSort;
  limit?: number;
};

export type AffiliateCtvOrderKpis = {
  totalOrders: number;
  paidOrCompletedOrders: number;
  revenueFromCtv: number;
  expectedCommissionTotal: number;
  averageOrderValue: number;
};

export type AffiliateCtvOrderRow = {
  id: string;
  code: string;
  createdAt: Date;
  customerFullName: string;
  affiliateDisplayName: string;
  refCode: string;
  totalAmount: number;
  orderStatusLabel: string;
  paymentStatusLabel: string;
  expectedCommission: number;
};

const ORDER_STATUS_VI: Record<OrderStatus, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

const PAYMENT_STATUS_VI: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Hoàn tiền một phần",
};

const EMPTY_CTV_ORDER_KPIS: AffiliateCtvOrderKpis = {
  totalOrders: 0,
  paidOrCompletedOrders: 0,
  revenueFromCtv: 0,
  expectedCommissionTotal: 0,
  averageOrderValue: 0,
};

const affiliateAttributedOrderBase: Prisma.OrderWhereInput = {
  OR: [{ affiliateProfileId: { not: null } }, { affiliateRefCode: { not: null } }],
};

function buildAffiliateCtvOrderWhere(params: AffiliateCtvOrderListParams): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [affiliateAttributedOrderBase];
  const range = createdAtRangeFilter(params.range);
  if (range) parts.push({ createdAt: range });
  const st = params.orderStatus ?? "ALL";
  if (st === "PENDING") parts.push({ orderStatus: "PENDING" });
  if (st === "PAID") parts.push({ paymentStatus: "PAID" });
  if (st === "COMPLETED") parts.push({ orderStatus: "COMPLETED" });
  if (st === "CANCELED") parts.push({ orderStatus: "CANCELED" });
  if (st === "FAILED") parts.push({ paymentStatus: "FAILED" });
  if (st === "REFUNDED") {
    parts.push({
      OR: [{ orderStatus: "REFUNDED" }, { paymentStatus: "REFUNDED" }],
    });
  }
  const q = (params.query ?? "").trim();
  if (q) {
    parts.push({
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { customerFullName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { affiliateRefCode: { contains: q, mode: "insensitive" } },
        { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { phone: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { username: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  const refOnly = (params.refCode ?? "").trim();
  if (refOnly) {
    parts.push({
      OR: [
        { affiliateRefCode: { equals: refOnly, mode: "insensitive" } },
        { affiliateProfile: { refCode: { equals: refOnly, mode: "insensitive" } } },
      ],
    });
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
}

function paidOrCompletedRevenueWhere(where: Prisma.OrderWhereInput): Prisma.OrderWhereInput {
  return {
    AND: [
      where,
      {
        NOT: {
          OR: [
            { orderStatus: { in: ["CANCELED", "REFUNDED"] } },
            { paymentStatus: { in: ["FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] } },
          ],
        },
      },
      {
        OR: [{ orderStatus: "COMPLETED" }, { paymentStatus: "PAID" }],
      },
    ],
  };
}

function mapAffiliateDisplayNameFromOrder(row: {
  affiliateRefCode: string | null;
  affiliateProfile: {
    refCode: string;
    customer: { fullName: string | null } | null;
    admin: { fullName: string } | null;
  } | null;
  refLookupName?: string | null;
}): string {
  const c = row.affiliateProfile?.customer;
  const a = row.affiliateProfile?.admin;
  const fromProfile = c?.fullName?.trim() || a?.fullName?.trim();
  if (fromProfile) return fromProfile;
  if (row.refLookupName?.trim()) return row.refLookupName.trim();
  return row.affiliateProfile?.refCode ?? row.affiliateRefCode ?? "—";
}

function computeExpectedCommissionVnd(
  row: {
    totalAmount: Prisma.Decimal;
    affiliateCommissions: { amount: Prisma.Decimal }[];
    affiliateProfile: { commissionRate: Prisma.Decimal | null } | null;
    affiliateRefCode: string | null;
  },
  refRateByCode: Map<string, Prisma.Decimal | null | undefined>,
  defaultCommissionPercent: number,
): number {
  const existing = row.affiliateCommissions[0];
  if (existing) return Number(existing.amount);
  const total = Number(row.totalAmount);
  let pct = defaultCommissionPercent;
  if (row.affiliateProfile?.commissionRate != null) {
    pct = Number(row.affiliateProfile.commissionRate);
  } else if (row.affiliateRefCode) {
    const alt = refRateByCode.get(row.affiliateRefCode);
    if (alt != null && alt !== undefined) pct = Number(alt);
  }
  return Math.round((total * pct) / 100);
}

export async function getAffiliateOrders(
  params?: AffiliateCtvOrderListParams,
): Promise<{ rows: AffiliateCtvOrderRow[]; kpis: AffiliateCtvOrderKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return { rows: [], kpis: { ...EMPTY_CTV_ORDER_KPIS } };
  }

  const settings = await getAffiliateSettings();
  const defaultCommissionPercent = settings.commissionRate;
  const where = buildAffiliateCtvOrderWhere(params ?? {});
  const revenueWhere = paidOrCompletedRevenueWhere(where);
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const sort = params?.sort ?? "newest";
  const orderBy: Prisma.OrderOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "highest_value"
        ? [{ totalAmount: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const listSelect = {
    id: true,
    code: true,
    createdAt: true,
    customerFullName: true,
    totalAmount: true,
    orderStatus: true,
    paymentStatus: true,
    affiliateRefCode: true,
    affiliateProfile: {
      select: {
        refCode: true,
        commissionRate: true,
        customer: { select: { fullName: true } },
        admin: { select: { fullName: true } },
      },
    },
    affiliateCommissions: {
      take: 1,
      orderBy: [{ createdAt: "desc" as const }],
      select: { amount: true },
    },
  } satisfies Prisma.OrderSelect;

  const [totalOrders, paidOrCompletedOrders, revenueAgg, listRaw, aggRows] = await Promise.all([
    db.order.count({ where }),
    db.order.count({ where: paidOrCompletedRevenueWhere(where) }),
    db.order.aggregate({
      where: revenueWhere,
      _sum: { totalAmount: true },
    }),
    db.order.findMany({
      where,
      orderBy,
      take: limit,
      select: listSelect,
    }),
    db.order.findMany({
      where,
      select: {
        totalAmount: true,
        affiliateRefCode: true,
        affiliateProfile: {
          select: { commissionRate: true },
        },
        affiliateCommissions: {
          take: 1,
          orderBy: [{ createdAt: "desc" }],
          select: { amount: true },
        },
      },
    }),
  ]);

  const revenueFromCtv = Number(revenueAgg._sum.totalAmount ?? 0);
  const amountSumAll = aggRows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const averageOrderValue = totalOrders > 0 ? amountSumAll / totalOrders : 0;

  const missingRefCodes = [
    ...new Set(
      aggRows
        .filter((r) => !r.affiliateProfile && r.affiliateRefCode)
        .map((r) => r.affiliateRefCode!)
        .filter(Boolean),
    ),
  ];
  const refProfiles =
    missingRefCodes.length > 0
      ? await db.affiliateProfile.findMany({
          where: { refCode: { in: missingRefCodes } },
          select: {
            refCode: true,
            commissionRate: true,
            customer: { select: { fullName: true } },
            admin: { select: { fullName: true } },
          },
        })
      : [];
  const refLookupName = new Map<string, string>();
  const refRateByCode = new Map<string, Prisma.Decimal | null | undefined>();
  for (const p of refProfiles) {
    const name = p.customer?.fullName?.trim() || p.admin?.fullName?.trim();
    if (name) refLookupName.set(p.refCode, name);
    refRateByCode.set(p.refCode, p.commissionRate);
  }

  let expectedCommissionTotal = 0;
  for (const r of aggRows) {
    expectedCommissionTotal += computeExpectedCommissionVnd(r, refRateByCode, defaultCommissionPercent);
  }

  const rows: AffiliateCtvOrderRow[] = listRaw.map((row) => {
    const refLookup =
      !row.affiliateProfile && row.affiliateRefCode
        ? refLookupName.get(row.affiliateRefCode) ?? null
        : null;
    return {
      id: row.id,
      code: row.code,
      createdAt: row.createdAt,
      customerFullName: row.customerFullName,
      affiliateDisplayName: mapAffiliateDisplayNameFromOrder({
        affiliateRefCode: row.affiliateRefCode,
        affiliateProfile: row.affiliateProfile,
        refLookupName: refLookup,
      }),
      refCode: row.affiliateProfile?.refCode ?? row.affiliateRefCode ?? "—",
      totalAmount: Number(row.totalAmount),
      orderStatusLabel: ORDER_STATUS_VI[row.orderStatus],
      paymentStatusLabel: PAYMENT_STATUS_VI[row.paymentStatus],
      expectedCommission: computeExpectedCommissionVnd(row, refRateByCode, defaultCommissionPercent),
    };
  });

  return {
    rows,
    kpis: {
      totalOrders,
      paidOrCompletedOrders,
      revenueFromCtv,
      expectedCommissionTotal,
      averageOrderValue,
    },
  };
}

export type AffiliateCommissionListStatusFilter =
  | "ALL"
  | AffiliateCommissionStatus;

export type AffiliateCommissionListSort = "newest" | "oldest" | "highest_amount";

export type AffiliateCommissionListParams = {
  query?: string;
  commissionStatus?: AffiliateCommissionListStatusFilter;
  range?: AffiliateClickRangePreset;
  sort?: AffiliateCommissionListSort;
  limit?: number;
};

export type AffiliateCommissionKpis = {
  totalCommissionAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  cancelledAmount: number;
  orderCountWithCommission: number;
};

export type AffiliateCommissionRow = {
  id: string;
  affiliateDisplayName: string;
  refCode: string;
  orderId: string;
  orderCode: string;
  orderRevenue: number;
  commissionRatePercent: number;
  amount: number;
  status: AffiliateCommissionStatus;
  statusLabel: string;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  /** Đơn không đủ điều kiện duyệt / đánh dấu thanh toán (ẩn nút tương ứng). */
  orderBlocksApproveAndPay: boolean;
};

const COMMISSION_STATUS_VI: Record<AffiliateCommissionStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  CANCELLED: "Bị hủy",
};

const EMPTY_COMMISSION_KPIS: AffiliateCommissionKpis = {
  totalCommissionAmount: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  paidAmount: 0,
  cancelledAmount: 0,
  orderCountWithCommission: 0,
};

function buildAffiliateCommissionWhere(
  params: AffiliateCommissionListParams,
  options?: { omitStatusFilter?: boolean },
): Prisma.AffiliateCommissionWhereInput {
  const parts: Prisma.AffiliateCommissionWhereInput[] = [];
  const range = createdAtRangeFilter(params.range);
  if (range) parts.push({ createdAt: range });
  const st = params.commissionStatus ?? "ALL";
  if (!options?.omitStatusFilter && st !== "ALL") {
    parts.push({ status: st });
  }
  const q = (params.query ?? "").trim();
  if (q) {
    parts.push({
      OR: [
        { order: { code: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { phone: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { username: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return parts.length ? { AND: parts } : {};
}

function orderDisqualifiesCommissionApproveOrPay(order: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}): boolean {
  if (order.orderStatus === "CANCELED" || order.orderStatus === "REFUNDED") return true;
  return (
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "REFUNDED" ||
    order.paymentStatus === "PARTIALLY_REFUNDED"
  );
}

/** Đơn hợp lệ cho đối soát / thanh toán hoa hồng (không hủy, không hoàn, không thất bại thanh toán). */
function commissionOrderValidForReconciliationWhere(): Prisma.OrderWhereInput {
  return {
    NOT: {
      OR: [
        { orderStatus: { in: ["CANCELED", "REFUNDED"] } },
        { paymentStatus: { in: ["FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] } },
      ],
    },
  };
}

export type ReconciliationEligibilityFilter = "ALL" | "ELIGIBLE" | "NOT_ELIGIBLE";
export type ReconciliationSort = "outstanding_desc" | "newest" | "volume_desc";

export type AffiliateReconciliationListParams = {
  query?: string;
  eligibility?: ReconciliationEligibilityFilter;
  sort?: ReconciliationSort;
};

export type AffiliateReconciliationKpis = {
  totalApprovedOutstanding: number;
  totalPaid: number;
  remainingToPay: number;
  eligibleProfileCount: number;
  payoutThreshold: number;
};

export type AffiliateReconciliationRow = {
  profileId: string;
  affiliateDisplayName: string;
  refCode: string;
  approvedOutstanding: number;
  paidTotal: number;
  remainingToPay: number;
  validCommissionCount: number;
  eligibleForPayout: boolean;
  cycleNote: string;
  updatedAt: Date;
};

export const RECONCILIATION_PAY_BELOW_THRESHOLD = "BELOW_THRESHOLD";

export async function payApprovedCommissionsForProfile(
  affiliateProfileId: string,
  options?: { confirmBelowThreshold?: boolean },
): Promise<{ updatedCount: number; totalPaidOut: number }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");
  const settings = await getAffiliateSettings();
  const threshold = settings.payoutThreshold;
  const orderOk = commissionOrderValidForReconciliationWhere();

  const pending = await db.affiliateCommission.findMany({
    where: {
      affiliateProfileId,
      status: "APPROVED",
      order: orderOk,
    },
    select: { id: true, amount: true },
  });
  const pendingIds = pending.map((p) => p.id);

  if (!pending.length) {
    throw new Error("Không có hoa hồng đã duyệt chờ thanh toán cho CTV này.");
  }

  const total = pending.reduce((s, r) => s + Number(r.amount), 0);
  if (total < threshold && !options?.confirmBelowThreshold) {
    throw new Error(RECONCILIATION_PAY_BELOW_THRESHOLD);
  }

  const now = new Date();
  const result = await db.affiliateCommission.updateMany({
    where: {
      affiliateProfileId,
      status: "APPROVED",
      order: orderOk,
    },
    data: { status: "PAID", paidAt: now },
  });

  for (const id of pendingIds) {
    void notifyAffiliateCommissionPaid(id);
  }

  return { updatedCount: result.count, totalPaidOut: total };
}

export async function getAffiliateReconciliation(
  params?: AffiliateReconciliationListParams,
): Promise<{ rows: AffiliateReconciliationRow[]; kpis: AffiliateReconciliationKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  const settings = await getAffiliateSettings();
  const threshold = settings.payoutThreshold;
  const payoutNote =
    settings.attributionRule?.trim() ||
    `Ngưỡng thanh toán: ${new Intl.NumberFormat("vi-VN").format(threshold)} VND`;

  if (!db) {
    return {
      rows: [],
      kpis: {
        totalApprovedOutstanding: 0,
        totalPaid: 0,
        remainingToPay: 0,
        eligibleProfileCount: 0,
        payoutThreshold: threshold,
      },
    };
  }

  const orderOk = commissionOrderValidForReconciliationWhere();

  const [approvedGroups, paidGroups, countGroups, globalApproved, globalPaid] = await Promise.all([
    db.affiliateCommission.groupBy({
      by: ["affiliateProfileId"],
      where: { status: "APPROVED", order: orderOk },
      _sum: { amount: true },
    }),
    db.affiliateCommission.groupBy({
      by: ["affiliateProfileId"],
      where: { status: "PAID", order: orderOk },
      _sum: { amount: true },
    }),
    db.affiliateCommission.groupBy({
      by: ["affiliateProfileId"],
      where: { status: { in: ["APPROVED", "PAID"] }, order: orderOk },
      _count: { _all: true },
    }),
    db.affiliateCommission.aggregate({
      where: { status: "APPROVED", order: orderOk },
      _sum: { amount: true },
    }),
    db.affiliateCommission.aggregate({
      where: { status: "PAID", order: orderOk },
      _sum: { amount: true },
    }),
  ]);

  const approvedMap = new Map(
    approvedGroups.map((g) => [g.affiliateProfileId, Number(g._sum.amount ?? 0)]),
  );
  const paidMap = new Map(paidGroups.map((g) => [g.affiliateProfileId, Number(g._sum.amount ?? 0)]));
  const countMap = new Map(countGroups.map((g) => [g.affiliateProfileId, g._count._all]));

  const allIds = new Set<string>([...approvedMap.keys(), ...paidMap.keys()]);
  const eligibleProfileCount = [...allIds].filter((id) => {
    const ap = approvedMap.get(id) ?? 0;
    return ap >= threshold && ap > 0;
  }).length;

  const totalApprovedOutstanding = Number(globalApproved._sum.amount ?? 0);
  const totalPaid = Number(globalPaid._sum.amount ?? 0);

  if (!allIds.size) {
    return {
      rows: [],
      kpis: {
        totalApprovedOutstanding,
        totalPaid,
        remainingToPay: totalApprovedOutstanding,
        eligibleProfileCount,
        payoutThreshold: threshold,
      },
    };
  }

  const profiles = await db.affiliateProfile.findMany({
    where: { id: { in: [...allIds] } },
    select: {
      id: true,
      refCode: true,
      updatedAt: true,
      customer: { select: { fullName: true } },
      admin: { select: { fullName: true } },
    },
  });
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const q = (params?.query ?? "").trim().toLowerCase();
  let rows: AffiliateReconciliationRow[] = [...allIds]
    .map((id) => {
      const p = profileById.get(id);
      if (!p) return null;
      const approvedOutstanding = approvedMap.get(id) ?? 0;
      const paidTotal = paidMap.get(id) ?? 0;
      const validCommissionCount = countMap.get(id) ?? 0;
      const c = p.customer;
      const a = p.admin;
      const affiliateDisplayName = c?.fullName?.trim() || a?.fullName?.trim() || p.refCode;
      const eligibleForPayout = approvedOutstanding >= threshold && approvedOutstanding > 0;
      return {
        profileId: id,
        affiliateDisplayName,
        refCode: p.refCode,
        approvedOutstanding,
        paidTotal,
        remainingToPay: approvedOutstanding,
        validCommissionCount,
        eligibleForPayout,
        cycleNote: payoutNote,
        updatedAt: p.updatedAt,
      };
    })
    .filter((r): r is AffiliateReconciliationRow => r !== null)
    .filter((r) => r.approvedOutstanding > 0 || r.paidTotal > 0);

  if (q) {
    rows = rows.filter(
      (r) =>
        r.refCode.toLowerCase().includes(q) || r.affiliateDisplayName.toLowerCase().includes(q),
    );
  }

  const elig = params?.eligibility ?? "ALL";
  if (elig === "ELIGIBLE") {
    rows = rows.filter((r) => r.eligibleForPayout);
  } else if (elig === "NOT_ELIGIBLE") {
    rows = rows.filter((r) => !r.eligibleForPayout && r.approvedOutstanding > 0);
  }

  const sort = params?.sort ?? "outstanding_desc";
  rows.sort((a, b) => {
    if (sort === "newest") return b.updatedAt.getTime() - a.updatedAt.getTime();
    if (sort === "volume_desc") {
      return b.approvedOutstanding + b.paidTotal - (a.approvedOutstanding + a.paidTotal);
    }
    return b.approvedOutstanding - a.approvedOutstanding;
  });

  return {
    rows,
    kpis: {
      totalApprovedOutstanding,
      totalPaid,
      remainingToPay: totalApprovedOutstanding,
      eligibleProfileCount,
      payoutThreshold: threshold,
    },
  };
}

export type AffiliateCommissionAction = "approve" | "cancel" | "mark_paid";

export async function updateAffiliateCommissionStatus(
  commissionId: string,
  action: AffiliateCommissionAction,
): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");
  const row = await db.affiliateCommission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      status: true,
      orderId: true,
      order: { select: { id: true, orderStatus: true, paymentStatus: true } },
    },
  });
  if (!row) throw new Error("Không tìm thấy hoa hồng.");
  const badOrder = orderDisqualifiesCommissionApproveOrPay(row.order);

  if (action === "approve") {
    if (row.status !== "PENDING") {
      throw new Error("Chỉ có thể duyệt hoa hồng đang chờ duyệt.");
    }
    if (badOrder) {
      throw new Error("Không thể duyệt hoa hồng khi đơn đã hủy, hoàn tiền hoặc thanh toán thất bại.");
    }
    await db.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    void notifyAffiliateCommissionApproved(row.orderId);
    return;
  }

  if (action === "mark_paid") {
    if (row.status !== "APPROVED") {
      throw new Error("Chỉ có thể đánh dấu thanh toán sau khi hoa hồng đã được duyệt.");
    }
    if (badOrder) {
      throw new Error("Không thể thanh toán hoa hồng khi đơn đã hủy, hoàn tiền hoặc thanh toán thất bại.");
    }
    await db.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: "PAID", paidAt: new Date() },
    });
    void notifyAffiliateCommissionPaid(commissionId);
    return;
  }

  if (action === "cancel") {
    if (row.status === "PAID") {
      throw new Error("Không thể hủy hoa hồng đã thanh toán.");
    }
    if (row.status !== "PENDING" && row.status !== "APPROVED") {
      throw new Error("Chỉ có thể hủy hoa hồng đang chờ duyệt hoặc đã duyệt.");
    }
    await db.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: "CANCELLED" },
    });
    return;
  }

  throw new Error("Thao tác không hợp lệ.");
}

export type AffiliateWithdrawalListStatusFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED";

export type AffiliateWithdrawalListSort = "newest" | "oldest" | "highest_amount";

export type AffiliateWithdrawalListParams = {
  query?: string;
  status?: AffiliateWithdrawalListStatusFilter;
  sort?: AffiliateWithdrawalListSort;
  limit?: number;
};

export type AffiliateWithdrawalKpis = {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  pendingAmountTotal: number;
};

export type AffiliateWithdrawalRow = {
  id: string;
  affiliateDisplayName: string;
  refCode: string;
  amount: number;
  availableAmount: number | null;
  paymentMethod: string;
  paymentInfoPreview: string;
  status: AffiliateWithdrawalStatus;
  createdAt: Date;
  adminNote: string | null;
};

const EMPTY_WITHDRAWAL_KPIS: AffiliateWithdrawalKpis = {
  totalRequests: 0,
  pendingCount: 0,
  approvedCount: 0,
  paidCount: 0,
  rejectedCount: 0,
  pendingAmountTotal: 0,
};

function truncateWithdrawalPaymentPreview(raw: string, maxLen = 40): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "—";
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

function buildAffiliateWithdrawalSearchWhere(
  query: string,
): Prisma.AffiliateWithdrawalRequestWhereInput {
  const q = query.trim();
  if (!q) return {};
  return {
    OR: [
      { paymentMethod: { contains: q, mode: "insensitive" } },
      { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
      { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
      { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } },
      { paymentInfo: { contains: q, mode: "insensitive" } },
    ],
  };
}

export async function getAffiliateWithdrawals(
  params?: AffiliateWithdrawalListParams,
): Promise<{ rows: AffiliateWithdrawalRow[]; kpis: AffiliateWithdrawalKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return { rows: [], kpis: { ...EMPTY_WITHDRAWAL_KPIS } };
  }

  const searchWhere = buildAffiliateWithdrawalSearchWhere(params?.query ?? "");
  const kpiWhere: Prisma.AffiliateWithdrawalRequestWhereInput = { ...searchWhere };
  const status = params?.status ?? "ALL";
  const tableWhere: Prisma.AffiliateWithdrawalRequestWhereInput = {
    ...searchWhere,
    ...(status !== "ALL" ? { status } : {}),
  };

  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const sort = params?.sort ?? "newest";
  const orderBy: Prisma.AffiliateWithdrawalRequestOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "highest_amount"
        ? [{ amount: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [
    totalRequests,
    pendingCount,
    approvedCount,
    paidCount,
    rejectedCount,
    pendingAgg,
    listRaw,
  ] = await Promise.all([
    db.affiliateWithdrawalRequest.count({ where: kpiWhere }),
    db.affiliateWithdrawalRequest.count({ where: { ...kpiWhere, status: "PENDING" } }),
    db.affiliateWithdrawalRequest.count({ where: { ...kpiWhere, status: "APPROVED" } }),
    db.affiliateWithdrawalRequest.count({ where: { ...kpiWhere, status: "PAID" } }),
    db.affiliateWithdrawalRequest.count({ where: { ...kpiWhere, status: "REJECTED" } }),
    db.affiliateWithdrawalRequest.aggregate({
      where: { ...kpiWhere, status: "PENDING" },
      _sum: { amount: true },
    }),
    db.affiliateWithdrawalRequest.findMany({
      where: tableWhere,
      orderBy,
      take: limit,
      select: {
        id: true,
        amount: true,
        availableAmount: true,
        paymentMethod: true,
        paymentInfo: true,
        status: true,
        adminNote: true,
        createdAt: true,
        affiliateProfile: {
          select: {
            refCode: true,
            customer: { select: { fullName: true } },
            admin: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const rows: AffiliateWithdrawalRow[] = listRaw.map((r) => {
    const c = r.affiliateProfile.customer;
    const a = r.affiliateProfile.admin;
    const affiliateDisplayName =
      c?.fullName?.trim() || a?.fullName?.trim() || r.affiliateProfile.refCode;
    return {
      id: r.id,
      affiliateDisplayName,
      refCode: r.affiliateProfile.refCode,
      amount: Number(r.amount),
      availableAmount: r.availableAmount != null ? Number(r.availableAmount) : null,
      paymentMethod: r.paymentMethod,
      paymentInfoPreview: truncateWithdrawalPaymentPreview(r.paymentInfo ?? ""),
      status: r.status,
      createdAt: r.createdAt,
      adminNote: r.adminNote,
    };
  });

  return {
    rows,
    kpis: {
      totalRequests,
      pendingCount,
      approvedCount,
      paidCount,
      rejectedCount,
      pendingAmountTotal: Number(pendingAgg._sum.amount ?? 0),
    },
  };
}

export type AffiliateWithdrawalAction = "approve" | "reject" | "mark_paid";

const AFFILIATE_WITHDRAWAL_ADMIN_NOTE_MAX = 4000;

export async function updateAffiliateWithdrawalStatus(
  withdrawalId: string,
  action: AffiliateWithdrawalAction,
  options?: { adminNote?: string | null },
): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");

  const row = await db.affiliateWithdrawalRequest.findUnique({
    where: { id: withdrawalId },
    select: { id: true, status: true },
  });
  if (!row) throw new Error("Không tìm thấy yêu cầu rút tiền.");

  const rawNote = options?.adminNote;
  const note =
    typeof rawNote === "string"
      ? rawNote.trim().slice(0, AFFILIATE_WITHDRAWAL_ADMIN_NOTE_MAX) || null
      : null;
  const now = new Date();

  if (action === "approve") {
    if (row.status !== "PENDING") {
      throw new Error("Chỉ có thể duyệt yêu cầu đang chờ xử lý.");
    }
    await db.affiliateWithdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: "APPROVED", approvedAt: now },
    });
    return;
  }

  if (action === "mark_paid") {
    if (row.status !== "APPROVED") {
      throw new Error("Chỉ có thể đánh dấu đã thanh toán sau khi yêu cầu đã được duyệt.");
    }
    await db.affiliateWithdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: "PAID", paidAt: now },
    });
    return;
  }

  if (action === "reject") {
    if (row.status === "PAID") {
      throw new Error("Không thể từ chối yêu cầu đã thanh toán.");
    }
    if (row.status !== "PENDING" && row.status !== "APPROVED") {
      throw new Error("Chỉ có thể từ chối yêu cầu đang chờ xử lý hoặc đã duyệt.");
    }
    await db.affiliateWithdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        rejectedAt: now,
        adminNote: note,
      },
    });
    return;
  }

  throw new Error("Thao tác không hợp lệ.");
}

export async function getAffiliateCommissions(
  params?: AffiliateCommissionListParams,
): Promise<{ rows: AffiliateCommissionRow[]; kpis: AffiliateCommissionKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return { rows: [], kpis: { ...EMPTY_COMMISSION_KPIS } };
  }

  const kpiWhere = buildAffiliateCommissionWhere(params ?? {}, { omitStatusFilter: true });
  const tableWhere = buildAffiliateCommissionWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const sort = params?.sort ?? "newest";
  const orderBy: Prisma.AffiliateCommissionOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "highest_amount"
        ? [{ amount: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [
    orderCountWithCommission,
    sumTotal,
    sumPending,
    sumApproved,
    sumPaid,
    sumCancelled,
    listRaw,
  ] = await Promise.all([
    db.affiliateCommission.count({ where: kpiWhere }),
    db.affiliateCommission.aggregate({
      where: kpiWhere,
      _sum: { amount: true },
    }),
    db.affiliateCommission.aggregate({
      where: { ...kpiWhere, status: "PENDING" },
      _sum: { amount: true },
    }),
    db.affiliateCommission.aggregate({
      where: { ...kpiWhere, status: "APPROVED" },
      _sum: { amount: true },
    }),
    db.affiliateCommission.aggregate({
      where: { ...kpiWhere, status: "PAID" },
      _sum: { amount: true },
    }),
    db.affiliateCommission.aggregate({
      where: { ...kpiWhere, status: "CANCELLED" },
      _sum: { amount: true },
    }),
    db.affiliateCommission.findMany({
      where: tableWhere,
      orderBy,
      take: limit,
      select: {
        id: true,
        orderRevenue: true,
        commissionRate: true,
        amount: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        order: {
          select: {
            id: true,
            code: true,
            orderStatus: true,
            paymentStatus: true,
          },
        },
        affiliateProfile: {
          select: {
            refCode: true,
            customer: { select: { fullName: true } },
            admin: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const rows: AffiliateCommissionRow[] = listRaw.map((row) => {
    const c = row.affiliateProfile.customer;
    const a = row.affiliateProfile.admin;
    const affiliateDisplayName =
      c?.fullName?.trim() || a?.fullName?.trim() || row.affiliateProfile.refCode;
    const orderBlocksApproveAndPay = orderDisqualifiesCommissionApproveOrPay(row.order);
    return {
      id: row.id,
      affiliateDisplayName,
      refCode: row.affiliateProfile.refCode,
      orderId: row.order.id,
      orderCode: row.order.code,
      orderRevenue: Number(row.orderRevenue),
      commissionRatePercent: Number(row.commissionRate),
      amount: Number(row.amount),
      status: row.status,
      statusLabel: COMMISSION_STATUS_VI[row.status],
      createdAt: row.createdAt,
      approvedAt: row.approvedAt,
      paidAt: row.paidAt,
      orderBlocksApproveAndPay,
    };
  });

  return {
    rows,
    kpis: {
      totalCommissionAmount: Number(sumTotal._sum.amount ?? 0),
      pendingAmount: Number(sumPending._sum.amount ?? 0),
      approvedAmount: Number(sumApproved._sum.amount ?? 0),
      paidAmount: Number(sumPaid._sum.amount ?? 0),
      cancelledAmount: Number(sumCancelled._sum.amount ?? 0),
      orderCountWithCommission,
    },
  };
}

export type RewardPointListStatusFilter = "ALL" | RewardPointStatus;
export type RewardPointListTypeFilter = "ALL" | RewardPointType;
export type RewardPointListSort = "newest" | "oldest" | "highest_points";

export type RewardPointListParams = {
  query?: string;
  status?: RewardPointListStatusFilter;
  type?: RewardPointListTypeFilter;
  range?: AffiliateClickRangePreset;
  sort?: RewardPointListSort;
  limit?: number;
};

export type RewardPointLedgerKpis = {
  /** Tổng cộng/trừ theo bản ghi (giữ dấu thực tế). */
  totalPointsIssued: number;
  availablePoints: number;
  pendingPoints: number;
  usedPoints: number;
  cancelledPoints: number;
};

export type RewardPointLedgerRow = {
  id: string;
  affiliateDisplayName: string;
  refCode: string;
  typeLabel: string;
  points: number;
  pointsDisplay: string;
  reason: string | null;
  orderId: string | null;
  orderCode: string | null;
  status: RewardPointStatus;
  statusLabel: string;
  createdAt: Date;
};

const REWARD_POINT_TYPE_VI: Record<RewardPointType, string> = {
  EARN: "Cộng điểm",
  SPEND: "Trừ điểm",
  ADJUST: "Điều chỉnh",
};

const REWARD_POINT_STATUS_VI: Record<RewardPointStatus, string> = {
  PENDING: "Đang chờ",
  AVAILABLE: "Khả dụng",
  USED: "Đã dùng",
  CANCELLED: "Đã hủy",
};

const EMPTY_REWARD_KPIS: RewardPointLedgerKpis = {
  totalPointsIssued: 0,
  availablePoints: 0,
  pendingPoints: 0,
  usedPoints: 0,
  cancelledPoints: 0,
};

export function formatRewardPointsVi(points: number): string {
  const nf = new Intl.NumberFormat("vi-VN");
  if (points > 0) return `+${nf.format(points)} điểm`;
  if (points < 0) return `-${nf.format(Math.abs(points))} điểm`;
  return `${nf.format(0)} điểm`;
}

function buildRewardPointLedgerWhere(
  params: RewardPointListParams,
  options?: { omitStatusFilter?: boolean; omitTypeFilter?: boolean },
): Prisma.RewardPointLedgerWhereInput {
  const parts: Prisma.RewardPointLedgerWhereInput[] = [];
  const range = createdAtRangeFilter(params.range);
  if (range) parts.push({ createdAt: range });
  const st = params.status ?? "ALL";
  if (!options?.omitStatusFilter && st !== "ALL") {
    parts.push({ status: st });
  }
  const tp = params.type ?? "ALL";
  if (!options?.omitTypeFilter && tp !== "ALL") {
    parts.push({ type: tp });
  }
  const q = (params.query ?? "").trim();
  if (q) {
    parts.push({
      OR: [
        { reason: { contains: q, mode: "insensitive" } },
        { order: { code: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { refCode: { contains: q, mode: "insensitive" } } },
        { affiliateProfile: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { customer: { phone: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { fullName: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { email: { contains: q, mode: "insensitive" } } } },
        { affiliateProfile: { admin: { username: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return parts.length ? { AND: parts } : {};
}

export async function getAffiliateRewardPoints(
  params?: RewardPointListParams,
): Promise<{ rows: RewardPointLedgerRow[]; kpis: RewardPointLedgerKpis }> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) {
    return { rows: [], kpis: { ...EMPTY_REWARD_KPIS } };
  }

  const kpiWhere = buildRewardPointLedgerWhere(params ?? {}, {
    omitStatusFilter: true,
    omitTypeFilter: true,
  });
  const tableWhere = buildRewardPointLedgerWhere(params ?? {});
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 500));
  const sort = params?.sort ?? "newest";
  const orderBy: Prisma.RewardPointLedgerOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "highest_points"
        ? [{ points: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [
    totalAgg,
    availableAgg,
    pendingAgg,
    usedAgg,
    cancelledAgg,
    listRaw,
  ] = await Promise.all([
    db.rewardPointLedger.aggregate({
      where: kpiWhere,
      _sum: { points: true },
    }),
    db.rewardPointLedger.aggregate({
      where: { ...kpiWhere, status: "AVAILABLE" },
      _sum: { points: true },
    }),
    db.rewardPointLedger.aggregate({
      where: { ...kpiWhere, status: "PENDING" },
      _sum: { points: true },
    }),
    db.rewardPointLedger.aggregate({
      where: { ...kpiWhere, status: "USED" },
      _sum: { points: true },
    }),
    db.rewardPointLedger.aggregate({
      where: { ...kpiWhere, status: "CANCELLED" },
      _sum: { points: true },
    }),
    db.rewardPointLedger.findMany({
      where: tableWhere,
      orderBy,
      take: limit,
      select: {
        id: true,
        points: true,
        type: true,
        status: true,
        reason: true,
        createdAt: true,
        order: { select: { id: true, code: true } },
        affiliateProfile: {
          select: {
            refCode: true,
            customer: { select: { fullName: true } },
            admin: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const rows: RewardPointLedgerRow[] = listRaw.map((row) => {
    const c = row.affiliateProfile.customer;
    const a = row.affiliateProfile.admin;
    const affiliateDisplayName =
      c?.fullName?.trim() || a?.fullName?.trim() || row.affiliateProfile.refCode;
    return {
      id: row.id,
      affiliateDisplayName,
      refCode: row.affiliateProfile.refCode,
      typeLabel: REWARD_POINT_TYPE_VI[row.type],
      points: row.points,
      pointsDisplay: formatRewardPointsVi(row.points),
      reason: row.reason,
      orderId: row.order?.id ?? null,
      orderCode: row.order?.code ?? null,
      status: row.status,
      statusLabel: REWARD_POINT_STATUS_VI[row.status],
      createdAt: row.createdAt,
    };
  });

  return {
    rows,
    kpis: {
      totalPointsIssued: Number(totalAgg._sum.points ?? 0),
      availablePoints: Number(availableAgg._sum.points ?? 0),
      pendingPoints: Number(pendingAgg._sum.points ?? 0),
      usedPoints: Number(usedAgg._sum.points ?? 0),
      cancelledPoints: Number(cancelledAgg._sum.points ?? 0),
    },
  };
}

export function toAffiliateSettingsPayload(
  current: Record<string, unknown> | null | undefined,
  normalizedSettings: AffiliateSettings,
): Prisma.InputJsonObject {
  const source = current ?? {};
  const tabJson = serializeAffiliateCommissionTabForWebsiteJson(normalizedSettings.commissionTab);
  return {
    ...source,
    ...tabJson,
    affiliateEnabled: normalizedSettings.affiliateEnabled,
    commissionRate: normalizedSettings.commissionRate,
    payoutThreshold: normalizedSettings.payoutThreshold,
    cookieDuration: normalizedSettings.cookieDuration,
    attributionRule: normalizedSettings.attributionRule,
    rewardPointEnabled: normalizedSettings.rewardPointEnabled,
    withdrawalEnabled: normalizedSettings.withdrawalEnabled,
    ctvGuideContent: normalizedSettings.ctvGuideContent,
    // Backward-compatible keys
    affiliateCommissionRate: normalizedSettings.commissionRate,
    affiliatePayoutThreshold: normalizedSettings.payoutThreshold,
    affiliateCookieDurationDays: normalizedSettings.cookieDuration,
    affiliateAttributionRule: normalizedSettings.attributionRule,
    affiliateRewardPointsEnabled: normalizedSettings.rewardPointEnabled,
  };
}

export const AFFILIATE_ATTRIBUTION_OPTIONS = [
  { value: "last_click", label: "Click cuối cùng" },
  { value: "first_click", label: "Click đầu tiên" },
  { value: "ref_priority", label: "Ưu tiên mã ref" },
] as const;

export type ParseAffiliateProgramSettingsResult =
  | { ok: true; settings: AffiliateSettings }
  | { ok: false; message: string };

export function parseAffiliateProgramSettingsForm(form: FormData): ParseAffiliateProgramSettingsResult {
  const affiliateEnabled = form.get("affiliateEnabled") === "1";

  const commissionRaw = String(form.get("commissionRate") ?? "").trim().replace(",", ".");
  const commissionRate = Math.min(100, Math.max(0, Number(commissionRaw)));
  if (!Number.isFinite(commissionRate)) {
    return { ok: false, message: "Tỷ lệ hoa hồng phải là số từ 0 đến 100 (%)." };
  }

  const payoutRaw = String(form.get("payoutThreshold") ?? "").trim().replace(/\s/g, "");
  const payoutThreshold = Number(payoutRaw);
  if (!Number.isFinite(payoutThreshold) || payoutThreshold < 0 || !Number.isInteger(payoutThreshold)) {
    return {
      ok: false,
      message: "Ngưỡng thanh toán tối thiểu phải là số nguyên không âm (VNĐ).",
    };
  }

  const cookieRaw = String(form.get("cookieDuration") ?? "").trim();
  const cookieDuration = Number(cookieRaw);
  if (!Number.isFinite(cookieDuration) || cookieDuration <= 0 || !Number.isInteger(cookieDuration)) {
    return {
      ok: false,
      message: "Thời gian cookie giới thiệu phải là số nguyên lớn hơn 0 (ngày).",
    };
  }

  const attributionRuleRaw = String(form.get("attributionRule") ?? "").trim();
  const allowedRule = AFFILIATE_ATTRIBUTION_OPTIONS.some((o) => o.value === attributionRuleRaw);
  const attributionRule = allowedRule
    ? (attributionRuleRaw as (typeof AFFILIATE_ATTRIBUTION_OPTIONS)[number]["value"])
    : "last_click";

  const rewardPointEnabled = form.get("rewardPointEnabled") === "1";
  const withdrawalEnabled = form.get("withdrawalEnabled") === "1";
  const ctvGuideContent = String(form.get("ctvGuideContent") ?? "");

  const commissionTab: AffiliateCommissionTabSettings = {
    tabEnabled: form.get("commissionTab_tabEnabled") === "1",
    showIncomeSummary: form.get("commissionTab_showIncomeSummary") === "1",
    showPendingCommission: form.get("commissionTab_showPendingCommission") === "1",
    showPaidCommission: form.get("commissionTab_showPaidCommission") === "1",
    showAffiliateOrderCount: form.get("commissionTab_showAffiliateOrderCount") === "1",
    realtimeBadgeEnabled: form.get("commissionTab_realtimeBadgeEnabled") === "1",
    soundEnabled: form.get("commissionTab_soundEnabled") === "1",
    soundMode: (() => {
      const raw = String(form.get("commissionTab_soundMode") ?? "default").trim();
      if (raw === "off" || raw === "default" || raw === "custom") return raw;
      return "default";
    })(),
    soundCustomUrl: String(form.get("commissionTab_soundCustomUrl") ?? "").trim().slice(0, 512),
    groupSimilarEnabled: form.get("commissionTab_groupSimilarEnabled") === "1",
    groupWindowSeconds: (() => {
      const raw = String(form.get("commissionTab_groupWindowSeconds") ?? "120").trim();
      const n = Number(raw);
      if (!Number.isFinite(n)) return DEFAULT_AFFILIATE_COMMISSION_TAB_SETTINGS.groupWindowSeconds;
      return Math.min(600, Math.max(30, Math.round(n)));
    })(),
    previewProductEnabled: form.get("commissionTab_previewProductEnabled") === "1",
    maskedCustomerEnabled: form.get("commissionTab_maskedCustomerEnabled") === "1",
  };

  const settings: AffiliateSettings = {
    affiliateEnabled,
    commissionRate,
    payoutThreshold,
    cookieDuration,
    attributionRule,
    rewardPointEnabled,
    withdrawalEnabled,
    ctvGuideContent,
    commissionTab,
  };

  return { ok: true, settings };
}

export type PersistAffiliateProgramMode = "save" | "restore_defaults";

/**
 * Ghi đè các trường chương trình CTV trong `website_settings`, giữ nguyên các field khác.
 * Ghi đồng thời key chuẩn và key backward-compatible (xem `toAffiliateSettingsPayload`).
 */
export async function persistAffiliateProgramSettings(
  mode: PersistAffiliateProgramMode,
  next: AffiliateSettings,
): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");

  const slice: AffiliateSettings =
    mode === "restore_defaults" ? { ...DEFAULT_AFFILIATE_SETTINGS } : next;

  const existingRow = await db.setting.findUnique({
    where: { key: "website_settings" },
    select: { value: true },
  });
  const existingFlat =
    existingRow?.value && typeof existingRow.value === "object" && !Array.isArray(existingRow.value)
      ? { ...(existingRow.value as Record<string, unknown>) }
      : {};

  const siteName = typeof existingFlat.siteName === "string" ? existingFlat.siteName.trim() : "";
  const siteUrl = typeof existingFlat.siteUrl === "string" ? existingFlat.siteUrl.trim() : "";
  if (!siteName && !siteUrl) {
    throw new Error(
      "Chưa có cấu hình website cơ bản (tên hoặc URL). Vui lòng hoàn tất cài đặt website trước khi lưu chương trình CTV.",
    );
  }

  const merged = toAffiliateSettingsPayload(existingFlat, slice) as Record<string, unknown>;
  const ws = await getWebsiteSettings();
  const composed = composeWebsiteDbPayload(merged, ws.socialLinks);
  const websiteJson = JSON.parse(JSON.stringify(composed)) as Prisma.InputJsonValue;

  await db.setting.upsert({
    where: { key: "website_settings" },
    update: {
      value: websiteJson,
      group: "website",
      description: "Website settings",
      isPublic: true,
    },
    create: {
      key: "website_settings",
      value: websiteJson,
      group: "website",
      description: "Website settings",
      isPublic: true,
    },
  });
}

export type AffiliateApplicationAdminFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

/** Lọc theo khoảng điểm hồ sơ (tab Yêu cầu CTV). */
export type AffiliateApplicationScoreTierFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW" | "UNSCORED";

export type AffiliateApplicationAdminRow = {
  id: string;
  customerId: string;
  fullName: string;
  phone: string;
  email: string | null;
  socialLink: string | null;
  note: string | null;
  trafficSource: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
  score: number | null;
  scoreReason: string | null;
  quickReviewNote: string | null;
  status: AffiliateApplicationStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const AFFILIATE_APP_QUICK_REVIEW_MAX = 6000;

/** Nối ghi chú nội bộ admin vào quickReviewNote (không ghi đè phần tự động ban đầu). */
export function appendAffiliateApplicationInternalQuickReview(
  existing: string | null | undefined,
  internalSnippet: string | null | undefined,
): string | null {
  const t = internalSnippet?.trim();
  if (!t) return existing?.trim() ? existing.trim() : null;
  const line = `\n[Ghi chú nội bộ] ${t}`;
  const base = (existing ?? "").trimEnd();
  const next = `${base}${line}`.slice(0, AFFILIATE_APP_QUICK_REVIEW_MAX).trim();
  return next || null;
}

function affiliateApplicationScoreTierWhere(
  tier: AffiliateApplicationScoreTierFilter,
): Prisma.AffiliateApplicationWhereInput {
  if (tier === "ALL") return {};
  if (tier === "UNSCORED") return { score: null };
  if (tier === "HIGH") return { AND: [{ score: { not: null } }, { score: { gte: 80, lte: 100 } }] };
  if (tier === "MEDIUM") return { AND: [{ score: { not: null } }, { score: { gte: 50, lte: 79 } }] };
  return { AND: [{ score: { not: null } }, { score: { gte: 0, lte: 49 } }] };
}

export async function getAffiliateApplicationsForAdmin(params: {
  status: AffiliateApplicationAdminFilter;
  scoreTier?: AffiliateApplicationScoreTierFilter;
}): Promise<AffiliateApplicationAdminRow[]> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) return [];
  const statusWhere =
    params.status === "ALL" ? {} : { status: params.status as AffiliateApplicationStatus };
  const tier = params.scoreTier ?? "ALL";
  const tierWhere = affiliateApplicationScoreTierWhere(tier);
  const where: Prisma.AffiliateApplicationWhereInput = { ...statusWhere, ...tierWhere };
  return db.affiliateApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      customerId: true,
      fullName: true,
      phone: true,
      email: true,
      socialLink: true,
      note: true,
      trafficSource: true,
      followerCount: true,
      sellingCategories: true,
      score: true,
      scoreReason: true,
      quickReviewNote: true,
      status: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Số đơn đăng ký CTV đang chờ duyệt (badge tab admin). */
export async function getAffiliateApplicationPendingCountForAdmin(): Promise<number> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) return 0;
  return db.affiliateApplication.count({
    where: { status: "PENDING" },
  });
}

/** Sidebar / layout: tái dùng count chuẩn; mọi lỗi (quyền, DB, schema) → 0, không crash admin. */
export async function getAffiliateApplicationPendingCountForAdminSafe(): Promise<number> {
  try {
    return await getAffiliateApplicationPendingCountForAdmin();
  } catch {
    return 0;
  }
}

async function allocateUniqueAffiliateRefCode(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<string> {
  const compact = customerId.replace(/-/g, "").toUpperCase();
  const tail = compact.slice(-10) || compact || "X";
  for (let i = 0; i < 80; i++) {
    const candidate = i === 0 ? `CTV${tail}`.slice(0, 32) : `CTV${tail}${i}`.slice(0, 32);
    const clash = await tx.affiliateProfile.findUnique({
      where: { refCode: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  const { randomBytes } = await import("node:crypto");
  return `CTV${randomBytes(5).toString("hex").toUpperCase()}`.slice(0, 32);
}

/**
 * Duyệt đơn đăng ký CTV: APPROVED + tạo/kích hoạt AffiliateProfile (ACTIVE), refCode unique.
 * Không xóa bản ghi application.
 */
export async function approveAffiliateApplicationByAdmin(params: {
  applicationId: string;
  adminNote?: string | null;
  internalQuickNote?: string | null;
}): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");

  const noteTrim = params.adminNote?.trim() ? params.adminNote.trim() : null;
  const internalTrim = params.internalQuickNote?.trim()
    ? params.internalQuickNote.trim().slice(0, 2500)
    : null;

  await db.$transaction(async (tx) => {
    const app = await tx.affiliateApplication.findUnique({
      where: { id: params.applicationId },
      select: { id: true, customerId: true, status: true, quickReviewNote: true },
    });
    if (!app) throw new Error("NOT_FOUND");
    if (app.status !== "PENDING") throw new Error("INVALID_STATUS");

    const existing = await tx.affiliateProfile.findFirst({
      where: { customerId: app.customerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, refCode: true },
    });

    if (existing) {
      await tx.affiliateProfile.update({
        where: { id: existing.id },
        data: {
          customerId: app.customerId,
          status: "ACTIVE",
          refCode: existing.refCode?.trim() ? existing.refCode : await allocateUniqueAffiliateRefCode(tx, app.customerId),
        },
      });
    } else {
      const refCode = await allocateUniqueAffiliateRefCode(tx, app.customerId);
      await tx.affiliateProfile.create({
        data: {
          customerId: app.customerId,
          refCode,
          status: "ACTIVE",
        },
      });
    }

    const updateData: Prisma.AffiliateApplicationUpdateInput = {
      status: "APPROVED",
      adminNote: noteTrim,
    };
    if (internalTrim) {
      updateData.quickReviewNote = appendAffiliateApplicationInternalQuickReview(app.quickReviewNote, internalTrim);
    }
    await tx.affiliateApplication.update({
      where: { id: app.id },
      data: updateData,
    });
  });
}

/** Từ chối đơn: REJECTED + adminNote; không tạo AffiliateProfile. */
export async function rejectAffiliateApplicationByAdmin(params: {
  applicationId: string;
  adminNote?: string | null;
  internalQuickNote?: string | null;
}): Promise<void> {
  await assertAdminAccess();
  const db = await getDbClient();
  if (!db) throw new Error("Hệ thống chưa cấu hình cơ sở dữ liệu.");

  const noteTrim = params.adminNote?.trim() ? params.adminNote.trim() : null;
  const internalTrim = params.internalQuickNote?.trim()
    ? params.internalQuickNote.trim().slice(0, 2500)
    : null;

  const app = await db.affiliateApplication.findUnique({
    where: { id: params.applicationId },
    select: { id: true, status: true, quickReviewNote: true },
  });
  if (!app) throw new Error("NOT_FOUND");
  if (app.status !== "PENDING") throw new Error("INVALID_STATUS");

  const updateData: Prisma.AffiliateApplicationUpdateInput = {
    status: "REJECTED",
    adminNote: noteTrim,
  };
  if (internalTrim) {
    updateData.quickReviewNote = appendAffiliateApplicationInternalQuickReview(app.quickReviewNote, internalTrim);
  }

  await db.affiliateApplication.update({
    where: { id: app.id },
    data: updateData,
  });
}
