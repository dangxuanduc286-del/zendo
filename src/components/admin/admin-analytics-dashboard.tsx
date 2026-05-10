import type { SoSanhChiSoAnalytics } from "../../lib/analytics/compare";
import type { TongQuanAnalytics } from "../../lib/analytics/queries-overview";
import type { DuLieuChartAnalytics } from "../../lib/analytics/queries-chart";

interface AdminAnalyticsDashboardProps {
  data: TongQuanAnalytics;
  chartData: DuLieuChartAnalytics;
  debugData: {
    pageviewsInRange: number;
    chartBucketsSum: number;
    uniqueVisitors: number;
    returningVisitors: number;
    ordersCount: number;
    paidOrdersCount: number;
    revenueVnd: number;
    AOV: number | null;
    revenuePerVisit: number | null;
    productViews: number;
    addToCart: number;
    beginCheckout: number;
    submitOrder: number;
    paidOrder: number;
    timezone: string;
    rangeStart: string;
    rangeEnd: string;
    bucketType: string;
  };
}

function dinhDangSo(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function dinhDangTien(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function dinhDangPhanTram(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}%`;
}

function moTaSoSanh(compare: SoSanhChiSoAnalytics): string {
  if (compare.percentChange == null) return "—";
  const dau = compare.percentChange > 0 ? "+" : "";
  return `${dau}${compare.percentChange.toFixed(2)}%`;
}

function mauSoSanh(compare: SoSanhChiSoAnalytics): string {
  if (compare.percentChange == null || compare.trend === "on_dinh") return "text-zinc-500";
  return compare.trend === "tang" ? "text-emerald-700" : "text-rose-700";
}

function CardChiSo({
  label,
  value,
  compare,
}: {
  label: string;
  value: string;
  compare?: SoSanhChiSoAnalytics;
}): JSX.Element {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {compare ? (
        <p className={`mt-1 text-xs font-medium ${mauSoSanh(compare)}`}>
          So với kỳ trước: {moTaSoSanh(compare)}
        </p>
      ) : null}
    </article>
  );
}

function BangTop({
  tieuDe,
  cotTrai,
  cotPhai,
  rows,
  emptyMessage,
}: {
  tieuDe: string;
  cotTrai: string;
  cotPhai: string;
  rows: Array<{ key: string; count: number }>;
  emptyMessage: string;
}): JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{tieuDe}</h3>
      </header>
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-[#0F172A]">
          <tr>
            <th className="px-4 py-2 font-medium">{cotTrai}</th>
            <th className="px-4 py-2 text-right font-medium">{cotPhai}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-zinc-100">
              <td className="px-4 py-2 text-zinc-700">{row.key || "/"}</td>
              <td className="px-4 py-2 text-right font-semibold text-zinc-900">{dinhDangSo(row.count)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr className="border-t border-zinc-100">
              <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function dinhDangTrucY(value: number, type: "so" | "tien" | "phan_tram"): string {
  if (type === "tien") {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return dinhDangSo(Math.round(value));
  }
  if (type === "phan_tram") return `${value.toFixed(1)}%`;
  return dinhDangSo(Math.round(value));
}

function BieuDoCot({
  tieuDe,
  moTa,
  rows,
  dataKey,
  valueType,
}: {
  tieuDe: string;
  moTa: string;
  rows: DuLieuChartAnalytics["buckets"];
  dataKey: "visits" | "orders" | "revenue" | "conversionRate";
  valueType: "so" | "tien" | "phan_tram";
}): JSX.Element {
  const values = rows.map((row) => (row[dataKey] == null ? 0 : Number(row[dataKey])));
  const maxValue = Math.max(...values, 0);

  return (
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-900">{tieuDe}</h3>
        <p className="mt-1 text-xs text-zinc-500">{moTa}</p>
      </header>
      <div className="flex h-48 items-end gap-1 overflow-x-auto pb-2">
        {rows.map((row) => {
          const rawValue = row[dataKey] == null ? 0 : Number(row[dataKey]);
          const phanTram = maxValue > 0 ? (rawValue / maxValue) * 100 : 0;
          const tooltip = `${row.nhan}: ${
            valueType === "tien"
              ? dinhDangTien(rawValue)
              : valueType === "phan_tram"
                ? dinhDangPhanTram(rawValue)
                : dinhDangSo(rawValue)
          }`;
          return (
            <div key={`${dataKey}-${row.key}`} className="flex min-w-9 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-500">{dinhDangTrucY(rawValue, valueType)}</span>
              <div className="flex h-36 w-full items-end rounded-md bg-[#F8FAFC] px-1">
                <div
                  title={tooltip}
                  className="w-full rounded-t bg-[#2563EB] transition-[height]"
                  style={{ height: `${Math.max(phanTram, 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-600">{row.nhan}</span>
            </div>
          );
        })}
      </div>
      {!rows.length ? <p className="mt-2 text-xs text-zinc-500">Chưa có dữ liệu biểu đồ.</p> : null}
    </section>
  );
}

function BlockDebug({
  debugData,
}: {
  debugData: AdminAnalyticsDashboardProps["debugData"];
}): JSX.Element | null {
  if (process.env.NODE_ENV === "production") return null;

  const rows: Array<{ label: string; value: string }> = [
    { label: "pageviewsInRange", value: dinhDangSo(debugData.pageviewsInRange) },
    { label: "chartBucketsSum", value: dinhDangSo(debugData.chartBucketsSum) },
    { label: "uniqueVisitors", value: dinhDangSo(debugData.uniqueVisitors) },
    { label: "returningVisitors", value: dinhDangSo(debugData.returningVisitors) },
    { label: "ordersCount", value: dinhDangSo(debugData.ordersCount) },
    { label: "paidOrdersCount", value: dinhDangSo(debugData.paidOrdersCount) },
    { label: "revenueVnd", value: dinhDangTien(debugData.revenueVnd) },
    { label: "AOV", value: debugData.AOV == null ? "—" : dinhDangTien(debugData.AOV) },
    {
      label: "revenuePerVisit",
      value: debugData.revenuePerVisit == null ? "—" : dinhDangTien(debugData.revenuePerVisit),
    },
    { label: "productViews", value: dinhDangSo(debugData.productViews) },
    { label: "addToCart", value: dinhDangSo(debugData.addToCart) },
    { label: "beginCheckout", value: dinhDangSo(debugData.beginCheckout) },
    { label: "submitOrder", value: dinhDangSo(debugData.submitOrder) },
    { label: "paidOrder", value: dinhDangSo(debugData.paidOrder) },
    { label: "timezone", value: debugData.timezone },
    { label: "rangeStart", value: debugData.rangeStart },
    { label: "rangeEnd", value: debugData.rangeEnd },
    { label: "bucketType", value: debugData.bucketType },
  ];

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">Debug đối chiếu tổng</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.label} className="rounded-md border border-amber-200 bg-white p-2">
            <p className="text-[11px] text-amber-700">{row.label}</p>
            <p className="text-sm font-semibold text-zinc-900">{row.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AdminAnalyticsDashboard({
  data,
  chartData,
  debugData,
}: AdminAnalyticsDashboardProps): JSX.Element {
  const traffic = data.current.traffic;
  const business = data.current.business;
  const funnel = data.current.funnel;

  const boGioHangChuaCheckout = Math.max(funnel.addToCart - funnel.beginCheckout, 0);
  const boCheckoutChuaSubmit = Math.max(funnel.beginCheckout - funnel.submitOrder, 0);
  const boSubmitChuaPaid = Math.max(funnel.submitOrder - funnel.paidOrder, 0);
  const showDebugBlock = process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Tổng quan lưu lượng</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CardChiSo
            label="Tổng lượt truy cập"
            value={dinhDangSo(traffic.totalVisits)}
            compare={data.compare.totalVisits}
          />
          <CardChiSo label="Khách truy cập duy nhất" value={dinhDangSo(traffic.uniqueVisitors)} />
          <CardChiSo label="Khách quay lại" value={dinhDangSo(traffic.returningVisitors)} />
          <CardChiSo
            label="Landing page đứng đầu"
            value={traffic.topLandingPages[0]?.key ?? "—"}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Tổng quan kinh doanh</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CardChiSo label="Đơn hàng" value={dinhDangSo(business.orders)} compare={data.compare.orders} />
          <CardChiSo
            label="Đơn đã thanh toán"
            value={dinhDangSo(business.paidOrders)}
            compare={data.compare.paidOrders}
          />
          <CardChiSo
            label="Doanh thu"
            value={dinhDangTien(business.revenue)}
            compare={data.compare.revenue}
          />
          <CardChiSo label="AOV" value={business.aov == null ? "—" : dinhDangTien(business.aov)} />
          <CardChiSo
            label="Doanh thu / lượt truy cập"
            value={business.revenuePerVisit == null ? "—" : dinhDangTien(business.revenuePerVisit)}
          />
          <CardChiSo
            label="Visit → Order"
            value={dinhDangPhanTram(business.visitToOrderConversion)}
          />
          <CardChiSo
            label="Visit → Paid"
            value={dinhDangPhanTram(business.visitToPaidConversion)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Funnel chuyển đổi</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <CardChiSo label="Lượt truy cập" value={dinhDangSo(traffic.totalVisits)} />
          <CardChiSo label="Lượt xem sản phẩm" value={dinhDangSo(funnel.productViews)} />
          <CardChiSo label="Thêm vào giỏ" value={dinhDangSo(funnel.addToCart)} />
          <CardChiSo label="Bắt đầu thanh toán" value={dinhDangSo(funnel.beginCheckout)} />
          <CardChiSo label="Gửi đơn hàng" value={dinhDangSo(funnel.submitOrder)} />
          <CardChiSo label="Đơn đã thanh toán" value={dinhDangSo(funnel.paidOrder)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CardChiSo
            label="Xem sản phẩm → Thêm giỏ"
            value={dinhDangPhanTram(funnel.tiLeProductViewSangAddToCart)}
          />
          <CardChiSo
            label="Thêm giỏ → Bắt đầu thanh toán"
            value={dinhDangPhanTram(funnel.tiLeAddToCartSangBeginCheckout)}
          />
          <CardChiSo
            label="Bắt đầu thanh toán → Gửi đơn"
            value={dinhDangPhanTram(funnel.tiLeBeginCheckoutSangSubmitOrder)}
          />
          <CardChiSo
            label="Gửi đơn → Đã thanh toán"
            value={dinhDangPhanTram(funnel.tiLeSubmitOrderSangPaidOrder)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Rơi rụng chuyển đổi</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CardChiSo label="Add to cart chưa begin_checkout" value={dinhDangSo(boGioHangChuaCheckout)} />
          <CardChiSo label="Begin_checkout chưa submit_order" value={dinhDangSo(boCheckoutChuaSubmit)} />
          <CardChiSo label="Submit_order chưa paid_order" value={dinhDangSo(boSubmitChuaPaid)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Biểu đồ phân tích</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BieuDoCot
            tieuDe="Biểu đồ lượt truy cập"
            moTa={`Tổng theo ${chartData.bucketType === "thang" ? "tháng" : "ngày"} trong khoảng đã chọn.`}
            rows={chartData.buckets}
            dataKey="visits"
            valueType="so"
          />
          <BieuDoCot
            tieuDe="Biểu đồ đơn hàng"
            moTa={`Tổng đơn gửi thành công theo ${chartData.bucketType === "thang" ? "tháng" : "ngày"}.`}
            rows={chartData.buckets}
            dataKey="orders"
            valueType="so"
          />
          <BieuDoCot
            tieuDe="Biểu đồ doanh thu"
            moTa={`Doanh thu đơn đã thanh toán theo ${chartData.bucketType === "thang" ? "tháng" : "ngày"}.`}
            rows={chartData.buckets}
            dataKey="revenue"
            valueType="tien"
          />
          <BieuDoCot
            tieuDe="Biểu đồ chuyển đổi"
            moTa={`Tỷ lệ chuyển đổi Visit → Paid theo ${chartData.bucketType === "thang" ? "tháng" : "ngày"}.`}
            rows={chartData.buckets}
            dataKey="conversionRate"
            valueType="phan_tram"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">Bảng phân tích</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BangTop
            tieuDe="Top trang vào đầu tiên"
            cotTrai="Trang vào đầu tiên"
            cotPhai="Lượt truy cập"
            rows={traffic.topLandingPages}
            emptyMessage="Chưa có dữ liệu landing page."
          />
          <BangTop
            tieuDe="Top trang truy cập"
            cotTrai="Trang"
            cotPhai="Lượt truy cập"
            rows={traffic.topPages}
            emptyMessage="Chưa có dữ liệu trang."
          />
          <BangTop
            tieuDe="Top nguồn giới thiệu"
            cotTrai="Nguồn giới thiệu"
            cotPhai="Lượt truy cập"
            rows={traffic.referrerBreakdown}
            emptyMessage="Chưa có dữ liệu referrer."
          />
          <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <header className="border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Top sản phẩm</h3>
            </header>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[#0F172A]">
                <tr>
                  <th className="px-4 py-2 font-medium">Sản phẩm</th>
                  <th className="px-4 py-2 text-right font-medium">Lượt xem sản phẩm</th>
                </tr>
              </thead>
              <tbody>
                {funnel.topProducts.map((item) => (
                  <tr key={item.productId} className="border-t border-zinc-100">
                    <td className="px-4 py-2 text-zinc-700">{item.productName}</td>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-900">
                      {dinhDangSo(item.count)}
                    </td>
                  </tr>
                ))}
                {!funnel.topProducts.length ? (
                  <tr className="border-t border-zinc-100">
                    <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                      Chưa có dữ liệu sản phẩm.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      {showDebugBlock ? <BlockDebug debugData={debugData} /> : null}
    </div>
  );
}

