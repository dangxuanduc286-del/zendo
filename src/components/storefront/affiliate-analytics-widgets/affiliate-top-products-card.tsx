"use client";

import { ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import { SafeProductThumbnail } from "@/components/ui/safe-product-thumbnail";
import {
  CTV_COLOR_SURFACE_ROW_HOVER,
  CTV_COLOR_SURFACE_TABLE_HEAD,
} from "../affiliate/affiliate-ctv-account-ui-tokens";
import { useAffiliateTopProducts, type RangeKey } from "../use-affiliate-analytics-hooks";
import { fmtPct, fmtVnd } from "./affiliate-analytics-format";
import {
  AnalyticsCardBody,
  AnalyticsCardError,
  AnalyticsCardHeader,
  AnalyticsCardShell,
  AnalyticsCardSkeleton,
  AnalyticsChartContainer,
  AnalyticsEmptyState,
} from "./affiliate-analytics-card-ui";

const HEADING_ID = "affiliate-widget-top-products";

export default function AffiliateTopProductsCard(props: { range: RangeKey; enabled: boolean }): JSX.Element {
  const query = useAffiliateTopProducts({
    range: props.range,
    enabled: props.enabled,
    sort: "clicks",
    filterQs: "",
  });

  const rows = query.data?.rows ?? [];

  return (
    <AnalyticsCardShell headingId={HEADING_ID}>
      <AnalyticsCardHeader id={HEADING_ID} title="Top sản phẩm" hint="Xếp hạng theo click trong kỳ" />
      <AnalyticsCardBody>
        <AnalyticsChartContainer flush>
          {query.loading && !query.data ? (
            <AnalyticsCardSkeleton />
          ) : rows.length ? (
            <div className="h-full w-full min-w-0 overflow-auto overscroll-x-contain">
              <table className="w-full min-w-[min(100%,28rem)] text-left text-sm sm:min-w-[32rem]">
                <thead
                  className={clsx(
                    CTV_COLOR_SURFACE_TABLE_HEAD,
                    "sticky top-0 z-[1] text-[11px] font-semibold uppercase tracking-wide text-slate-500",
                  )}
                >
                  <tr>
                    <th className="px-3 py-2.5 pr-2">Sản phẩm</th>
                    <th className="whitespace-nowrap px-2 py-2.5 pr-2 tabular-nums">Click</th>
                    <th className="hidden whitespace-nowrap px-2 py-2.5 pr-2 tabular-nums md:table-cell">Visitor</th>
                    <th className="whitespace-nowrap px-2 py-2.5 pr-2 tabular-nums">Conv</th>
                    <th className="hidden whitespace-nowrap px-2 py-2.5 pr-2 tabular-nums lg:table-cell">Doanh thu</th>
                    <th className="whitespace-nowrap px-2 py-2.5 tabular-nums">HH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 8).map((r) => (
                    <tr key={r.productId} className={clsx("bg-white", CTV_COLOR_SURFACE_ROW_HOVER)}>
                      <td className="max-w-[9rem] px-3 py-2 pr-2 sm:max-w-none">
                        <div className="flex min-w-0 items-center gap-2">
                          <SafeProductThumbnail
                            src={r.imageUrl}
                            alt=""
                            size={32}
                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                          />
                          <span className="min-w-0 truncate font-medium text-slate-900">{r.productName}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 pr-2 tabular-nums text-slate-800">{r.clicks}</td>
                      <td className="hidden whitespace-nowrap px-2 py-2 pr-2 tabular-nums text-slate-800 md:table-cell">
                        {r.visitors ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 pr-2 tabular-nums text-emerald-700">
                        {fmtPct(r.conversionRate)}
                      </td>
                      <td className="hidden whitespace-nowrap px-2 py-2 pr-2 tabular-nums text-slate-800 lg:table-cell">
                        {fmtVnd(r.revenue)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-emerald-700">{fmtVnd(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AnalyticsEmptyState
              icon={ShoppingBag}
              title="Chưa có top sản phẩm"
              description="Khi có traffic và click vào sản phẩm, bảng xếp hạng sẽ hiện tại đây."
            />
          )}
        </AnalyticsChartContainer>
        {query.error ? <AnalyticsCardError message={query.error} onRetry={query.refetch} /> : null}
      </AnalyticsCardBody>
    </AnalyticsCardShell>
  );
}
