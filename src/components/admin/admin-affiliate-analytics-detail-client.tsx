"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import { SafeProductThumbnail } from "@/components/ui/safe-product-thumbnail";
import AdminAffiliateAnalyticsChartLazy from "./admin-affiliate-analytics-chart-lazy";
import {
  clickLabelForAnalyticsRange,
  CTV_ANALYTICS_CLICK_PERIOD_HINT,
} from "@/lib/ctv/ctv-click-display";
import {
  conversionLabelForAnalyticsRange,
  CTV_CONVERSION_FORMULA_HINT,
} from "@/lib/ctv/ctv-conversion-month-kpi";
import {
  CTV_PAID_ORDER_KPI_HINT,
  paidOrderLabelForAnalyticsRange,
} from "@/lib/ctv/ctv-order-display";
import type { RangeKey } from "@/lib/affiliate-analytics";
import { useAdminAffiliateDetail, useAdminAffiliateRealtime, type AdminRangeKey } from "./admin-affiliate-analytics-hooks";

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 2)}%`;
}

function Skeleton({ className }: { className: string }): JSX.Element {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function AdminAffiliateAnalyticsDetailClient(props: { affiliateId: string }): JSX.Element {
  const [range, setRange] = useState<AdminRangeKey>("7d");
  const detail = useAdminAffiliateDetail({ affiliateId: props.affiliateId, range, enabled: true });
  const realtime = useAdminAffiliateRealtime({ enabled: true, affiliateId: props.affiliateId });

  const profile = detail.data?.profile as { refCode: string; status: string; displayName: string | null } | undefined;
  const overview = detail.data?.overview as
    | {
        totalClicks: number;
        uniqueVisitors: number;
        orders: number;
        paidOrders: number;
        conversionRate: number;
        totalRevenue: number;
        totalCommission: number;
        EPC: number;
        RPM: number;
      }
    | undefined;
  const chart = detail.data?.chart as
    | { buckets: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number }> }
    | undefined;
  const topProducts = detail.data?.topProducts as Array<{
    productId: string;
    productName: string;
    imageUrl?: string | null;
    clicks: number;
    visitors?: number;
    paidOrders: number;
    revenue: number;
    commission: number;
    conversionRate: number;
  }>;
  const topPages = detail.data?.topPages as Array<{
    pathname: string;
    visits: number;
    paidOrders: number;
    revenue: number;
    conversionRate: number;
  }>;
  const funnel = detail.data?.funnel as Array<{ step: string; count: number; dropoff: number; conversionPct: number }>;
  const orders = detail.data?.orders as Array<{
    id: string;
    code: string;
    createdAt: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
  }>;

  const buckets = useMemo(() => chart?.buckets ?? [], [chart?.buckets]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/affiliate-analytics" className="text-xs font-semibold text-[#2563EB] hover:underline">
            ← Tổng hệ thống
          </Link>
          <h1 className="mt-1 text-xl font-extrabold text-[#0F172A] sm:text-2xl">CTV: {profile?.displayName || profile?.refCode || "…"}</h1>
          <p className="text-sm text-[#64748B]">
            Ref <span className="font-mono font-semibold text-[#0F172A]">{profile?.refCode}</span> · {profile?.status}
          </p>
        </div>
        <select
          id="admin-affiliate-analytics-detail-range"
          name="range"
          value={range}
          onChange={(e) => setRange(e.target.value as AdminRangeKey)}
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium"
          aria-label="Khoảng thời gian"
        >
          <option value="today">Hôm nay</option>
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="month">Tháng này</option>
        </select>
      </div>

      {detail.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{detail.error}</div>
      ) : null}

      <div className="sticky top-0 z-10 grid grid-cols-2 gap-2 border-b border-slate-200/80 bg-[#F8FAFC]/95 py-2 backdrop-blur sm:grid-cols-4 lg:static lg:border-0 lg:bg-transparent lg:py-0">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm" title={CTV_ANALYTICS_CLICK_PERIOD_HINT}>
          <p className="text-[10px] font-medium uppercase text-[#64748B]">
            {clickLabelForAnalyticsRange(range as RangeKey)}
          </p>
          <p className="text-lg font-bold tabular-nums">{overview?.totalClicks ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm">
          <p className="text-[10px] font-medium uppercase text-[#64748B]">Visitors</p>
          <p className="text-lg font-bold tabular-nums">{overview?.uniqueVisitors ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm" title={CTV_CONVERSION_FORMULA_HINT}>
          <p className="text-[10px] font-medium uppercase text-[#64748B]">
            {conversionLabelForAnalyticsRange(range as RangeKey)}
          </p>
          <p className="text-lg font-bold tabular-nums text-emerald-800">{overview ? fmtPct(overview.conversionRate) : "—"}</p>
        </div>
        <div
          className="rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-sm"
          title={CTV_PAID_ORDER_KPI_HINT}
        >
          <p className="text-[10px] font-medium uppercase text-[#64748B]">
            {paidOrderLabelForAnalyticsRange(range as RangeKey)}
          </p>
          <p className="text-lg font-bold tabular-nums text-emerald-800">{overview?.paidOrders ?? "—"}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">Biểu đồ</h2>
          {detail.loading ? (
            <Skeleton className="mt-3 h-56 w-full" />
          ) : (
            <AnalyticsErrorBoundary title="Biểu đồ affiliate lỗi.">
              <AdminAffiliateAnalyticsChartLazy buckets={buckets} compact />
            </AnalyticsErrorBoundary>
          )}
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">Realtime (scoped)</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-[#F8FAFC] p-2">
              <p className="text-[11px] text-[#64748B]">Click 5m</p>
              <p className="font-bold tabular-nums">{realtime.data?.realtime?.clicksLast5m ?? 0}</p>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] p-2">
              <p className="text-[11px] text-[#64748B]">Conv 5m</p>
              <p className="font-bold tabular-nums">{realtime.data?.realtime?.conversionsLast5m ?? 0}</p>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] p-2">
              <p className="text-[11px] text-[#64748B]">DT 5m</p>
              <p className="font-bold tabular-nums">{fmtVnd(realtime.data?.realtime?.revenueLast5m ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] p-2">
              <p className="text-[11px] text-[#64748B]">Doanh thu kỳ</p>
              <p className="font-bold tabular-nums">{fmtVnd(overview?.totalRevenue ?? 0)}</p>
            </div>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto text-xs">
            <p className="font-semibold text-[#64748B]">Click gần đây</p>
            {(realtime.data?.recentClicks as Array<{ id: string; pathname: string | null }> | undefined)?.map((c) => (
              <div key={c.id} className="truncate border-t border-[#E2E8F0] py-1">
                {c.pathname || "/"}
              </div>
            )) ?? null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">Top sản phẩm</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[11px] uppercase text-[#64748B]">
                <tr>
                  <th className="py-2">Sản phẩm</th>
                  <th className="py-2">Click</th>
                  <th className="py-2">Visitor</th>
                  <th className="py-2">Conv</th>
                  <th className="py-2">DT</th>
                </tr>
              </thead>
              <tbody>
                {topProducts?.slice(0, 12).map((r) => (
                  <tr key={r.productId} className="border-t border-[#E2E8F0]">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <SafeProductThumbnail
                          src={r.imageUrl}
                          alt=""
                          size={32}
                          className="h-8 w-8 shrink-0 rounded-md object-cover"
                        />
                        <span className="font-medium">{r.productName}</span>
                      </div>
                    </td>
                    <td className="py-2 tabular-nums">{r.clicks}</td>
                    <td className="py-2 tabular-nums">{r.visitors ?? "—"}</td>
                    <td className="py-2 tabular-nums text-emerald-800">{fmtPct(r.conversionRate)}</td>
                    <td className="py-2 tabular-nums">{fmtVnd(r.revenue)}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">Top landing</h2>
          <div className="mt-2 space-y-2">
            {topPages?.slice(0, 10).map((r) => (
              <div key={r.pathname} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-sm">
                <p className="font-semibold text-[#0F172A]">{r.pathname}</p>
                <p className="text-[11px] text-[#64748B]">
                  {r.visits} visits · {fmtPct(r.conversionRate)} · {fmtVnd(r.revenue)}
                </p>
              </div>
            )) ?? null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">Funnel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {funnel?.map((s) => (
            <div key={s.step} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-sm">
              <div className="flex justify-between font-medium">
                <span>{s.step}</span>
                <span className="tabular-nums">{s.count}</span>
              </div>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Conv bước: <span className="font-semibold text-emerald-700">{fmtPct(s.conversionPct)}</span>
              </p>
            </div>
          )) ?? null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">Đơn hàng (conversion history)</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[11px] uppercase text-[#64748B]">
              <tr>
                <th className="py-2">Mã</th>
                <th className="py-2">Tạo</th>
                <th className="py-2">Tổng</th>
                <th className="py-2">TT thanh toán</th>
                <th className="py-2">TT đơn</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o) => (
                <tr key={o.id} className="border-t border-[#E2E8F0]">
                  <td className="py-2 font-mono text-xs">{o.code}</td>
                  <td className="py-2 text-xs">{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="py-2 tabular-nums">{fmtVnd(o.totalAmount)}</td>
                  <td className="py-2 text-xs">{o.paymentStatus}</td>
                  <td className="py-2 text-xs">{o.orderStatus}</td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
