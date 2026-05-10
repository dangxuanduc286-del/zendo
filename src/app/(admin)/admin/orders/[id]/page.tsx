import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "../../../../../lib/auth";
import { formatVnd } from "../../../../../lib/currency";
import {
  formatOrderStatus,
  formatPaymentMethod,
  formatPaymentStatus,
} from "../../../../../lib/admin-order";
import AdminOrderStatusForm from "../../../../../components/admin/admin-order-status-form";
import { adminSecondaryButton } from "../../../../../lib/admin-ui";

type ParamsInput = Promise<{ id: string }>;

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng | Quản trị Zendo.vn",
  description: "Thông tin chi tiết đơn hàng trong khu vực quản trị Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: ParamsInput;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const orderId = resolvedParams.id;
  const db = await getDbClient();
  if (!db) {
    return (
      <main className="w-full max-w-none">
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          Hệ thống chưa cấu hình cơ sở dữ liệu.
        </p>
      </main>
    );
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      createdAt: true,
      customerFullName: true,
      customerEmail: true,
      customerPhone: true,
      shippingCountry: true,
      shippingProvinceCode: true,
      shippingCity: true,
      shippingDistrictCode: true,
      shippingDistrict: true,
      shippingWardCode: true,
      shippingWard: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingFullAddress: true,
      shippingPostalCode: true,
      subtotal: true,
      discountAmount: true,
      shippingFee: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      orderStatus: true,
      note: true,
      affiliateRefCode: true,
      updatedAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productName: true,
          productSlug: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }


  return (
    <main className="w-full max-w-none space-y-5 bg-[#F8FAFC]">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
            Chi tiết đơn hàng {order.code}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {formatOrderStatus(order.orderStatus)}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {formatPaymentStatus(order.paymentStatus)}
            </span>
            <span className="text-xs text-[#64748B]">{order.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
          </div>
        </div>
        <Link
          href="/admin/orders"
          className={adminSecondaryButton}
        >
          Quay lại danh sách
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <article className="space-y-4">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Thông tin khách hàng</h2>
            <div className="mt-3 space-y-1 text-sm text-[#64748B]">
              <p>
                <span className="text-[#64748B]">Họ tên: </span>
                {order.customerFullName}
              </p>
              <p>
                <span className="text-[#64748B]">Số điện thoại: </span>
                {order.customerPhone}
              </p>
              <p>
                <span className="text-[#64748B]">Email: </span>
                {order.customerEmail || "-"}
              </p>
              {order.note ? (
                <p>
                  <span className="text-[#64748B]">Ghi chú: </span>
                  {order.note}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Địa chỉ giao hàng</h2>
            <div className="mt-3 text-sm leading-6 text-[#64748B]">
              <p>{order.shippingLine1}</p>
              {order.shippingFullAddress ? <p>{order.shippingFullAddress}</p> : null}
              {!order.shippingFullAddress && order.shippingLine2 ? <p>{order.shippingLine2}</p> : null}
              <p>
                {order.shippingWard ? `${order.shippingWard}, ` : ""}
                {order.shippingDistrict}, {order.shippingCity}
              </p>
              {(order.shippingProvinceCode || order.shippingDistrictCode || order.shippingWardCode) ? (
                <p>
                  Mã khu vực: {order.shippingProvinceCode ?? "-"} / {order.shippingDistrictCode ?? "-"} / {order.shippingWardCode ?? "-"}
                </p>
              ) : null}
              <p>{order.shippingCountry}</p>
              {order.shippingPostalCode ? <p>Mã bưu điện: {order.shippingPostalCode}</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Danh sách sản phẩm</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Ảnh</th>
                    <th className="py-2 pr-3 font-semibold">Sản phẩm</th>
                    <th className="py-2 pr-3 font-semibold">SKU</th>
                    <th className="py-2 pr-3 font-semibold">Số lượng</th>
                    <th className="py-2 pr-3 font-semibold">Đơn giá</th>
                    <th className="py-2 text-right font-semibold">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-[#E2E8F0] last:border-none">
                      <td className="py-2 pr-3">
                        <div className="h-12 w-12 rounded-md border border-[#E2E8F0] bg-slate-100" />
                      </td>
                      <td className="py-2 pr-3">
                        {item.productSlug ? (
                          <Link
                            href={`/san-pham/${item.productSlug}`}
                            className="font-medium text-[#0F172A] hover:text-[#1D4ED8]"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#0F172A]">{item.productName}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-[#64748B]">{item.sku}</td>
                      <td className="py-2 pr-3 text-[#64748B]">{item.quantity}</td>
                      <td className="py-2 pr-3 text-[#64748B]">{formatVnd(Number(item.unitPrice))}</td>
                      <td className="py-2 text-right font-medium text-[#0F172A]">
                        {formatVnd(Number(item.totalPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </article>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Thanh toán</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Tạm tính</span>
                <span className="font-medium text-[#0F172A]">{formatVnd(Number(order.subtotal))}</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Giảm giá</span>
                <span className="font-medium text-[#0F172A]">
                  - {formatVnd(Number(order.discountAmount))}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Phí vận chuyển</span>
                <span className="font-medium text-[#0F172A]">{formatVnd(Number(order.shippingFee))}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
                <span className="font-semibold text-[#0F172A]">Tổng cộng</span>
                <span className="text-lg font-bold text-[#0F172A]">{formatVnd(Number(order.totalAmount))}</span>
              </div>
              <p className="text-[#64748B]">
                Phương thức thanh toán:{" "}
                <span className="font-medium text-[#0F172A]">{formatPaymentMethod(order.paymentMethod)}</span>
              </p>
              <p className="text-[#64748B]">
                Trạng thái thanh toán:{" "}
                <span className="font-medium text-[#0F172A]">{formatPaymentStatus(order.paymentStatus)}</span>
              </p>
              <p className="text-[#64748B]">
                Trạng thái đơn:{" "}
                <span className="font-medium text-[#0F172A]">{formatOrderStatus(order.orderStatus)}</span>
              </p>
              {order.affiliateRefCode ? (
                <p className="rounded-md bg-sky-50 px-3 py-2 text-zinc-700">
                  Mã CTV/Ref: <span className="font-semibold">{order.affiliateRefCode}</span>
                </p>
              ) : null}
            </div>
          </section>

          <AdminOrderStatusForm
            orderId={order.id}
            initialOrderStatus={order.orderStatus}
            initialPaymentStatus={order.paymentStatus}
          />

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#0F172A]">Mốc thời gian</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#64748B]">
              <li>Tạo đơn: {order.createdAt.toLocaleString("vi-VN")}</li>
              <li>Cập nhật gần nhất: {order.updatedAt.toLocaleString("vi-VN")}</li>
              <li>Trạng thái đơn hiện tại: {formatOrderStatus(order.orderStatus)}</li>
              <li>Trạng thái thanh toán hiện tại: {formatPaymentStatus(order.paymentStatus)}</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}

