"use client";

import { clsx } from "clsx";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Gauge,
  Globe2,
  Link2,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TrackingOverviewDto } from "@/lib/affiliate-tracking-center-types";

type AffiliatePixelProvider = TrackingOverviewDto["pixels"][number]["provider"];
type AffiliatePixelConnectionStatus = TrackingOverviewDto["pixels"][number]["status"];
import { CreatorEmptyState, CreatorMetricCard, CreatorSectionShell } from "./affiliate-creator-metric-card";
import {
  CTV_HORIZONTAL_TAB_SCROLL,
  CTV_SEGMENTED_ITEM_ACTIVE,
  CTV_SEGMENTED_ITEM_ICON,
  CTV_TAB_IDLE_HOVER,
} from "./ctv/ctv-ui-tokens";
import {
  CTV_TRACKING_METRIC_GRID,
  CTV_TRACKING_PIXEL_GRID,
  CTV_TRACKING_SECTION_SHELL,
  CTV_TRACKING_TAB_VIEW,
  CTV_TRACKING_WORKSPACE_ROOT,
} from "./affiliate/affiliate-ctv-account-ui-tokens";
import {
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";
import { sanitizeCtvDisplayText } from "./ctv/sanitize-ctv-display-text";
import {
  useAffiliateTrackingHealth,
  useAffiliateTrackingLogs,
  useAffiliateTrackingOverview,
  useAffiliateTrackingRealtime,
} from "./use-affiliate-tracking-hooks";

type SectionKey =
  | "overview"
  | "integrations"
  | "stream"
  | "utm"
  | "links"
  | "health"
  | "logs";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "integrations", label: "Pixel integrations" },
  { key: "stream", label: "Event realtime" },
  { key: "utm", label: "UTM" },
  { key: "links", label: "Tracking links" },
  { key: "health", label: "Health" },
  { key: "logs", label: "API / Webhook logs" },
];

const PROVIDER_LABEL: Record<AffiliatePixelProvider, string> = {
  TIKTOK_PIXEL: "TikTok Pixel",
  META_PIXEL: "Meta (Facebook) Pixel",
  GA4: "Google Analytics 4",
  GTM: "Google Tag Manager",
};

function statusVi(s: AffiliatePixelConnectionStatus): string {
  switch (s) {
    case "CONNECTED":
      return "Đã kết nối";
    case "PENDING":
      return "Đang thiết lập";
    case "ERROR":
      return "Lỗi";
    case "DISCONNECTED":
      return "Chưa kết nối";
    default:
      return "Chưa kết nối";
  }
}

const PixelCard = memo(function PixelCardInner(props: {
  provider: AffiliatePixelProvider;
  status: AffiliatePixelConnectionStatus;
  lastEventAt: string | null;
  healthScore: number | null;
  busy: boolean;
  onSetup: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col rounded-2xl border border-blue-100/90 bg-white p-4 shadow-[0_1px_2px_rgba(37,99,235,0.06)] ring-1 ring-blue-50 sm:p-5 lg:h-auto">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 lg:min-h-[3.5rem] lg:flex-nowrap lg:items-center lg:gap-3 lg:pb-3.5">
        <div className="min-w-0 flex-1 pr-1">
          <h4 className="text-sm font-semibold leading-snug text-slate-900 lg:min-h-[2.5rem] lg:leading-tight">
            {PROVIDER_LABEL[props.provider]}
          </h4>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{statusVi(props.status)}</p>
        </div>
        <span
          className={clsx(
            "shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:self-center",
            props.status === "CONNECTED"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
              : props.status === "PENDING"
                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
          )}
        >
          {props.status}
        </span>
      </div>
      <div className="flex flex-col max-lg:contents lg:mt-3.5">
        <dl className="mt-3 grid shrink-0 gap-2 text-xs text-slate-600 max-lg:flex-1 lg:mt-0 lg:gap-2.5">
          <div className="flex items-baseline justify-between gap-2 lg:min-h-[1.375rem]">
            <dt className="shrink-0 text-slate-600">Sự kiện gần nhất</dt>
            <dd className="min-w-0 text-right font-medium tabular-nums text-slate-800 lg:max-w-[58%] lg:truncate">
              {props.lastEventAt ? new Date(props.lastEventAt).toLocaleString("vi-VN") : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 lg:min-h-[1.375rem]">
            <dt className="shrink-0 text-slate-600">Health score</dt>
            <dd className="text-right font-medium tabular-nums text-slate-800">
              {props.healthScore != null ? `${props.healthScore}/100` : "—"}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          disabled={props.busy}
          onClick={props.onSetup}
          className={clsx(
            AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
            "mt-4 w-full shrink-0 py-2 text-xs lg:mt-5",
          )}
        >
          {props.status === "CONNECTED" ? "Cập nhật / kiểm tra" : "Bắt đầu thiết lập"}
        </button>
      </div>
    </div>
  );
});

export default function AffiliateTrackingWorkspace(): JSX.Element {
  const [section, setSection] = useState<SectionKey>("overview");
  const [busyProvider, setBusyProvider] = useState<AffiliatePixelProvider | null>(null);
  const trackingTabScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = trackingTabScrollRef.current;
    if (!scroller) return;
    const activeBtn = scroller.querySelector<HTMLButtonElement>(`[data-tracking-tab="${section}"]`);
    activeBtn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [section]);

  const ov = useAffiliateTrackingOverview(true);
  const rt = useAffiliateTrackingRealtime(section === "overview" || section === "stream");
  const hl = useAffiliateTrackingHealth(section === "health" || section === "overview");
  const lg = useAffiliateTrackingLogs(section === "logs");

  const setupPixel = useCallback(
    async (provider: AffiliatePixelProvider) => {
      setBusyProvider(provider);
      try {
        const res = await fetch("/api/account/affiliate/tracking/integrations", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, status: "PENDING" }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          window.alert(j?.message ?? "Không lưu được. Thử lại sau.");
          return;
        }
        ov.refetch();
      } finally {
        setBusyProvider(null);
      }
    },
    [ov],
  );

  const emptyOnboarding = useMemo(() => {
    if (!ov.data) return false;
    const m = ov.data.metrics;
    const allDisc = ov.data.pixels.every((p) => p.status === "DISCONNECTED");
    return allDisc && m.eventsToday === 0 && m.activePixels === 0;
  }, [ov.data]);

  return (
    <div className={CTV_TRACKING_WORKSPACE_ROOT}>
      <div
        ref={trackingTabScrollRef}
        role="tablist"
        aria-label="Chức năng tracking"
        className={clsx(CTV_HORIZONTAL_TAB_SCROLL, "shrink-0")}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={section === s.key}
            data-tracking-tab={s.key}
            onClick={() => setSection(s.key)}
            className={
              section === s.key
                ? clsx(CTV_SEGMENTED_ITEM_ICON, CTV_SEGMENTED_ITEM_ACTIVE, "ring-blue-300/50")
                : clsx(CTV_SEGMENTED_ITEM_ICON, CTV_TAB_IDLE_HOVER)
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={CTV_TRACKING_TAB_VIEW}>
      {emptyOnboarding ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="Chưa có luồng tracking đo được"
          hint="Phase 1 — nền tảng sẵn sàng, cần gắn pixel & phát sự kiện"
        >
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
            <div className="flex max-lg:flex-1 flex-col justify-center lg:flex-none">
              <CreatorEmptyState
                icon={Radio}
                title="Tracking center"
                hint="Kết nối pixel và bật conversion API để Zendo ghi nhận đầy đủ hành trình khách — thống kê và AI analytics dùng chính dữ liệu này."
              />
            </div>
            <div className="flex max-lg:flex-1 flex-col gap-3 rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 p-4 text-sm text-slate-700 lg:flex-none">
              <p className="font-semibold text-slate-900">Checklist nhanh</p>
              <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>Kết nối TikTok Pixel hoặc Meta Pixel</li>
                <li>Bật GA4 / GTM để chuẩn hóa page_view & conversion</li>
                <li>Gửi event qua POST /api/affiliate/tracking/event (hoặc /api/affiliate/track)</li>
                <li>Tạo tracking link đầu tiên (tab Link / Campaign)</li>
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY} onClick={() => void setupPixel("TIKTOK_PIXEL")}>
                  Đánh dấu TikTok Pixel (pending)
                </button>
                <Link href="/tai-khoan/affiliate/analytics?tab=links" className={AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY}>
                  Mở Tracking links
                </Link>
              </div>
            </div>
          </div>
        </CreatorSectionShell>
      ) : null}

      {section === "overview" ? (
        <div className={CTV_TRACKING_METRIC_GRID}>
          <CreatorMetricCard
            icon={Zap}
            label="Active pixels"
            value={ov.data ? `${ov.data.metrics.activePixels}` : "—"}
            loading={ov.loading && !ov.data}
            tone="blue"
          />
          <CreatorMetricCard
            icon={Activity}
            label="Events hôm nay"
            value={ov.data ? `${ov.data.metrics.eventsToday}` : "—"}
            loading={ov.loading && !ov.data}
          />
          <CreatorMetricCard
            icon={BarChart3}
            label="Conversion tracked"
            value={ov.data ? `${ov.data.metrics.conversionsToday}` : "—"}
            loading={ov.loading && !ov.data}
            tone="emerald"
          />
          <CreatorMetricCard
            icon={Gauge}
            label="Tracking accuracy"
            value={ov.data ? `${ov.data.metrics.trackingAccuracyPct}%` : "—"}
            loading={ov.loading && !ov.data}
            tone="amber"
          />
          <CreatorMetricCard
            icon={ShieldCheck}
            label="Chưa gán ref"
            value={ov.data ? `${ov.data.metrics.missingAttribution}` : "—"}
            loading={ov.loading && !ov.data}
            tone="slate"
          />
          <CreatorMetricCard
            icon={Globe2}
            label="Realtime sessions (15p)"
            value={ov.data ? `${ov.data.metrics.realtimeSessions}` : "—"}
            loading={ov.loading && !ov.data}
          />
          <CreatorMetricCard
            icon={Link2}
            label="Khớp click → đơn"
            value={ov.data ? `${ov.data.metrics.clickToOrderMatchPct}%` : "—"}
            loading={ov.loading && !ov.data}
            tone="fuchsia"
          />
          <CreatorMetricCard
            icon={Sparkles}
            label="Pixel health (avg)"
            value={ov.data?.metrics.pixelHealthScore != null ? `${ov.data.metrics.pixelHealthScore}` : "—"}
            loading={ov.loading && !ov.data}
            tone="blue"
          />
        </div>
      ) : null}

      {section === "integrations" ? (
        ov.loading && !ov.data ? (
          <p className="shrink-0 text-sm text-slate-500">Đang tải integrations…</p>
        ) : ov.data ? (
          <div className={CTV_TRACKING_PIXEL_GRID}>
            {ov.data.pixels.map((p) => (
              <PixelCard
                key={p.provider}
                provider={p.provider}
                status={p.status}
                lastEventAt={p.lastEventAt}
                healthScore={p.healthScore}
                busy={busyProvider === p.provider}
                onSetup={() => void setupPixel(p.provider)}
              />
            ))}
          </div>
        ) : (
          <p className="shrink-0 text-sm text-rose-600">{ov.error ?? "Không tải được dữ liệu pixel."}</p>
        )
      ) : null}

      {section === "stream" ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="Luồng sự kiện realtime"
          hint="Làm mới ~22s · tối đa 30 dòng gần nhất"
        >
          {rt.loading && !rt.events.length ? (
            <p className="mt-4 text-sm text-slate-500">Đang tải…</p>
          ) : rt.error ? (
            <p className="mt-4 text-sm text-rose-600">{rt.error}</p>
          ) : (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Thời gian</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Session</th>
                    <th className="px-3 py-2">Path</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rt.events.map((e) => (
                    <tr key={e.id} className="bg-white">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                        {new Date(e.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{sanitizeCtvDisplayText(e.eventType)}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs text-slate-600">{e.sessionId ?? "—"}</td>
                      <td className="max-w-[14rem] truncate px-3 py-2 text-slate-700">{e.pathname ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{e.device ?? "—"}</td>
                      <td className="max-w-[6rem] truncate px-3 py-2 font-mono text-xs">{e.orderId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rt.generatedAt ? (
            <p className="mt-2 text-[11px] text-slate-400">Cập nhật snapshot: {new Date(rt.generatedAt).toLocaleTimeString("vi-VN")}</p>
          ) : null}
        </CreatorSectionShell>
      ) : null}

      {section === "utm" ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="UTM tracking"
          hint="Chuẩn hóa utm_source / subid trên mọi event"
        >
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Payload ingest đã hỗ trợ <code className="rounded bg-slate-100 px-1 font-mono text-xs">utm_source</code> và{" "}
            <code className="rounded bg-slate-100 px-1 font-mono text-xs">subid</code>. Bảng phân tích UTM chi tiết nằm ở tab{" "}
            <Link href="/tai-khoan/affiliate/analytics?tab=insights" className="font-semibold text-blue-700 underline">
              Phân tích traffic
            </Link>
            .
          </p>
        </CreatorSectionShell>
      ) : null}

      {section === "links" ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="Tracking links"
          hint="Short link /go + campaign"
        >
          <p className="mt-4 text-sm text-slate-600">
            Quản lý slug, campaign và hiệu suất từng link trong tab{" "}
            <Link className="font-semibold text-blue-700 underline" href="/tai-khoan/affiliate/campaign">
              Campaign
            </Link>{" "}
            và API short-links.
          </p>
        </CreatorSectionShell>
      ) : null}

      {section === "health" ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="Tracking health"
          hint="Pixel + ingest + session freshness"
        >
          {hl.loading && !hl.data ? (
            <p className="mt-4 text-sm text-slate-500">Đang tải…</p>
          ) : hl.error ? (
            <p className="mt-4 text-sm text-rose-600">{hl.error}</p>
          ) : hl.data ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>
                Ingest lỗi (60 phút): <span className="font-semibold">{hl.data.ingestErrors1h}</span>
              </li>
              <li>
                Session stale (&gt;60 phút): <span className="font-semibold">{hl.data.sessionsStaleRatio}%</span> (ước lượng)
              </li>
            </ul>
          ) : null}
        </CreatorSectionShell>
      ) : null}

      {section === "logs" ? (
        <CreatorSectionShell
          className={CTV_TRACKING_SECTION_SHELL}
          title="API / Webhook logs"
          hint="Audit ingest — pagination phase sau"
        >
          {lg.loading ? (
            <p className="mt-4 text-sm text-slate-500">Đang tải…</p>
          ) : lg.error ? (
            <p className="mt-4 text-sm text-rose-600">{lg.error}</p>
          ) : lg.rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Chưa có log ingest.</p>
          ) : (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Thời gian</th>
                    <th className="px-3 py-2">Route</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">HTTP</th>
                    <th className="px-3 py-2">OK</th>
                    <th className="px-3 py-2">ms</th>
                    <th className="px-3 py-2">B</th>
                    <th className="px-3 py-2">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lg.rows.map((r) => (
                    <tr key={r.id} className="bg-white">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                        {new Date(r.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2 font-mono text-xs">{r.route}</td>
                      <td className="px-3 py-2 text-xs">{r.eventType ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{r.statusCode}</td>
                      <td className="px-3 py-2">{r.success ? "✓" : "✗"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs text-slate-600">{r.latencyMs ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs text-slate-600">{r.payloadBytes ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs text-slate-600">{r.eventCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CreatorSectionShell>
      ) : null}
      </div>
    </div>
  );
}
