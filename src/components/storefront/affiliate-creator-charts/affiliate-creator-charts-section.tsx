"use client";

import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { Share2, Sparkles } from "lucide-react";
import {
  CTV_ANALYTICS_CHART_PAIR_COL,
  CTV_ANALYTICS_CHART_PAIR_ROW,
  CTV_ANALYTICS_CHART_ROOT,
  CTV_ANALYTICS_SECTION_SHELL,
  CTV_TYPE_BODY,
  CTV_TYPE_CARD_TITLE,
} from "../affiliate/affiliate-ctv-account-ui-tokens";
import {
  CTV_SEGMENTED_PILL_ITEM,
  CTV_SEGMENTED_PILL_ITEM_ACTIVE,
} from "../ctv/ctv-ui-tokens";
import { CreatorEmptyState, CreatorSectionShell } from "../affiliate-creator-metric-card";
import CreatorCampaignBarsLazy from "./creator-campaign-bars-lazy";
import type { CampaignBarRow } from "./creator-campaign-bars-inner";
import CreatorLandingBarsLazy from "./creator-landing-bars-lazy";
import type { LandingRow } from "./creator-landing-bars-inner";
import CreatorRealtimeSparklineLazy from "./creator-realtime-sparkline-lazy";
import type { RtPoint } from "./creator-realtime-sparkline-inner";
import CreatorSourceDonutLazy from "./creator-source-donut-lazy";
import type { SourceRow } from "./creator-source-donut-inner";
import CreatorTrafficLineLazy from "./creator-traffic-line-lazy";
import type { CreatorTimelinePoint } from "./creator-traffic-line-inner";

type Props = {
  rangeLabel: string;
  timelineBuckets: CreatorTimelinePoint[];
  sourcesRows: SourceRow[];
  campaignRows: CampaignBarRow[];
  landingRows: LandingRow[];
  rtHistory: RtPoint[];
  loadingTimeline: boolean;
  loadingSources: boolean;
  loadingCampaigns: boolean;
  loadingLanding: boolean;
  /** Hàng 3 — «Traffic theo ngày» (50%), render từ parent. */
  trafficByDayPanel?: ReactNode;
};

function ChartPairCol(props: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={clsx(CTV_ANALYTICS_CHART_PAIR_COL, props.className)}>{props.children}</div>;
}

export default function AffiliateCreatorChartsSection(props: Props): JSX.Element {
  const [campaignMetric, setCampaignMetric] = useState<"revenue" | "epc" | "clicks">("revenue");
  const [rtWindow, setRtWindow] = useState<5 | 15 | 60>(15);

  const hasAny =
    props.timelineBuckets.length > 0 ||
    props.sourcesRows.some((r) => r.clicks > 0) ||
    props.campaignRows.length > 0 ||
    props.landingRows.length > 0;

  const empty = !props.loadingTimeline && !props.loadingSources && !props.loadingCampaigns && !props.loadingLanding && !hasAny;

  const showChartRows = !empty || Boolean(props.trafficByDayPanel);

  return (
    <section className={CTV_ANALYTICS_CHART_ROOT} aria-labelledby="affiliate-charts-heading">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="affiliate-charts-heading" className={CTV_TYPE_CARD_TITLE}>
            Phân tích trực quan
          </h2>
          <p className={`${CTV_TYPE_BODY} text-xs`}>
            Xu hướng theo ngày · nguồn · campaign · realtime · landing · kỳ {props.rangeLabel}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="flex min-h-[min(42dvh,22rem)] flex-col justify-center py-4 lg:min-h-[min(48dvh,26rem)]">
          <CreatorEmptyState
            icon={Share2}
            title="Chưa có đủ traffic để vẽ biểu đồ"
            hint="Chia sẻ link ref lên TikTok, Facebook hoặc Zalo — sau vài click, biểu đồ sẽ tự điền. Bạn cũng có thể tạo campaign trong tab Campaign."
          />
        </div>
      ) : null}

      {showChartRows ? (
        <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-5 lg:gap-5">
          {!empty ? (
            <>
              <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
                <ChartPairCol>
                  <CreatorSectionShell
                    className={CTV_ANALYTICS_SECTION_SHELL}
                    title="Traffic theo thời gian"
                    hint="Click, đơn trả, conv % — sessions tổng xem thẻ Sessions phía trên."
                  >
                    {props.loadingTimeline ? (
                      <div className="mt-2 h-[12rem] w-full shrink-0 animate-pulse rounded-xl bg-slate-100/90 sm:h-[13rem]" />
                    ) : (
                      <div className="mt-2 w-full min-w-0">
                        <CreatorTrafficLineLazy buckets={props.timelineBuckets} />
                      </div>
                    )}
                  </CreatorSectionShell>
                </ChartPairCol>
                <ChartPairCol>
                  <CreatorSectionShell className={CTV_ANALYTICS_SECTION_SHELL} title="Nguồn traffic" hint="% theo click · đơn · conv">
                    {props.loadingSources ? (
                      <div className="mt-2 h-[11.5rem] w-full shrink-0 animate-pulse rounded-xl bg-slate-100/90" />
                    ) : (
                      <div className="mt-2 w-full min-w-0">
                        <CreatorSourceDonutLazy rows={props.sourcesRows} />
                      </div>
                    )}
                  </CreatorSectionShell>
                </ChartPairCol>
              </div>

              <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
                <ChartPairCol>
                  <CreatorSectionShell className={CTV_ANALYTICS_SECTION_SHELL} title="Campaign mạnh" hint="Top theo tiêu chí sort">
                    <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
                      {(
                        [
                          { k: "revenue" as const, label: "Doanh thu" },
                          { k: "epc" as const, label: "EPC" },
                          { k: "clicks" as const, label: "Click" },
                        ] as const
                      ).map((x) => (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() => setCampaignMetric(x.k)}
                          className={campaignMetric === x.k ? CTV_SEGMENTED_PILL_ITEM_ACTIVE : CTV_SEGMENTED_PILL_ITEM}
                        >
                          {x.label}
                        </button>
                      ))}
                    </div>
                    {props.loadingCampaigns ? (
                      <div className="mt-2 h-[14rem] w-full shrink-0 animate-pulse rounded-xl bg-slate-100/90" />
                    ) : (
                      <div className="mt-2 w-full min-w-0">
                        <CreatorCampaignBarsLazy rows={props.campaignRows} metric={campaignMetric} />
                      </div>
                    )}
                  </CreatorSectionShell>
                </ChartPairCol>
                <ChartPairCol>
                  <CreatorSectionShell
                    className={CTV_ANALYTICS_SECTION_SHELL}
                    title="Realtime"
                    hint="Không rung layout · theo cửa sổ thời gian"
                  >
                    <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
                      {([5, 15, 60] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRtWindow(m)}
                          className={rtWindow === m ? CTV_SEGMENTED_PILL_ITEM_ACTIVE : CTV_SEGMENTED_PILL_ITEM}
                        >
                          {m === 60 ? "1h" : `${m}p`}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 w-full min-w-0">
                      <CreatorRealtimeSparklineLazy history={props.rtHistory} windowMinutes={rtWindow} />
                    </div>
                  </CreatorSectionShell>
                </ChartPairCol>
              </div>
            </>
          ) : null}

          {props.trafficByDayPanel || !empty ? (
            <div className={CTV_ANALYTICS_CHART_PAIR_ROW}>
              {!empty ? (
                <ChartPairCol>
                  <CreatorSectionShell className={CTV_ANALYTICS_SECTION_SHELL} title="Landing & EPC" hint="Theo visits · EPC = HH / click">
                    {props.loadingLanding ? (
                      <div className="mt-2 h-[13rem] w-full shrink-0 animate-pulse rounded-xl bg-slate-100/90" />
                    ) : (
                      <div className="mt-2 w-full min-w-0">
                        <CreatorLandingBarsLazy rows={props.landingRows} />
                      </div>
                    )}
                  </CreatorSectionShell>
                </ChartPairCol>
              ) : null}
              {props.trafficByDayPanel ? (
                <ChartPairCol className={!empty ? undefined : "lg:col-span-2"}>{props.trafficByDayPanel}</ChartPairCol>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
