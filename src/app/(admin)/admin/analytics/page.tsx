import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import VisitsLineChart from "../../../../components/admin/analytics/visits-line-chart-lazy";
import {
  getAdminAnalyticsDashboard,
  type AdminAnalyticsDashboardV2,
  type AnalyticsKpiMetricV2,
} from "../../../../lib/admin/analytics";
import { authOptions } from "../../../../lib/auth";

export const metadata: Metadata = {
  title: "Analytics bán hàng | Quản trị Zendo.vn",
  description: "Dashboard analytics bán hàng và truy cập theo thời gian thực.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParamsInput = Promise<{
  range?: string;
  from?: string;
  to?: string;
  pathname?: string;
  device?: string;
}>;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  }
}

function formatPercent(value: number | null, digits = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

function trendBadge(metric: AnalyticsKpiMetricV2): { label: string; className: string } {
  if (metric.trend === "up") return { label: "Tăng", className: "bg-emerald-50 text-emerald-700" };
  if (metric.trend === "down") return { label: "Giảm", className: "bg-rose-50 text-rose-700" };
  return { label: "Ổn định", className: "bg-slate-100 text-slate-700" };
}

function limitPath(pathname: string, max = 40): string {
  return pathname.length > max ? `${pathname.slice(0, max)}...` : pathname;
}

function KpiCard({
  title,
  metric,
  kind = "number",
  currency,
}: {
  title: string;
  metric: AnalyticsKpiMetricV2;
  kind?: "number" | "money" | "percent";
  currency: string;
}): JSX.Element {
  const badge = trendBadge(metric);
  const value =
    kind === "money"
      ? formatMoney(metric.value, currency)
      : kind === "percent"
        ? formatPercent(metric.value, 2)
        : formatNumber(metric.value);
  const previous =
    kind === "money"
      ? formatMoney(metric.previousValue, currency)
      : kind === "percent"
        ? formatPercent(metric.previousValue, 2)
        : formatNumber(metric.previousValue);
  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{title}</p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-[#0F172A]">{value}</p>
      <div className="mt-2 space-y-0.5 text-xs text-[#64748B]">
        <p>Kỳ trước: {previous}</p>
        <p>Chênh lệch: {kind === "money" ? formatMoney(metric.diff, currency) : formatNumber(metric.diff)}</p>
        <p>Biến động: {formatPercent(metric.percentChange, 2)}</p>
      </div>
    </article>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: AdminAnalyticsDashboardV2["breakdown"]["sourceBreakdown"];
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#0F172A]">{item.label}</span>
              <span className="text-[#64748B]">
                {formatNumber(item.visits)} ({formatPercent(item.share, 1)})
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#E2E8F0]">
              <div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${Math.min(item.share, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/analytics");
  }

  const params = await Promise.resolve(searchParams);
  const dashboard = await getAdminAnalyticsDashboard(params);

  const hasAnyData =
    dashboard.trafficOverview.currentPageviews.value > 0 ||
    dashboard.businessOverview.orders.value > 0 ||
    dashboard.businessOverview.paidRevenue.value > 0;
  const exportQuery = new URLSearchParams({
    range: dashboard.range.preset,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(dashboard.filters.pathname ? { pathname: dashboard.filters.pathname } : {}),
    ...(dashboard.filters.device !== "all" ? { device: dashboard.filters.device } : {}),
  }).toString();
  const chartRows = dashboard.chartData.visitsByDay.map((row, idx) => ({
    key: row.key,
    label: row.label,
    visits: row.value,
    orders: dashboard.chartData.ordersByDay[idx]?.value ?? 0,
    revenue: dashboard.chartData.revenueByDay[idx]?.value ?? 0,
  }));
  const currency = dashboard.settingsState.currency || "VND";
  const funnelRows = [
    dashboard.funnel.pageviews,
    dashboard.funnel.productViews,
    dashboard.funnel.addToCart,
    dashboard.funnel.beginCheckout,
    dashboard.funnel.submitOrder,
    dashboard.funnel.paidOrder,
    dashboard.funnel.paidRevenue,
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
              Analytics bán hàng - {dashboard.settingsState.siteName}
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">Dashboard tổng hợp KPI bán hàng, phễu chuyển đổi và nguồn truy cập.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "today", label: "Hôm nay" },
              { key: "7d", label: "7 ngày" },
              { key: "30d", label: "30 ngày" },
              { key: "month", label: "Tháng này" },
              { key: "year", label: "Năm nay" },
            ].map((item) => {
              const active = dashboard.range.preset === item.key;
              return (
                <a
                  key={item.key}
                  href={`/admin/analytics?range=${item.key}`}
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
              Dữ liệu thời gian thực · {dashboard.settingsState.timezone}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${dashboard.settingsState.trackingEnabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              Tracking {dashboard.settingsState.trackingEnabled ? "đang bật" : "đang tắt"}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${dashboard.settingsState.analyticsEnabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              Analytics {dashboard.settingsState.analyticsEnabled ? "đang bật" : "đang tắt"}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${dashboard.settingsState.ga4Enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {dashboard.settingsState.ga4Enabled ? "GA4 đang bật" : "GA4 chưa cấu hình"}
            </span>
          </div>
          {dashboard.settingsState.analyticsEnabled === false ? (
            <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700">Analytics đang tắt trong Cài đặt.</div>
          ) : null}
          {dashboard.settingsState.trackingEnabled === false ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Tracking đang tắt. Dashboard vẫn hiển thị dữ liệu đã thu thập trước đó.
            </div>
          ) : null}
          <form method="get" className="grid grid-cols-1 gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 md:grid-cols-3 xl:grid-cols-7">
            <input type="hidden" name="range" value={dashboard.range.preset} />
            <input name="from" type="date" defaultValue={params.from ?? ""} className="h-9 rounded-md border border-zinc-300 px-2 text-sm" />
            <input name="to" type="date" defaultValue={params.to ?? ""} className="h-9 rounded-md border border-zinc-300 px-2 text-sm" />
            <input name="pathname" placeholder="Lọc pathname" defaultValue={dashboard.filters.pathname} className="h-9 rounded-md border border-zinc-300 px-2 text-sm md:col-span-2 xl:col-span-2" />
            <select name="device" defaultValue={dashboard.filters.device} className="h-9 rounded-md border border-zinc-300 px-2 text-sm">
              <option value="all">Tất cả thiết bị</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
            <button type="submit" className="h-9 rounded-md bg-[#2563EB] px-3 text-sm font-semibold text-white">Áp dụng bộ lọc</button>
            <a href={`/api/admin/analytics/export?${exportQuery}`} className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400">
              Export CSV
            </a>
          </form>
        </header>

        {!hasAnyData ? (
          <section className="rounded-2xl border border-dashed border-sky-300 bg-gradient-to-b from-sky-50 to-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[#0F172A]">Chưa đủ dữ liệu để phân tích</h2>
            <p className="mt-2 text-sm text-zinc-600">Hãy mở storefront public để hệ thống bắt đầu ghi nhận.</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-[#0F172A]">Độ khớp dữ liệu</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Total card</p><p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatNumber(dashboard.dataQuality.totalCard)}</p></div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Tổng chart</p><p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatNumber(dashboard.dataQuality.chartTotal)}</p></div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"><p className="text-xs text-[#64748B]">Raw count</p><p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatNumber(dashboard.dataQuality.rawCount)}</p></div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-[#0F172A]">Tổng quan truy cập</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard title="Hôm nay" metric={dashboard.trafficOverview.today} currency={currency} />
                <KpiCard title="7 ngày" metric={dashboard.trafficOverview.sevenDays} currency={currency} />
                <KpiCard title="30 ngày" metric={dashboard.trafficOverview.thirtyDays} currency={currency} />
                <KpiCard title="Tháng này" metric={dashboard.trafficOverview.thisMonth} currency={currency} />
                <KpiCard title="Năm nay" metric={dashboard.trafficOverview.thisYear} currency={currency} />
                <KpiCard title="Pageviews kỳ đang xem" metric={dashboard.trafficOverview.currentPageviews} currency={currency} />
                <KpiCard title="Khách duy nhất" metric={dashboard.trafficOverview.uniqueVisitors} currency={currency} />
                <KpiCard title="Khách quay lại" metric={dashboard.trafficOverview.returningVisitors} currency={currency} />
                <KpiCard title="Top landing" metric={dashboard.trafficOverview.topLanding} currency={currency} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-[#0F172A]">Tổng quan kinh doanh</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard title="Đơn hàng" metric={dashboard.businessOverview.orders} currency={currency} />
                <KpiCard title="Đơn đã thanh toán" metric={dashboard.businessOverview.paidOrders} currency={currency} />
                <KpiCard title="Doanh thu đã thanh toán" metric={dashboard.businessOverview.paidRevenue} kind="money" currency={currency} />
                <KpiCard title="Giá trị đơn trung bình" metric={dashboard.businessOverview.averageOrderValue} kind="money" currency={currency} />
                <KpiCard title="Conversion đơn / visit" metric={dashboard.businessOverview.conversionRate} kind="percent" currency={currency} />
                <KpiCard title="Paid conversion" metric={dashboard.businessOverview.paidConversionRate} kind="percent" currency={currency} />
                <KpiCard title="Doanh thu / visit" metric={dashboard.businessOverview.revenuePerVisit} kind="money" currency={currency} />
                <KpiCard title="Page view events" metric={dashboard.businessOverview.pageViewEvents} currency={currency} />
                <KpiCard title="Product view events" metric={dashboard.businessOverview.productViewEvents} currency={currency} />
                <KpiCard title="Add to cart events" metric={dashboard.businessOverview.addToCartEvents} currency={currency} />
                <KpiCard title="Begin checkout events" metric={dashboard.businessOverview.beginCheckoutEvents} currency={currency} />
                <KpiCard title="Submit order events" metric={dashboard.businessOverview.submitOrderEvents} currency={currency} />
                <KpiCard title="Paid order events" metric={dashboard.businessOverview.paidOrderEvents} currency={currency} />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <VisitsLineChart data={chartRows} totalVisits={dashboard.dataQuality.totalCard} timezone={dashboard.settingsState.timezone} showMismatchWarning />
              </div>
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F172A]">Truy cập theo ngày trong kỳ đã chọn</h3>
                <div className="mt-2 space-y-1 text-sm text-[#64748B]">
                  {chartRows.slice(-7).map((row) => (
                    <div key={row.key} className="flex items-center justify-between"><span>{row.label}</span><span className="font-medium text-[#0F172A]">{formatNumber(row.visits)} lượt</span></div>
                  ))}
                </div>
              </section>
            </section>

            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0F172A]">Phễu chuyển đổi: truy cập → đơn hàng</h3>
              <div className="mt-3 space-y-2">
                {funnelRows.map((step) => {
                  const strongest = dashboard.funnel.strongestDropOffStep === step.key;
                  return (
                    <div key={step.key} className={`rounded-xl border p-3 ${strongest ? "border-rose-300 bg-rose-50" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#0F172A]">{step.label}</p><p className="text-sm font-bold text-[#0F172A]">{step.key === "paidRevenue" ? formatMoney(step.value, currency) : formatNumber(step.value)}</p></div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#64748B]"><span>Chuyển đổi: {formatPercent(step.conversionFromPrevious, 1)}</span><span>Rơi rớt: {formatPercent(step.dropOffFromPrevious, 1)}</span>{strongest ? <span className="font-semibold text-rose-700">Bước rớt mạnh nhất</span> : null}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-[#0F172A]">Điểm rơi funnel</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-[#64748B]">Thêm giỏ nhưng chưa checkout</p><p className="mt-1 text-xl font-bold text-[#0F172A]">{formatNumber(dashboard.abandonment.addToCartWithoutCheckout)}</p></div>
                  <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-[#64748B]">Checkout nhưng chưa gửi đơn</p><p className="mt-1 text-xl font-bold text-[#0F172A]">{formatNumber(dashboard.abandonment.checkoutWithoutSubmit)}</p></div>
                  <div className="rounded-lg border border-[#E2E8F0] p-3"><p className="text-[#64748B]">Gửi đơn nhưng chưa thanh toán</p><p className="mt-1 text-xl font-bold text-[#0F172A]">{formatNumber(dashboard.abandonment.submitWithoutPaid)}</p></div>
                </div>
              </section>
              <div className="space-y-4 xl:col-span-2">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <BreakdownCard title="Nguồn truy cập" rows={dashboard.breakdown.sourceBreakdown} />
                  <BreakdownCard title="Thiết bị" rows={dashboard.breakdown.deviceBreakdown} />
                  <BreakdownCard title="Trình duyệt" rows={dashboard.breakdown.browserBreakdown} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <header>
                <h2 className="text-base font-bold text-[#0F172A]">Phân tích nâng cao</h2>
                <p className="mt-1 text-sm text-[#64748B]">Top trang, nguồn và sản phẩm theo chuyển đổi / doanh thu.</p>
              </header>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top landing page theo chuyển đổi</h3>
                    <p className="text-xs text-[#64748B]">Hiệu quả chuyển đổi theo điểm vào đầu tiên.</p>
                  </header>
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Đường dẫn</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt truy cập</th>
                        <th className="px-4 py-2 text-right font-medium">Đơn hàng</th>
                        <th className="px-4 py-2 text-right font-medium">Đã thanh toán</th>
                        <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                        <th className="px-4 py-2 text-right font-medium">Chuyển đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topLandingByConversion.map((row) => (
                        <tr key={row.pathname} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{limitPath(row.pathname)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.visits)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.conversions)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{row.paid == null ? "—" : formatNumber(row.paid)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{row.revenue == null ? "—" : formatMoney(row.revenue, currency)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatPercent(row.rate, 2)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topLandingByConversion.length ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>

                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top pages theo chuyển đổi</h3>
                    <p className="text-xs text-[#64748B]">Hiệu quả chuyển đổi theo từng trang.</p>
                  </header>
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Đường dẫn</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt truy cập</th>
                        <th className="px-4 py-2 text-right font-medium">Đơn hàng</th>
                        <th className="px-4 py-2 text-right font-medium">Đã thanh toán</th>
                        <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                        <th className="px-4 py-2 text-right font-medium">Chuyển đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topPagesByConversion.map((row) => (
                        <tr key={row.pathname} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{limitPath(row.pathname)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.visits)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.conversions)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{row.paid == null ? "—" : formatNumber(row.paid)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{row.revenue == null ? "—" : formatMoney(row.revenue, currency)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatPercent(row.rate, 2)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topPagesByConversion.length ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Nguồn giới thiệu theo đơn hàng / doanh thu</h3>
                    <p className="text-xs text-[#64748B]">Đánh giá nguồn theo hiệu quả đơn hàng.</p>
                  </header>
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Nguồn</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt truy cập</th>
                        <th className="px-4 py-2 text-right font-medium">Đơn hàng</th>
                        <th className="px-4 py-2 text-right font-medium">Đã thanh toán</th>
                        <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topReferrersByOrdersRevenue.map((row) => (
                        <tr key={row.key} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{row.label}</td>
                          <td className="px-4 py-2 text-right text-zinc-500">—</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.orders)}</td>
                          <td className="px-4 py-2 text-right text-zinc-500">—</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatMoney(row.revenue, currency)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topReferrersByOrdersRevenue.length ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>

                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top sản phẩm theo đơn hàng / doanh thu</h3>
                    <p className="text-xs text-[#64748B]">Sản phẩm nổi bật theo đơn và doanh thu.</p>
                  </header>
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Sản phẩm</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt xem</th>
                        <th className="px-4 py-2 text-right font-medium">Đơn hàng</th>
                        <th className="px-4 py-2 text-right font-medium">Đã thanh toán</th>
                        <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topProductsByOrdersRevenue.map((row) => (
                        <tr key={row.productId} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{limitPath(row.productName, 48)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.views)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.orders)}</td>
                          <td className="px-4 py-2 text-right text-zinc-500">—</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatMoney(row.revenue, currency)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topProductsByOrdersRevenue.length ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top pages</h3>
                    <p className="text-xs text-[#64748B]">Top trang theo lượt xem và tỷ trọng.</p>
                  </header>
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Đường dẫn</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt xem</th>
                        <th className="px-4 py-2 text-right font-medium">Xu hướng</th>
                        <th className="px-4 py-2 text-right font-medium">Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topPages.map((row) => (
                        <tr key={row.pathname} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{limitPath(row.pathname)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.visits)}</td>
                          <td className="px-4 py-2 text-right">{row.trend === "up" ? "Tăng" : row.trend === "down" ? "Giảm" : "Ổn định"}</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatPercent(row.share, 1)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topPages.length ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>

                <section className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <header className="border-b border-zinc-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Top landing pages</h3>
                    <p className="text-xs text-[#64748B]">Điểm vào đầu tiên có tỷ trọng cao.</p>
                  </header>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-[#F8FAFC] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Đường dẫn</th>
                        <th className="px-4 py-2 text-right font-medium">Lượt vào đầu tiên</th>
                        <th className="px-4 py-2 text-right font-medium">Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topTables.topLandingPages.map((row) => (
                        <tr key={row.pathname} className="border-t border-zinc-100">
                          <td className="px-4 py-2 text-zinc-700">{limitPath(row.pathname)}</td>
                          <td className="px-4 py-2 text-right text-zinc-900">{formatNumber(row.visits)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-zinc-900">{formatPercent(row.share, 1)}</td>
                        </tr>
                      ))}
                      {!dashboard.topTables.topLandingPages.length ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">Chưa có dữ liệu.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </section>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <header className="border-b border-zinc-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">Recent visits</h2>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[#64748B]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Thời gian</th>
                      <th className="px-4 py-2 font-medium">Đường dẫn</th>
                      <th className="px-4 py-2 font-medium">Nguồn giới thiệu</th>
                      <th className="px-4 py-2 font-medium">Source</th>
                      <th className="px-4 py-2 font-medium">Thiết bị</th>
                      <th className="px-4 py-2 font-medium">Trình duyệt / Hệ điều hành</th>
                      <th className="px-4 py-2 font-medium">UA rút gọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentVisits.map((visit, idx) => (
                      <tr key={`${visit.pathname}-${visit.time}-${idx}`} className="border-t border-zinc-100">
                        <td className="px-4 py-2 text-zinc-600">{new Date(visit.time).toLocaleString("vi-VN", { hour12: false })}</td>
                        <td className="px-4 py-2 font-medium text-zinc-900">{limitPath(visit.pathname, 52)}</td>
                        <td className="px-4 py-2 text-zinc-700">{limitPath(visit.referrer ?? "Direct", 48)}</td>
                        <td className="px-4 py-2 text-zinc-700">{visit.source}</td>
                        <td className="px-4 py-2 text-zinc-700">{visit.device}</td>
                        <td className="px-4 py-2 text-zinc-700">{visit.browser} / {visit.os}</td>
                        <td className="px-4 py-2 text-zinc-600">{visit.userAgentShort}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
