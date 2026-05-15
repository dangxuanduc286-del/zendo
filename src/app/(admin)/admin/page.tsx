import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getWebsiteSettings } from "../../../lib/settings";
import { getPublicMediaBaseUrl } from "../../../lib/media-url";
import { resolveMediaUrl } from "../../../lib/media";

export const metadata: Metadata = {
  title: "Bảng điều khiển quản trị | Zendo.vn",
  description: "Tổng quan khu vực quản trị Zendo.vn",
  robots: {
    index: false,
    follow: false,
  },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function formatDashboardOrderStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "PENDING") return "Chờ xử lý";
  if (normalized === "PAID") return "Đã thanh toán";
  if (normalized === "COMPLETED") return "Hoàn tất";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Đã hủy";
  if (normalized === "FAILED") return "Thất bại";
  if (normalized === "REFUNDED") return "Đã hoàn tiền";
  return "Không xác định";
}

function formatDashboardProductStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "ACTIVE") return "Đang bán";
  if (normalized === "DRAFT") return "Bản nháp";
  if (normalized === "ARCHIVED") return "Đã lưu trữ";
  if (normalized === "INACTIVE") return "Tạm dừng";
  return "Không xác định";
}

type QuickActionItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  available: boolean;
  iconPath: string;
};

type SystemStatusRow = {
  key: string;
  name: string;
  description: string;
  statusLabel: "Đang hoạt động" | "Đang tắt" | "Cần kiểm tra";
  note: string;
};

function statusBadgeClass(status: SystemStatusRow["statusLabel"]): string {
  if (status === "Đang hoạt động") {
    return "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700";
  }
  if (status === "Đang tắt") {
    return "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
  }
  return "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700";
}

export default async function AdminDashboardPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/admin/login");
  }
  if (!["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(session.user.role ?? "")) {
    redirect("/admin/login");
  }

  const websiteSettings = await getWebsiteSettings();
  const siteName = websiteSettings.siteName?.trim() || "Zendo.vn";
  const currency =
    (websiteSettings as unknown as { currency?: string }).currency?.trim().toUpperCase() || "VND";
  const timezone =
    (websiteSettings as unknown as { timezone?: string }).timezone?.trim() || "Asia/Ho_Chi_Minh";
  const analyticsEnabled =
    (websiteSettings as unknown as { analyticsEnabled?: boolean }).analyticsEnabled ??
    websiteSettings.trackingEnabled;
  const lowStockThreshold = Number(
    (websiteSettings as unknown as { lowStockThreshold?: number | string }).lowStockThreshold ?? 10,
  );
  const affiliateEnabled = Boolean(
    (websiteSettings as unknown as { affiliateEnabled?: boolean }).affiliateEnabled ?? false,
  );
  // TODO: Chuẩn hóa lowStockThreshold trong schema WebsiteSettings để bỏ cast unknown + fallback tại đây.
  // TODO: Khi schema settings chuẩn hóa currency/timezone/analyticsEnabled, bỏ cast unknown ở trên.

  const db = await getDbClient();
  const [
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalCustomers,
    totalProducts,
    lowStockProducts,
    latestOrdersRows,
    lowStockRows,
    websiteSettingMeta,
    activeBannerCount,
    totalPostCount,
    paidOrderIdsRows,
  ] = db
    ? await Promise.all([
        db.order.count(),
        db.order.count({ where: { orderStatus: "PENDING" } }),
        db.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            OR: [
              { paymentStatus: "PAID" },
              // TODO: Nếu nghiệp vụ đổi sang orderStatus COMPLETED là tiêu chí chuẩn, cập nhật điều kiện này.
              { orderStatus: "COMPLETED" },
            ],
          },
        }),
        // TODO: Hiện tại hệ thống chưa có model User role khách hàng, dùng Customer làm nguồn dữ liệu thật.
        db.customer.count({ where: { isGuest: false } }),
        db.product.count(),
        db.product.count({
          where: {
            stockQuantity: { lte: lowStockThreshold },
            status: "ACTIVE",
          },
        }),
        db.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            code: true,
            customerFullName: true,
            totalAmount: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
          },
        }),
        db.product.findMany({
          where: {
            status: "ACTIVE",
            stockQuantity: { lte: lowStockThreshold },
          },
          orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
          take: 8,
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            status: true,
          },
        }),
        db.setting.findUnique({
          where: { key: "website_settings" },
          select: { updatedAt: true, value: true },
        }),
        db.banner.count({ where: { status: "ACTIVE" } }),
        db.post.count(),
        db.order.findMany({
          where: {
            OR: [
              { paymentStatus: "PAID" },
              // TODO: Nếu sau này chuẩn nghiệp vụ thay đổi trạng thái thanh toán, cập nhật điều kiện doanh thu tại đây.
              { orderStatus: "COMPLETED" },
            ],
          },
          select: { id: true },
          take: 5000,
        }),
      ])
    : [0, 0, { _sum: { totalAmount: 0 } }, 0, 0, 0, [], [], null, null, null, []];
  const paidRevenue = Number(totalRevenue._sum.totalAmount ?? 0);
  const revenueText = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(paidRevenue);
  const latestOrders = latestOrdersRows.map((row) => {
    const finalStatus = row.paymentStatus === "PAID" ? "PAID" : row.orderStatus;
    return {
      id: row.id,
      code: row.code,
      customerName: row.customerFullName?.trim() || "Khách lẻ",
      totalText: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency || "VND",
        maximumFractionDigits: 0,
      }).format(Number(row.totalAmount ?? 0)),
      statusLabel: formatDashboardOrderStatus(finalStatus),
      createdAtText: row.createdAt.toLocaleString("vi-VN", { timeZone: timezone }),
    };
  });
  const lowStockItems = lowStockRows.map((row) => {
    const stock = Number(row.stockQuantity ?? 0);
    const badge = stock <= 3 ? "Cần nhập hàng" : "Sắp hết";
    return {
      id: row.id,
      name: row.name,
      sku: row.sku || "Chưa có SKU",
      stock,
      statusLabel: formatDashboardProductStatus(row.status),
      badge,
    };
  });
  const quickActions: QuickActionItem[] = [
    {
      key: "add-product",
      title: "Thêm sản phẩm",
      description: "Tạo sản phẩm mới nhanh",
      href: "/admin/products/new",
      available: true,
      iconPath: "M4 6h16M4 12h16M4 18h8",
    },
    {
      key: "add-category",
      title: "Thêm danh mục",
      description: "Quản lý nhóm sản phẩm",
      href: "/admin/categories/new",
      available: true,
      iconPath: "M4 6h7v5H4zM13 6h7v5h-7zM4 13h7v5H4zM13 13h7v5h-7z",
    },
    {
      key: "create-banner",
      title: "Tạo banner",
      description: "Thiết lập banner nổi bật",
      href: "/admin/banners/new",
      available: true,
      iconPath: "M4 6h16v12H4zM4 10h16",
    },
    {
      key: "view-orders",
      title: "Xem đơn hàng",
      description: "Theo dõi đơn mới phát sinh",
      href: "/admin/orders",
      available: true,
      iconPath: "M5 5h14v14H5zM8 9h8M8 13h8",
    },
    {
      key: "view-accounts",
      title: "Xem tài khoản",
      description: "Quản trị tài khoản hệ thống",
      href: "/admin/admins",
      available: true,
      iconPath: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0",
    },
    {
      key: "site-settings",
      title: "Cài đặt website",
      description: "Cập nhật giao diện và cấu hình",
      href: "/admin/settings",
      available: true,
      iconPath: "M12 8a4 4 0 100 8 4 4 0 000-8zm-8 4h3m10 0h3M12 4v3m0 10v3",
    },
    {
      key: "analytics",
      title: "Xem thống kê truy cập",
      description: "Theo dõi traffic và chuyển đổi",
      href: "/admin/analytics",
      available: true,
      iconPath: "M4 19h16M7 16V9m5 7V5m5 11v-6",
    },
    {
      key: "affiliates",
      title: "Quản lý cộng tác viên",
      description: "Theo dõi CTV và hoa hồng",
      href: "/admin/collaborators",
      available: true,
      iconPath: "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0m2 0a6 6 0 016 0",
    },
  ];
  const paidOrderIds = paidOrderIdsRows.map((row) => row.id);
  const topOrderItemsRows =
    db && paidOrderIds.length
      ? await db.orderItem.findMany({
          where: {
            orderId: { in: paidOrderIds },
          },
          select: {
            productId: true,
            productName: true,
            quantity: true,
            totalPrice: true,
          },
          take: 5000,
        })
      : [];
  const topByProduct = new Map<
    string,
    {
      productId: string | null;
      productName: string;
      quantitySold: number;
      revenue: number;
    }
  >();
  for (const item of topOrderItemsRows) {
    const key = item.productId ?? item.productName;
    const current = topByProduct.get(key) ?? {
      productId: item.productId,
      productName: item.productName,
      quantitySold: 0,
      revenue: 0,
    };
    current.quantitySold += Number(item.quantity ?? 0);
    current.revenue += Number(item.totalPrice ?? 0);
    topByProduct.set(key, current);
  }
  const topSorted = [...topByProduct.values()]
    .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
    .slice(0, 8);
  const topProductIds = topSorted.map((row) => row.productId).filter((id): id is string => Boolean(id));
  const topProductDetailRows =
    db && topProductIds.length
      ? await db.product.findMany({
          where: { id: { in: topProductIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            images: {
              select: { url: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
          },
        })
      : [];
  const topDetailMap = new Map(
    topProductDetailRows.map((row) => [row.id, row]),
  );
  const topSellingProducts = topSorted.map((row) => {
    const detail = row.productId ? topDetailMap.get(row.productId) : null;
    return {
      productId: row.productId ?? "",
      name: detail?.name || row.productName || "Sản phẩm không xác định",
      sku: detail?.sku || "Chưa có SKU",
      quantitySold: row.quantitySold,
      revenueText: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency || "VND",
        maximumFractionDigits: 0,
      }).format(row.revenue),
      stockQuantity: Number(detail?.stockQuantity ?? 0),
      imageUrl: resolveMediaUrl(detail?.images?.[0]?.url ?? ""),
      editHref: row.productId ? `/admin/products/${row.productId}` : "/admin/products",
      hasProductLink: Boolean(row.productId),
    };
  });
  const mediaBaseUrl = getPublicMediaBaseUrl();
  const isCloudflareMediaReady = /^https:\/\/.+/i.test(mediaBaseUrl);
  const websiteConfigured =
    Boolean(websiteSettingMeta) && Boolean(websiteSettings.siteName.trim()) && Boolean(websiteSettings.siteUrl.trim());
  const websiteUpdatedAtText = websiteSettingMeta?.updatedAt
    ? websiteSettingMeta.updatedAt.toLocaleString("vi-VN", { timeZone: timezone })
    : "Chưa có dữ liệu";
  const systemStatusRows: SystemStatusRow[] = [
    {
      key: "website-settings",
      name: "Website settings",
      description: "Cấu hình thông tin và giao diện website",
      statusLabel: websiteConfigured ? "Đang hoạt động" : "Cần kiểm tra",
      note: websiteConfigured ? `Cập nhật lần cuối: ${websiteUpdatedAtText}` : "Thiếu cấu hình website_settings",
    },
    {
      key: "media-r2",
      name: "Media / Cloudflare R2",
      description: "Ảnh và tài nguyên media công khai",
      statusLabel: isCloudflareMediaReady ? "Đang hoạt động" : "Cần kiểm tra",
      note: isCloudflareMediaReady ? "Đã có public media base URL" : "Thiếu URL media public",
    },
    {
      key: "analytics-tracking",
      name: "Analytics / Tracking",
      description: "Theo dõi truy cập và hành vi",
      statusLabel: analyticsEnabled ? "Đang hoạt động" : "Đang tắt",
      note: analyticsEnabled ? "Đang ghi nhận dữ liệu tracking" : "Tracking đang được tắt trong settings",
    },
    {
      key: "affiliate",
      name: "Affiliate / CTV",
      description: "Mô-đun cộng tác viên và hoa hồng",
      statusLabel: affiliateEnabled ? "Đang hoạt động" : "Đang tắt",
      note: affiliateEnabled ? "Module CTV đang bật" : "Module CTV đang tắt",
    },
    {
      key: "banner-home",
      name: "Banner trang chủ",
      description: "Số lượng banner đang bật",
      statusLabel:
        typeof activeBannerCount === "number" ? (activeBannerCount > 0 ? "Đang hoạt động" : "Cần kiểm tra") : "Cần kiểm tra",
      note:
        typeof activeBannerCount === "number" ? `${activeBannerCount} banner đang hoạt động` : "Chưa có dữ liệu",
    },
    {
      key: "blog-post",
      name: "Blog / Bài viết",
      description: "Tổng số bài viết trong hệ thống",
      statusLabel: typeof totalPostCount === "number" ? "Đang hoạt động" : "Cần kiểm tra",
      note: typeof totalPostCount === "number" ? `${totalPostCount} bài viết` : "Chưa có dữ liệu",
    },
  ];
  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bảng điều khiển quản trị</h1>
        <p className="mt-2 text-sm text-slate-500">
          Xin chào {session.user.name ?? session.user.email ?? "Quản trị viên"} — {siteName}.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Tiền tệ: {currency} • Múi giờ: {timezone} • Theo dõi analytics:{" "}
          {analyticsEnabled ? "Đang bật" : "Đang tắt"}
        </p>
        {!db ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Hệ thống chưa kết nối cơ sở dữ liệu, số liệu tạm thời hiển thị mặc định.
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Đơn hàng</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalOrders}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Doanh thu đã thanh toán</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{revenueText}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Khách hàng</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalCustomers}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Sản phẩm</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{totalProducts}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Đơn chờ xử lý</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{pendingOrders}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
        <article className="flex min-h-[120px] flex-col justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6">
          <p className="text-xs text-slate-500">Sản phẩm sắp hết hàng</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{lowStockProducts}</p>
          <p className="text-xs text-slate-500">Theo dữ liệu hiện tại</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Thao tác nhanh</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {quickActions
            .filter((item) => item.available)
            .map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-900" fill="none" stroke="currentColor">
                  <path d={item.iconPath} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </Link>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Đơn mới nhất</h2>
          <Link
            href="/admin/orders"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Xem tất cả
          </Link>
        </div>

        {latestOrders.length ? (
          <>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Mã đơn</th>
                    <th className="px-3 py-2 font-semibold">Khách hàng</th>
                    <th className="px-3 py-2 font-semibold">Tổng tiền</th>
                    <th className="px-3 py-2 font-semibold">Trạng thái</th>
                    <th className="px-3 py-2 font-semibold">Thời gian tạo</th>
                    <th className="px-3 py-2 font-semibold text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {latestOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-200 last:border-none">
                      <td className="px-3 py-3 font-semibold text-slate-900">{order.code}</td>
                      <td className="px-3 py-3 text-slate-900">{order.customerName}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{order.totalText}</td>
                      <td className="px-3 py-3 text-slate-500">{order.statusLabel}</td>
                      <td className="px-3 py-3 text-slate-500">{order.createdAtText}</td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-sm font-semibold text-slate-900 transition hover:text-zinc-700"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-2 md:hidden">
              {latestOrders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{order.code}</p>
                  <p className="mt-1 text-sm text-slate-900">{order.customerName}</p>
                  <p className="text-sm font-semibold text-slate-900">{order.totalText}</p>
                  <p className="text-xs text-slate-500">Trạng thái: {order.statusLabel}</p>
                  <p className="text-xs text-slate-500">{order.createdAtText}</p>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="mt-2 inline-flex text-sm font-semibold text-slate-900"
                  >
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">
            Chưa có đơn hàng nào.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Sản phẩm sắp hết hàng</h2>
          <p className="text-xs text-slate-500">Ngưỡng cảnh báo: {lowStockThreshold}</p>
        </div>

        {lowStockItems.length ? (
          <>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Tên sản phẩm</th>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Tồn kho</th>
                    <th className="px-3 py-2 font-semibold">Trạng thái</th>
                    <th className="px-3 py-2 font-semibold">Cảnh báo</th>
                    <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((product) => (
                    <tr key={product.id} className="border-b border-slate-200 last:border-none">
                      <td className="px-3 py-3 font-medium text-slate-900">{product.name}</td>
                      <td className="px-3 py-3 text-slate-500">{product.sku}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{product.stock}</td>
                      <td className="px-3 py-3 text-slate-500">{product.statusLabel}</td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            product.stock <= 3
                              ? "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                              : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                          }
                        >
                          {product.badge}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-sm font-semibold text-slate-900 transition hover:text-zinc-700"
                        >
                          Sửa sản phẩm
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-2 md:hidden">
              {lowStockItems.map((product) => (
                <article key={product.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Tồn kho: {product.stock}</p>
                  <p className="text-xs text-slate-500">Trạng thái: {product.statusLabel}</p>
                  <span
                    className={
                      product.stock <= 3
                        ? "mt-2 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                        : "mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                    }
                  >
                    {product.badge}
                  </span>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="mt-2 inline-flex text-sm font-semibold text-slate-900"
                  >
                    Sửa sản phẩm
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">
            Không có cảnh báo.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Top sản phẩm bán chạy</h2>
          <Link
            href="/admin/products"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
        {topSellingProducts.length ? (
          <>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Sản phẩm</th>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Đã bán</th>
                    <th className="px-3 py-2 font-semibold">Doanh thu</th>
                    <th className="px-3 py-2 font-semibold">Tồn kho</th>
                    <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingProducts.map((item) => (
                    <tr key={`${item.productId}-${item.name}`} className="border-b border-slate-200 last:border-none">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-white">
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                                Không ảnh
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{item.sku}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.quantitySold}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.revenueText}</td>
                      <td className="px-3 py-3 text-slate-500">{item.stockQuantity}</td>
                      <td className="px-3 py-3 text-right">
                        <Link href={item.editHref} className="text-sm font-semibold text-slate-900 transition hover:text-zinc-700">
                          {item.hasProductLink ? "Sửa sản phẩm" : "Xem sản phẩm"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-2 md:hidden">
              {topSellingProducts.map((item) => (
                <article key={`${item.productId}-${item.name}-mobile`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-white">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                          Không ảnh
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-900">Đã bán: <span className="font-semibold">{item.quantitySold}</span></p>
                  <p className="text-sm text-slate-900">Doanh thu: <span className="font-semibold">{item.revenueText}</span></p>
                  <p className="text-xs text-slate-500">Tồn kho hiện tại: {item.stockQuantity}</p>
                  <Link href={item.editHref} className="mt-2 inline-flex text-sm font-semibold text-slate-900">
                    {item.hasProductLink ? "Sửa sản phẩm" : "Xem sản phẩm"}
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">
            Chưa có dữ liệu bán hàng để phân tích.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Trạng thái hệ thống</h2>
        <div className="mt-3 space-y-2">
          {systemStatusRows.map((row) => (
            <article
              key={row.key}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.description}</p>
                </div>
                <span className={statusBadgeClass(row.statusLabel)}>{row.statusLabel}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{row.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
