"use client";

import { CtvDataEmpty, CtvDataLoading } from "./ctv/data/ctv-data-states";
import { CTV_LIST_ROW } from "./ctv/data/ctv-data-table";
import { CtvTableSkeleton } from "./ctv/data/ctv-skeleton";

type AffiliateOrderRow = {
  id: string;
  code: string;
  createdAt: string;
  orderStatus: string;
  orderStatusVi?: string;
  totalAmount: number;
  estimatedCommission: number;
  commissionStatus: string;
  commissionStatusVi?: string;
};

export default function AffiliateOrdersPanel({
  orders,
  loading,
  highlightOrderCode,
  variant = "default",
}: {
  orders: AffiliateOrderRow[];
  loading?: boolean;
  highlightOrderCode?: string;
  variant?: "default" | "ctv";
}): JSX.Element {
  const highlight = (highlightOrderCode ?? "").trim();
  const fmtMoney = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
  const isCtv = variant === "ctv";

  if (isCtv) {
    return (
      <section className="min-w-0 space-y-4" aria-labelledby="ctv-orders-heading">
        <header className="space-y-1">
          <h4 id="ctv-orders-heading" className="text-sm font-semibold text-slate-900 lg:text-base">
            Đơn phát sinh từ giới thiệu
          </h4>
          <p className="text-xs text-slate-500">
            Hiển thị mã đơn và số tiền — không bao gồm thông tin cá nhân người mua.
          </p>
        </header>
        {loading ? (
          <CtvTableSkeleton rows={5} />
        ) : orders.length ? (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-0.5" role="list">
            {orders.map((order) => {
              const highlighted = highlight && order.code === highlight;
              return (
                <li key={order.id}>
                  <article
                    className={`${CTV_LIST_ROW} ${highlighted ? "ring-2 ring-amber-200/90 bg-amber-50/50" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900" title={`#${order.code}`}>
                        #{order.code}
                      </p>
                      <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/60">
                        {order.commissionStatusVi ?? order.commissionStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      {" · "}
                      <span>{order.orderStatusVi ?? order.orderStatus}</span>
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-slate-500">Giá trị đơn</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">{fmtMoney(order.totalAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Hoa hồng</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">{fmtMoney(order.estimatedCommission)}</dd>
                      </div>
                    </dl>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <CtvDataEmpty
            title="Chưa có đơn phát sinh"
            description="Khi khách đặt hàng qua link ref, đơn sẽ hiển thị tại đây."
          />
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm sm:p-4">
      <h4 className="text-base font-semibold text-[#0F172A]">Đơn phát sinh từ giới thiệu</h4>
      <p className="mt-1 text-xs text-[#64748B]">
        Hiển thị mã đơn và số tiền — không bao gồm họ tên, SĐT, email hay địa chỉ của người mua.
      </p>
      {loading ? (
        <CtvDataLoading title="Đang tải đơn…" className="mt-3 !py-6" />
      ) : orders.length ? (
        <div className="mt-3 min-w-0 space-y-2">
          {orders.map((order) => (
            <article
              key={order.id}
              className={`rounded-lg border p-3 min-w-0 ${
                highlight && order.code === highlight
                  ? "border-amber-400 bg-[#FFFDF8] ring-2 ring-amber-200"
                  : "border-[#E2E8F0] bg-[#F8FAFC]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[#0F172A]" title={`#${order.code}`}>
                  #{order.code}
                </p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#64748B]">
                  {order.commissionStatusVi ?? order.commissionStatus}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                {" · "}
                <span>{order.orderStatusVi ?? order.orderStatus}</span>
              </p>
              <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-[#64748B]">Giá trị đơn</dt>
                  <dd className="font-semibold text-[#0F172A] tabular-nums">{fmtMoney(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-[#64748B]">Hoa hồng</dt>
                  <dd className="font-semibold text-[#0F172A] tabular-nums">{fmtMoney(order.estimatedCommission)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
          <p className="text-sm font-medium text-[#0F172A]">Bạn chưa có đơn phát sinh từ giới thiệu.</p>
        </div>
      )}
    </section>
  );
}