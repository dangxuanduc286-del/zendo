"use client";

import { useMemo, useState } from "react";
import { AnalyticsErrorBoundary } from "@/components/analytics/analytics-error-boundary";
import AffiliateAnalyticsPieLazy from "./affiliate-analytics-pie-lazy";
import AffiliateAnalyticsTimelineLazy from "./affiliate-analytics-timeline-lazy";
import {
  affiliateAnalyticsFiltersToSearchParams,
  type AffiliateAnalyticsFilters,
  useAffiliateConversionTimeline,
  useAffiliateDeviceAnalytics,
  useAffiliateLandingAnalytics,
  useAffiliateTopLinks,
  useAffiliateTrafficSources,
  type RangeKey,
} from "./use-affiliate-analytics-hooks";
import {
  CTV_COLOR_DIVIDER,
  CTV_SECTION_CARD,
  CTV_TYPE_CARD_TITLE,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import {
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 2)}%`;
}

export default function AffiliateAnalyticsTrafficInsights(props: {
  range: RangeKey;
  filters: AffiliateAnalyticsFilters;
  onFiltersChange: (next: AffiliateAnalyticsFilters) => void;
}): JSX.Element {
  const [sheet, setSheet] = useState(false);
  const filterQs = useMemo(() => affiliateAnalyticsFiltersToSearchParams(props.filters), [props.filters]);

  const topLinks = useAffiliateTopLinks({ range: props.range, enabled: true, filterQs, page: 1 });
  const sources = useAffiliateTrafficSources({ range: props.range, enabled: true, filterQs, live: false });
  const devices = useAffiliateDeviceAnalytics({ range: props.range, enabled: true, filterQs, live: false });
  const landing = useAffiliateLandingAnalytics({ range: props.range, enabled: true, filterQs, page: 1, live: false });
  const timeline = useAffiliateConversionTimeline({ range: props.range, enabled: true, filterQs, live: false });

  const sourcePie = useMemo(
    () => (sources.data?.rows ?? []).map((r) => ({ name: r.source, value: Math.max(0, r.clicks) })).filter((x) => x.value > 0),
    [sources.data?.rows],
  );
  const devicePie = useMemo(
    () => (devices.data?.rows ?? []).map((r) => ({ name: r.device, value: Math.max(0, r.clicks) })).filter((x) => x.value > 0),
    [devices.data?.rows],
  );

  const patch = (p: Partial<AffiliateAnalyticsFilters>) => props.onFiltersChange({ ...props.filters, ...p });

  const filterForm = (
    <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#64748B]">
        Nguồn
        <select
          value={props.filters.source}
          onChange={(e) => patch({ source: e.target.value })}
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
        >
          <option value="ALL">Tất cả</option>
          <option value="TIKTOK">TikTok</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="DIRECT">Direct</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#64748B]">
        Thiết bị
        <select
          value={props.filters.device}
          onChange={(e) => patch({ device: e.target.value })}
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
        >
          <option value="ALL">Tất cả</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
          <option value="tablet">Tablet</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#64748B] sm:col-span-2 lg:col-span-1">
        Pathname chứa
        <input
          value={props.filters.pathname}
          onChange={(e) => patch({ pathname: e.target.value })}
          placeholder="/deal-hot, /san-pham/…"
          className="h-10 rounded-xl border border-[#E2E8F0] px-3 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-[#64748B] sm:col-span-2 lg:col-span-1">
        Product ID
        <input
          value={props.filters.productId}
          onChange={(e) => patch({ productId: e.target.value })}
          placeholder="cuid sản phẩm (tuỳ chọn)"
          className="h-10 rounded-xl border border-[#E2E8F0] px-3 font-mono text-xs text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/10"
        />
      </label>
    </div>
  );

  return (
    <AnalyticsErrorBoundary title="Phân tích traffic tạm thời không khả dụng.">
    <div className="flex w-full max-w-none flex-col gap-5 lg:gap-6">
      <div className="sticky top-0 z-20 hidden rounded-2xl border border-[#DBEAFE]/90 bg-[#EFF6FF]/40 p-4 shadow-[0_1px_2px_rgba(37,99,235,0.06)] ring-1 ring-[#DBEAFE]/50 lg:block lg:p-5">
        <div className="border-b border-[#F1F5F9] pb-3">
          <p className="text-[13px] font-semibold tracking-tight text-[#0F172A]">Bộ lọc analytics</p>
          <p className="mt-0.5 text-xs text-[#64748B]">Lọc toàn bộ biểu đồ và bảng trong tab này.</p>
        </div>
        <div className="mt-4">{filterForm}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className={AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY}
            href={`/api/account/affiliate/analytics/export?type=top-links&range=${props.range}&format=csv${filterQs ? `&${filterQs}` : ""}`}
          >
            Xuất top links
          </a>
          <a
            className={AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY}
            href={`/api/account/affiliate/analytics/export?type=sources&range=${props.range}&format=csv${filterQs ? `&${filterQs}` : ""}`}
          >
            Xuất nguồn
          </a>
          <a
            className={AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY}
            href={`/api/account/affiliate/analytics/export?type=landing&range=${props.range}&format=excel${filterQs ? `&${filterQs}` : ""}`}
          >
            Excel landing
          </a>
        </div>
      </div>

      <div className="flex justify-end lg:hidden">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="h-10 rounded-xl border border-[#BFDBFE]/90 bg-white px-4 text-sm font-semibold text-[#0F172A] shadow-[0_1px_2px_rgba(37,99,235,0.05)] hover:bg-[#EFF6FF]/80 lg:hidden"
        >
          Bộ lọc & xuất
        </button>
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 lg:hidden" onClick={() => setSheet(false)} role="presentation">
          <div
            className="max-h-[88vh] overflow-y-auto overscroll-y-contain rounded-t-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Bộ lọc"
          >
            <p className="text-sm font-semibold text-[#0F172A]">Bộ lọc</p>
            <div className="mt-3">{filterForm}</div>
            <div className="mt-4 flex flex-col gap-2">
              <a
                className="rounded-xl border border-[#E2E8F0] py-2 text-center text-sm font-semibold text-[#2563EB]"
                href={`/api/account/affiliate/analytics/export?type=top-links&range=${props.range}&format=csv${filterQs ? `&${filterQs}` : ""}`}
              >
                Xuất top links (CSV)
              </a>
              <a
                className="rounded-xl border border-[#E2E8F0] py-2 text-center text-sm font-semibold text-[#2563EB]"
                href={`/api/account/affiliate/analytics/export?type=top-products&range=${props.range}&format=csv${filterQs ? `&${filterQs}` : ""}`}
              >
                Xuất top sản phẩm
              </a>
              <button type="button" className="rounded-xl bg-[#2563EB] py-2 text-sm font-semibold text-white" onClick={() => setSheet(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className={CTV_SECTION_CARD}>
        <div className={`border-b ${CTV_COLOR_DIVIDER} pb-3`}>
          <h3 className={CTV_TYPE_CARD_TITLE}>Top link affiliate</h3>
        </div>
        <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border border-[#F1F5F9]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-3 py-2.5 pr-2">Path</th>
                <th className="px-3 py-2.5 pr-2">Click</th>
                <th className="px-3 py-2.5 pr-2">Visitor</th>
                <th className="px-3 py-2.5 pr-2">Đơn</th>
                <th className="px-3 py-2.5 pr-2">Conv</th>
                <th className="px-3 py-2.5 pr-2">Hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {topLinks.data?.rows?.map((r) => (
                <tr key={r.pathname} className="bg-white hover:bg-[#F8FAFC]/60">
                  <td className="max-w-[280px] truncate px-3 py-2.5 pr-2 font-medium text-[#0F172A]">{r.pathname}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.clicks}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.visitors}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.orders}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-emerald-700">{fmtPct(r.conversionRate)}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{fmtVnd(r.commission)}</td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
        {topLinks.error ? <p className="mt-2 text-sm text-rose-600">{topLinks.error}</p> : null}
      </section>

      <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] lg:gap-5">
        <section className={CTV_SECTION_CARD}>
          <div className={`border-b ${CTV_COLOR_DIVIDER} pb-3`}>
            <h3 className={CTV_TYPE_CARD_TITLE}>Nguồn traffic</h3>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-3 py-2.5 pr-2">Nguồn</th>
                  <th className="px-3 py-2.5 pr-2">Click</th>
                  <th className="px-3 py-2.5 pr-2">Visitor</th>
                  <th className="px-3 py-2.5 pr-2">Đơn</th>
                  <th className="px-3 py-2.5 pr-2">Conv</th>
                  <th className="px-3 py-2.5">HH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sources.data?.rows?.map((r) => (
                  <tr key={r.source} className="bg-white hover:bg-[#F8FAFC]/60">
                    <td className="px-3 py-2.5 pr-2 font-medium text-[#0F172A]">{r.source}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.clicks}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.visitors}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.orders}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{fmtPct(r.conversionRate)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#1E293B]">{fmtVnd(r.commission)}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-[#F1F5F9] bg-[#F8FAFC]/40 p-2">
            <AnalyticsErrorBoundary title="Biểu đồ nguồn traffic lỗi.">
              {sourcePie.length ? <AffiliateAnalyticsPieLazy data={sourcePie} compact /> : <p className="text-xs text-[#64748B]">Chưa đủ dữ liệu donut.</p>}
            </AnalyticsErrorBoundary>
          </div>
        </section>

        <section className={CTV_SECTION_CARD}>
          <div className={`border-b ${CTV_COLOR_DIVIDER} pb-3`}>
            <h3 className={CTV_TYPE_CARD_TITLE}>Thiết bị</h3>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-3 py-2.5 pr-2">Device</th>
                  <th className="px-3 py-2.5 pr-2">Visitor</th>
                  <th className="px-3 py-2.5 pr-2">Click</th>
                  <th className="px-3 py-2.5 pr-2">Đơn</th>
                  <th className="px-3 py-2.5">Conv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {devices.data?.rows?.map((r) => (
                  <tr key={r.device} className="bg-white hover:bg-[#F8FAFC]/60">
                    <td className="px-3 py-2.5 pr-2 font-medium capitalize text-[#0F172A]">{r.device}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.visitors}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.clicks}</td>
                    <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.orders}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#1E293B]">{fmtPct(r.conversionRate)}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC]/40 p-2">
            <AnalyticsErrorBoundary title="Biểu đồ thiết bị lỗi.">
              {devicePie.length ? <AffiliateAnalyticsPieLazy data={devicePie} compact /> : null}
            </AnalyticsErrorBoundary>
          </div>
        </section>
      </div>

      <section className={CTV_SECTION_CARD}>
        <div className={`border-b ${CTV_COLOR_DIVIDER} pb-3`}>
          <h3 className={CTV_TYPE_CARD_TITLE}>Landing pages</h3>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#F1F5F9]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F8FAFC]/90 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-3 py-2.5 pr-2">Path</th>
                <th className="px-3 py-2.5 pr-2">Visits</th>
                <th className="px-3 py-2.5 pr-2">Click</th>
                <th className="px-3 py-2.5 pr-2">Đơn</th>
                <th className="px-3 py-2.5 pr-2">Conv</th>
                <th className="px-3 py-2.5">DT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {landing.data?.rows?.map((r) => (
                <tr key={r.pathname} className="bg-white hover:bg-[#F8FAFC]/60">
                  <td className="max-w-[260px] truncate px-3 py-2.5 pr-2 font-medium text-[#0F172A]">{r.pathname}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.visits}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.clicks}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{r.orders}</td>
                  <td className="px-3 py-2.5 pr-2 tabular-nums text-[#1E293B]">{fmtPct(r.conversionRate)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[#1E293B]">{fmtVnd(r.revenue)}</td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CTV_SECTION_CARD}>
        <div className={`border-b ${CTV_COLOR_DIVIDER} pb-3`}>
          <h3 className={CTV_TYPE_CARD_TITLE}>Conversion timeline</h3>
          <p className="mt-1 text-xs text-[#64748B]">Trên: click & đơn · Dưới: conv %, commission, doanh thu</p>
        </div>
        {timeline.loading && !timeline.data ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-[#F1F5F9] motion-reduce:animate-none" />
        ) : null}
        {timeline.data?.buckets?.length ? (
          <div className={`mt-4 transition-opacity duration-300 ${timeline.refreshing ? "opacity-80" : "opacity-100"}`}>
            <AnalyticsErrorBoundary title="Timeline chuyển đổi lỗi.">
              <AffiliateAnalyticsTimelineLazy buckets={timeline.data.buckets} />
            </AnalyticsErrorBoundary>
          </div>
        ) : null}
        {timeline.error ? <p className="mt-3 text-sm text-rose-600">{timeline.error}</p> : null}
      </section>
    </div>
    </AnalyticsErrorBoundary>
  );
}
