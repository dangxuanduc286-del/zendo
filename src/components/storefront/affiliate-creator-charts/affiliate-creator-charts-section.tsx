"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useState } from "react";
import { Megaphone, Share2, Sparkles } from "lucide-react";
import {
  AFFILIATE_ANALYTICS_SEGMENT_PILL_ACTIVE,
  AFFILIATE_ANALYTICS_SEGMENT_PILL_INACTIVE,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";
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
};

export default function AffiliateCreatorChartsSection(props: Props): JSX.Element {
  const [campaignMetric, setCampaignMetric] = useState<"revenue" | "epc" | "clicks">("revenue");
  const [rtWindow, setRtWindow] = useState<5 | 15 | 60>(15);

  const hasAny =
    props.timelineBuckets.length > 0 ||
    props.sourcesRows.some((r) => r.clicks > 0) ||
    props.campaignRows.length > 0 ||
    props.landingRows.length > 0;

  const empty = !props.loadingTimeline && !props.loadingSources && !props.loadingCampaigns && !props.loadingLanding && !hasAny;

  return (
    <div className="flex w-full max-w-none flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Phân tích trực quan</h3>
            <p className="text-[10px] text-slate-500">
              Xu hướng theo ngày · nguồn · campaign · realtime · landing · kỳ {props.rangeLabel}
            </p>
          </div>
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

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:snap-none lg:grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] lg:gap-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[min(100%,20rem)] shrink-0 snap-start sm:min-w-[22rem] lg:min-w-0">
          <CreatorSectionShell
            title="Traffic theo thời gian"
            hint="Click, đơn trả, conv % — sessions tổng xem thẻ Sessions phía trên."
          >
            {props.loadingTimeline ? (
              <div className="mt-2 h-[12rem] animate-pulse rounded-xl bg-slate-100/90" />
            ) : (
              <CreatorTrafficLineLazy buckets={props.timelineBuckets} />
            )}
          </CreatorSectionShell>
        </div>
        <div className="min-w-[min(100%,18rem)] shrink-0 snap-start sm:min-w-[20rem] lg:min-w-0">
          <CreatorSectionShell title="Nguồn traffic" hint="% theo click · đơn · conv">
            {props.loadingSources ? (
              <div className="mt-2 h-[11.5rem] animate-pulse rounded-xl bg-slate-100/90" />
            ) : (
              <CreatorSourceDonutLazy rows={props.sourcesRows} />
            )}
          </CreatorSectionShell>
        </div>
        <div className="min-w-[min(100%,20rem)] shrink-0 snap-start sm:min-w-[22rem] lg:col-span-2 lg:min-w-0">
          <CreatorSectionShell title="Campaign mạnh" hint="Top theo tiêu chí sort">
            <div className="mt-2 flex flex-wrap gap-1.5">
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
                  className={campaignMetric === x.k ? AFFILIATE_ANALYTICS_SEGMENT_PILL_ACTIVE : AFFILIATE_ANALYTICS_SEGMENT_PILL_INACTIVE}
                >
                  {x.label}
                </button>
              ))}
            </div>
            {props.loadingCampaigns ? (
              <div className="mt-2 h-[14rem] animate-pulse rounded-xl bg-slate-100/90" />
            ) : (
              <div className="mt-2">
                <CreatorCampaignBarsLazy rows={props.campaignRows} metric={campaignMetric} />
              </div>
            )}
          </CreatorSectionShell>
        </div>
        <div className="min-w-[min(100%,18rem)] shrink-0 snap-start sm:min-w-[20rem] lg:min-w-0">
          <CreatorSectionShell title="Realtime" hint="Không rung layout · theo cửa sổ thời gian">
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([5, 15, 60] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRtWindow(m)}
                  className={rtWindow === m ? AFFILIATE_ANALYTICS_SEGMENT_PILL_ACTIVE : AFFILIATE_ANALYTICS_SEGMENT_PILL_INACTIVE}
                >
                  {m === 60 ? "1h" : `${m}p`}
                </button>
              ))}
            </div>
            <div className="mt-2 min-h-[7.5rem]">
              <CreatorRealtimeSparklineLazy history={props.rtHistory} windowMinutes={rtWindow} />
            </div>
          </CreatorSectionShell>
        </div>
        <div className="min-w-[min(100%,20rem)] shrink-0 snap-start sm:min-w-[22rem] lg:col-span-2 lg:min-w-0">
          <CreatorSectionShell title="Landing & EPC" hint="Theo visits · EPC = HH / click">
            {props.loadingLanding ? (
              <div className="mt-2 h-[13rem] animate-pulse rounded-xl bg-slate-100/90" />
            ) : (
              <CreatorLandingBarsLazy rows={props.landingRows} />
            )}
          </CreatorSectionShell>
        </div>
      </div>

      {!empty ? (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
          <Link
            href="/tai-khoan?tab=affiliate"
            className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY, "gap-1.5 px-3 py-1.5 text-xs")}
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Chia sẻ link ref
          </Link>
          <Link
            href="/tai-khoan/affiliate/analytics?tab=campaign"
            prefetch={false}
            className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY, "gap-1.5 px-3 py-1.5 text-xs")}
          >
            <Megaphone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Tạo campaign
          </Link>
        </div>
      ) : null}
    </div>
  );
}
