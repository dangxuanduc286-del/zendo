import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import { formatVnd } from "../../../../lib/currency";
import {
  formatOrderStatus,
  formatPaymentStatus,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "../../../../lib/admin-order";
import { adminInput, adminPrimaryButton, adminSecondaryButton, adminSelect } from "../../../../lib/admin-ui";
import OrderDeleteButton from "./order-delete-button";

type SearchParamsInput =
  Promise<Record<string, string | string[] | undefined>>;
const VI_DATETIME = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function isOrderStatus(value: string): value is (typeof ORDER_STATUS_OPTIONS)[number] {
  return ORDER_STATUS_OPTIONS.includes(value as (typeof ORDER_STATUS_OPTIONS)[number]);
}

function isPaymentStatus(value: string): value is (typeof PAYMENT_STATUS_OPTIONS)[number] {
  return PAYMENT_STATUS_OPTIONS.includes(value as (typeof PAYMENT_STATUS_OPTIONS)[number]);
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Đơn hàng | Quản trị Zendo.vn",
  description: "Quan ly danh sach don hang trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/orders");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const q = firstValue(resolvedSearchParams.q).trim();
  const rawOrderStatus = firstValue(resolvedSearchParams.orderStatus).trim();
  const rawPaymentStatus = firstValue(resolvedSearchParams.paymentStatus).trim();
  const fromDate = firstValue(resolvedSearchParams.fromDate).trim();
  const toDate = firstValue(resolvedSearchParams.toDate).trim();
  const updated = firstValue(resolvedSearchParams.updated).trim();
  const orderStatus = isOrderStatus(rawOrderStatus) ? rawOrderStatus : "";
  const paymentStatus = isPaymentStatus(rawPaymentStatus) ? rawPaymentStatus : "";
  const fromAt = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const toAt = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

  const db = await getDbClient();
  const canDeleteOrders = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(session.user.role ?? "");

  let items: Array<{
    id: string;
    code: string;
    customerFullName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: Date;
  }> = [];
  let summary = {
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    paidRevenue: 0,
  };
  let loadError = "";

  if (db) {
    try {
      const rows = await db.order.findMany({
        where: {
          ...(q
            ? {
                OR: [
                  { code: { contains: q, mode: "insensitive" } },
                  { customerFullName: { contains: q, mode: "insensitive" } },
                  { customerEmail: { contains: q, mode: "insensitive" } },
                  { customerPhone: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(orderStatus ? { orderStatus } : {}),
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(fromAt || toAt
            ? {
                createdAt: {
                  ...(fromAt ? { gte: fromAt } : {}),
                  ...(toAt ? { lte: toAt } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }],
        take: 100,
        select: {
          id: true,
          code: true,
          customerFullName: true,
          customerEmail: true,
          customerPhone: true,
          totalAmount: true,
          orderStatus: true,
          paymentStatus: true,
          createdAt: true,
        },
      });

      items = rows.map((row) => ({
        id: row.id,
        code: row.code,
        customerFullName: row.customerFullName,
        customerEmail: row.customerEmail ?? "",
        customerPhone: row.customerPhone,
        totalAmount: Number(row.totalAmount),
        orderStatus: row.orderStatus,
        paymentStatus: row.paymentStatus,
        createdAt: row.createdAt,
      }));

      const [pendingOrders, processingOrders, completedOrders, paidRevenue] = await Promise.all([
        db.order.count({ where: { orderStatus: "PENDING" } }),
        db.order.count({ where: { orderStatus: "PROCESSING" } }),
        db.order.count({ where: { orderStatus: "COMPLETED" } }),
        db.order.aggregate({
          _sum: { totalAmount: true },
          where: { paymentStatus: "PAID" },
        }),
      ]);
      summary = {
        totalOrders: await db.order.count(),
        pendingOrders,
        processingOrders,
        completedOrders,
        paidRevenue: Number(paidRevenue._sum.totalAmount ?? 0),
      };
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Không thể tải danh sách đơn hàng.";
    }
  } else {
    loadError = "Hệ thống chưa cấu hình cơ sở dữ liệu.";
  }

  const updatedOrder = updated ? items.find((row) => row.id === updated) ?? null : null;

  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
          Đơn hàng
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Quản lý đơn hàng, trạng thái xử lý, thanh toán và thông tin khách.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Tổng đơn", summary.totalOrders],
            ["Chờ xác nhận", summary.pendingOrders],
            ["Đang xử lý", summary.processingOrders],
            ["Hoàn tất", summary.completedOrders],
            ["Doanh thu đã thanh toán", formatVnd(summary.paidRevenue)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-xs text-[#64748B]">{label}</p>
              <p className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form method="get" className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px_160px_160px_auto]">
          <label className="space-y-1">
            <span className="text-sm font-medium text-[#0F172A]">Tìm theo mã đơn / email / SĐT / tên khách</span>
            <input
              name="q"
              defaultValue={q}
              className={adminInput}
              placeholder="VD: ZD2026..., ten@zendo.vn, 090..., Nguyễn Văn A"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[#0F172A]">Trạng thái đơn</span>
            <select
              name="orderStatus"
              defaultValue={orderStatus}
              className={adminSelect}
            >
              <option value="">Tất cả trạng thái</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatOrderStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[#0F172A]">Trạng thái thanh toán</span>
            <select
              name="paymentStatus"
              defaultValue={paymentStatus}
              className={adminSelect}
            >
              <option value="">Tất cả thanh toán</option>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatPaymentStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-[#0F172A]">Từ ngày</span>
            <input
              type="date"
              name="fromDate"
              defaultValue={fromDate}
              className={adminInput}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-[#0F172A]">Đến ngày</span>
            <input
              type="date"
              name="toDate"
              defaultValue={toDate}
              className={adminInput}
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className={adminPrimaryButton}
            >
              Lọc
            </button>
            <Link
              href="/admin/orders"
              className={adminSecondaryButton}
            >
              Xóa lọc
            </Link>
          </div>
        </form>
      </section>

      {loadError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {loadError}
        </p>
      ) : null}

      {updated ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Đã lưu trạng thái đơn{" "}
          <span className="font-bold text-emerald-900">
            {updatedOrder?.code ?? updated}
          </span>
          {updatedOrder ? "." : " (không tìm thấy trong danh sách hiện tại)."}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Liên hệ</th>
                <th className="px-4 py-3 font-semibold">Tổng tiền</th>
                <th className="px-4 py-3 font-semibold">TT đơn</th>
                <th className="px-4 py-3 font-semibold">Thanh toán</th>
                <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  data-order-id={item.id}
                  className={`border-b border-[#E2E8F0] last:border-none ${
                    updated && item.id === updated ? "bg-emerald-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${item.id}`}
                      className="font-semibold text-[#0F172A] transition hover:text-[#1D4ED8]"
                    >
                      {item.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0F172A]">{item.customerFullName || "Khách hàng"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[#64748B]">{item.customerPhone || "-"}</p>
                    <p className="text-xs text-[#64748B]">{item.customerEmail || "-"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{formatVnd(item.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      item.orderStatus === "PENDING" ? "bg-amber-100 text-amber-700" :
                      item.orderStatus === "CONFIRMED" ? "bg-sky-100 text-sky-700" :
                      item.orderStatus === "PROCESSING" ? "bg-violet-100 text-violet-700" :
                      item.orderStatus === "SHIPPING" ? "bg-orange-100 text-orange-700" :
                      item.orderStatus === "DELIVERED" || item.orderStatus === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {formatOrderStatus(item.orderStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      item.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" :
                      item.paymentStatus === "UNPAID" || item.paymentStatus === "PENDING" ? "bg-amber-100 text-amber-700" :
                      item.paymentStatus === "FAILED" ? "bg-rose-100 text-rose-700" :
                      "bg-slate-200 text-slate-700"
                    }`}>
                      {formatPaymentStatus(item.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {VI_DATETIME.format(item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/orders/${item.id}`}
                        className="inline-flex h-8 items-center rounded-xl border border-[#E2E8F0] px-3 text-xs font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
                      >
                        Chi tiết
                      </Link>
                      {canDeleteOrders ? (
                        <OrderDeleteButton orderId={item.id} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                    Chưa có đơn hàng phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

