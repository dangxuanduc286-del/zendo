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
import { memo, useCallback, useMemo, useState } from "react";
import type { TrackingOverviewDto } from "@/lib/affiliate-tracking-center-types";

type AffiliatePixelProvider = TrackingOverviewDto["pixels"][number]["provider"];
type AffiliatePixelConnectionStatus = TrackingOverviewDto["pixels"][number]["status"];
import { CreatorEmptyState, CreatorMetricCard, CreatorSectionShell } from "./affiliate-creator-metric-card";
import {
  AFFILIATE_ANALYTICS_SUBTAB_ACTIVE,
  AFFILIATE_ANALYTICS_SUBTAB_INACTIVE,
  AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY,
} from "@/lib/affiliate-analytics-ui-tokens";
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
  | "attribution"
  | "utm"
  | "links"
  | "health"
  | "logs";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "integrations", label: "Pixel integrations" },
  { key: "stream", label: "Event realtime" },
  { key: "attribution", label: "Attribution" },
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
    <div className="rounded-2xl border border-blue-100/90 bg-white p-4 shadow-[0_1px_2px_rgba(37,99,235,0.06)] ring-1 ring-blue-50 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{PROVIDER_LABEL[props.provider]}</h4>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{statusVi(props.status)}</p>
        </div>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
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
      <dl className="mt-3 grid gap-2 text-xs text-slate-600">
        <div className="flex justify-between gap-2">
          <dt>Sự kiện gần nhất</dt>
          <dd className="font-medium text-slate-800">{props.lastEventAt ? new Date(props.lastEventAt).toLocaleString("vi-VN") : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Health score</dt>
          <dd className="font-medium text-slate-800">{props.healthScore != null ? `${props.healthScore}/100` : "—"}</dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={props.busy}
        onClick={props.onSetup}
        className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_SECONDARY, "mt-4 w-full py-2 text-xs")}
      >
        {props.status === "CONNECTED" ? "Cập nhật / kiểm tra" : "Bắt đầu thiết lập"}
      </button>
    </div>
  );
});

export default function AffiliateTrackingWorkspace(): JSX.Element {
  const [section, setSection] = useState<SectionKey>("overview");
  const [busyProvider, setBusyProvider] = useState<AffiliatePixelProvider | null>(null);

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
    <div className="flex w-full flex-col gap-5 sm:gap-6">
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className={clsx(
            AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
            "w-max min-w-full flex-nowrap lg:w-full lg:min-w-0 lg:flex-wrap",
          )}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={section === s.key ? AFFILIATE_ANALYTICS_SUBTAB_ACTIVE : AFFILIATE_ANALYTICS_SUBTAB_INACTIVE}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {emptyOnboarding ? (
        <CreatorSectionShell title="Chưa có luồng tracking đo được" hint="Phase 1 — nền tảng sẵn sàng, cần gắn pixel & phát sự kiện">
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
            <div className="flex flex-1 flex-col justify-center">
              <CreatorEmptyState
                icon={Radio}
                title="Tracking center"
                hint="Kết nối pixel và bật conversion API để Zendo ghi nhận đầy đủ hành trình khách — attribution và AI analytics sẽ dùng chính dữ liệu này."
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 p-4 text-sm text-slate-700">
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
        <div className="grid w-full min-w-0 auto-rows-fr items-stretch grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] lg:gap-4 [&>*]:min-h-0 [&>*]:min-w-0">
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
            label="Missing attribution"
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
            label="Click → Order match"
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
          <p className="text-sm text-slate-500">Đang tải integrations…</p>
        ) : ov.data ? (
          <>
            <div className="grid w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <CreatorSectionShell
              title="Server-side conversion (CAPI)"
              hint="Sau attribution MATCHED — TikTok CompletePayment & Meta Purchase. Token: JSON pixel config (tiktokAccessToken / metaAccessToken). Tắt: AFFILIATE_CAPI_DISPATCH=0."
            >
              <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="font-semibold text-slate-900">24h — tất cả provider</p>
                  <ul className="mt-2 space-y-1">
                    <li>Queued: {ov.data.conversionDispatch.jobs24h.queued}</li>
                    <li>Sent: {ov.data.conversionDispatch.jobs24h.sent}</li>
                    <li>Failed: {ov.data.conversionDispatch.jobs24h.failed}</li>
                    <li>DLQ: {ov.data.conversionDispatch.jobs24h.dlq}</li>
                    <li>Skipped: {ov.data.conversionDispatch.jobs24h.skipped}</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="font-semibold text-slate-900">Theo nền tảng</p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      TikTok — sent {ov.data.conversionDispatch.byProvider.TIKTOK.sent}, fail{" "}
                      {ov.data.conversionDispatch.byProvider.TIKTOK.failed}
                    </li>
                    <li>
                      Meta — sent {ov.data.conversionDispatch.byProvider.META.sent}, fail {ov.data.conversionDispatch.byProvider.META.failed}
                    </li>
                    <li>
                      Latency TB (sent):{" "}
                      {ov.data.conversionDispatch.avgLatencySentMs != null
                        ? `${ov.data.conversionDispatch.avgLatencySentMs} ms`
                        : "—"}
                    </li>
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Replay job DLQ/FAILED:{" "}
                    <span className="font-mono">POST /api/account/affiliate/conversion-dispatch/replay</span>
                  </p>
                </div>
              </div>
            </CreatorSectionShell>
          </>
        ) : (
          <p className="text-sm text-rose-600">{ov.error ?? "Không tải được dữ liệu pixel."}</p>
        )
      ) : null}

      {section === "stream" ? (
        <CreatorSectionShell title="Luồng sự kiện realtime" hint="Làm mới ~22s · tối đa 30 dòng gần nhất">
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
                      <td className="px-3 py-2 font-medium text-slate-900">{e.eventType}</td>
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

      {section === "attribution" ? (
        <CreatorSectionShell title="Conversion attribution" hint="Phase 1 — hiển thị luật last-click từ Order + TrafficEvent">
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Đơn affiliate gắn <span className="font-semibold text-slate-900">affiliateProfileId</span> và session tracking. Phase tiếp theo:
            multi-touch, window attribution, và export cho đối soát TikTok / Meta.
          </p>
        </CreatorSectionShell>
      ) : null}

      {section === "utm" ? (
        <CreatorSectionShell title="UTM tracking" hint="Chuẩn hóa utm_source / subid trên mọi event">
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
        <CreatorSectionShell title="Tracking links" hint="Short link /go + campaign">
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
        <CreatorSectionShell title="Tracking health" hint="Pixel + ingest + session freshness">
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
        <CreatorSectionShell title="API / Webhook logs" hint="Audit ingest — pagination phase sau">
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

      <CreatorSectionShell title="API công khai (ingest)" hint="Dùng từ storefront / server partner">
        <ul className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed text-slate-700">
          <li>POST /api/affiliate/tracking/event — alias ingest (cùng schema /api/affiliate/track)</li>
          <li>POST /api/affiliate/tracking/session — cookie session analytics</li>
          <li>GET /api/account/affiliate/tracking/overview | realtime | health | logs</li>
          <li>POST /api/account/affiliate/conversion-dispatch/replay — replay CAPI job (FAILED/DLQ)</li>
        </ul>
      </CreatorSectionShell>
    </div>
  );
}
