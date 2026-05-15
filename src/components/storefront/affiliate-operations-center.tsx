"use client";

import { clsx } from "clsx";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  Globe2,
  Layers,
  Radio,
  Server,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AffiliateRealtimeActivityClient } from "@/components/storefront/use-affiliate-analytics-hooks";
import CreatorRealtimeSparklineLazy from "@/components/storefront/affiliate-creator-charts/creator-realtime-sparkline-lazy";
import type { RtPoint } from "@/components/storefront/affiliate-creator-charts/creator-realtime-sparkline-inner";
import type { AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";
import type { OpsAlertV1, OpsRollingCounts } from "@/lib/affiliate-ops-anomaly-types";

const ACK_KEY = "affiliate_ops_alert_ack_v1";
const SNOOZE_KEY = "affiliate_ops_alert_snooze_v1";
const SNOOZE_MS = 8 * 60 * 1000;

function readAckSet(): Set<string> {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeAckSet(ids: Set<string>): void {
  localStorage.setItem(ACK_KEY, JSON.stringify([...ids]));
}

function readSnoozeMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const o = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeSnoozeMap(m: Record<string, number>): void {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(m));
}

type OpsSnapshot = {
  ok: true;
  redis: { ok: boolean; ms: number };
  bullMqEnabled: boolean;
  trackingQueues: {
    ingest: { waiting: number; active: number; failed: number } | null;
    attribution: { waiting: number; active: number; failed: number } | null;
    realtime: { waiting: number; active: number; failed: number } | null;
  } | null;
  conversionDispatchQueue?: { waiting: number; active: number; failed: number } | null;
  capiJobs24h?: Record<string, number>;
  fraudOpenCases24h?: number;
  sse: { activeConnections: number; reconnectHintsTotal: number };
  dlq24h: number;
  dlq1h?: number;
  ingestLatencyP50Ms: number | null;
  ingestLatencyP90Ms?: number | null;
  rolling?: OpsRollingCounts;
  alerts?: OpsAlertV1[];
  alertsSuppressedCount?: number;
};

type SourceRow = { source: string; clicks: number; visitors: number; orders: number; revenue: number; commission: number };
type CampaignRow = { id: string; name: string; clicks: number; revenue: number; commission: number; epc: number; conversion: number };
type DeviceRow = { device: string; visitors: number; orders: number; clicks: number; conversionRate: number };

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function tickToFeedLine(t: AffiliateTrackingStreamTickV1): { id: string; label: string; sub: string; tone: "blue" | "emerald" | "amber" | "violet" } {
  const ch = t.channel;
  if (ch === "tracking.converted") {
    return { id: `${ch}-${t.ts}`, label: "Chuyển đổi", sub: "Đơn thanh toán (ẩn mã)", tone: "emerald" };
  }
  if (ch === "tracking.attributed") {
    return { id: `${ch}-${t.ts}`, label: "Attribution", sub: "Cập nhật touch chain", tone: "violet" };
  }
  if (ch === "tracking.attribution_resolved") {
    return { id: `${ch}-${t.ts}`, label: "Attribution engine", sub: "Conversion match + touch chain", tone: "violet" };
  }
  if (ch === "tracking.conversion_dispatch") {
    const ev = t.trafficEventType ?? "CAPI";
    return {
      id: `${ch}-${t.ts}`,
      label: "CAPI dispatch",
      sub: `${ev}${t.pathname ? ` · ${t.pathname}` : ""}`,
      tone: "amber",
    };
  }
  if (ch === "fraud.alert") {
    const ev = t.trafficEventType ?? "FRAUD";
    return { id: `${ch}-${t.ts}`, label: "Fraud alert", sub: `${ev}${t.pathname ? ` · ${t.pathname}` : ""}`, tone: "amber" };
  }
  if (ch === "tracking.received") {
    return { id: `${ch}-${t.ts}`, label: "Pipeline", sub: "Tracking đã nhận", tone: "blue" };
  }
  const path = t.pathname?.trim() || "Trang";
  const ev = t.trafficEventType ?? "EVENT";
  return { id: `${ch}-${t.ts}-${path.slice(0, 24)}`, label: ev.replace(/_/g, " "), sub: path, tone: "blue" };
}

const KpiPill = memo(function KpiPill(props: {
  label: string;
  value: string;
  hint?: string;
  pulse?: boolean;
  accent?: "cyan" | "emerald" | "amber" | "fuchsia" | "slate";
}): JSX.Element {
  const accentSurface: Record<NonNullable<typeof props.accent>, string> = {
    cyan: "border-cyan-200/90 bg-cyan-50/80",
    emerald: "border-emerald-200/90 bg-emerald-50/80",
    amber: "border-amber-200/90 bg-amber-50/80",
    fuchsia: "border-violet-200/90 bg-violet-50/80",
    slate: "border-slate-200/90 bg-white",
  };
  const surf = accentSurface[props.accent ?? "slate"];
  return (
    <div
      title={props.hint}
      className={clsx(
        "min-w-0 rounded-xl border px-3 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-3.5 sm:py-2.5",
        surf,
        props.pulse && "motion-safe:animate-pulse motion-reduce:animate-none",
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900 sm:text-base">{props.value}</p>
    </div>
  );
});

export default function AffiliateOperationsCenter(props: {
  enabled: boolean;
  activity: AffiliateRealtimeActivityClient | null;
  overviewEpc: number;
  sseLive: boolean;
  sseStatus: string;
  streamTicks: AffiliateTrackingStreamTickV1[];
  sourcesRows: SourceRow[];
  campaignRows: CampaignRow[];
  deviceRows: DeviceRow[];
  rtHistory: RtPoint[];
}): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [snapErr, setSnapErr] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [sparkWindow, setSparkWindow] = useState<5 | 15 | 60>(5);
  const tickStampsRef = useRef<number[]>([]);
  const [burst, setBurst] = useState(0);
  const [ackTick, setAckTick] = useState(0);

  const onAckAlert = useCallback((id: string) => {
    const s = readAckSet();
    s.add(id);
    writeAckSet(s);
    setAckTick((n) => n + 1);
  }, []);

  const onSnoozeAlert = useCallback((id: string) => {
    const m = { ...readSnoozeMap(), [id]: Date.now() + SNOOZE_MS };
    writeSnoozeMap(m);
    setAckTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const q = () => setCompact(window.matchMedia("(max-width: 767px)").matches);
    q();
    window.addEventListener("resize", q);
    return () => window.removeEventListener("resize", q);
  }, []);

  const pollSnapshot = useCallback(async () => {
    if (!props.enabled) return;
    try {
      const res = await fetch("/api/account/affiliate/operations/snapshot", { credentials: "same-origin", cache: "no-store" });
      const j = (await res.json()) as OpsSnapshot & { ok?: boolean; message?: string };
      if (!res.ok || j.ok !== true) throw new Error((j as { message?: string }).message ?? "snapshot");
      setSnapshot(j);
      setSnapErr(null);
    } catch {
      setSnapErr("Không tải health");
    }
  }, [props.enabled]);

  useEffect(() => {
    if (!props.enabled) return;
    void pollSnapshot();
    const id = window.setInterval(() => void pollSnapshot(), 45_000);
    return () => window.clearInterval(id);
  }, [props.enabled, pollSnapshot]);

  useEffect(() => {
    const now = Date.now();
    tickStampsRef.current = [...tickStampsRef.current, ...props.streamTicks.map(() => now)].slice(-80);
    const recent = tickStampsRef.current.filter((t) => now - t < 2000);
    setBurst(recent.length);
  }, [props.streamTicks]);

  const [visibleServerAlerts, setVisibleServerAlerts] = useState<OpsAlertV1[]>([]);

  useEffect(() => {
    const list = snapshot?.alerts ?? [];
    try {
      const ack = readAckSet();
      const snooze = readSnoozeMap();
      const now = Date.now();
      setVisibleServerAlerts(list.filter((a) => !ack.has(a.id) && !(snooze[a.id] && now < snooze[a.id])));
    } catch {
      setVisibleServerAlerts(list);
    }
  }, [snapshot, ackTick]);

  const clientAlerts = useMemo((): OpsAlertV1[] => {
    const out: OpsAlertV1[] = [];
    if (burst >= 6) {
      out.push({
        id: "client:burst_ui",
        severity: "info",
        group: "traffic",
        title: "Burst UI",
        detail: "Nhiều tick SSE trong 2s — đang gom batch.",
        ts: Date.now(),
        score: 20,
      });
    }
    if (props.sseStatus === "error") {
      out.push({
        id: "client:sse_fallback",
        severity: "info",
        group: "infra",
        title: "SSE fallback",
        detail: "Đang dùng polling.",
        ts: Date.now(),
        score: 15,
      });
    }
    return out;
  }, [burst, props.sseStatus]);

  const allVisibleAlerts = useMemo(() => [...visibleServerAlerts, ...clientAlerts], [visibleServerAlerts, clientAlerts]);

  const groupedAlerts = useMemo(() => {
    const g: Partial<Record<OpsAlertV1["group"], OpsAlertV1[]>> = {};
    for (const a of allVisibleAlerts) {
      const k = a.group;
      g[k] = g[k] ?? [];
      g[k]!.push(a);
    }
    return g;
  }, [allVisibleAlerts]);

  const alertStats = useMemo(() => {
    const c = allVisibleAlerts.filter((a) => a.severity === "critical").length;
    const w = allVisibleAlerts.filter((a) => a.severity === "warning").length;
    const i = allVisibleAlerts.filter((a) => a.severity === "info").length;
    return { c, w, i, n: allVisibleAlerts.length };
  }, [allVisibleAlerts]);

  const feedLines = useMemo(() => {
    const sev = (s: OpsAlertV1["severity"]) => (s === "critical" ? 0 : s === "warning" ? 1 : 2);
    const alertFeed = [...allVisibleAlerts]
      .sort((a, b) => sev(a.severity) - sev(b.severity) || (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3)
      .map((a) => ({
        id: `alert-feed-${a.id}`,
        label: a.title,
        sub: a.detail,
        tone: (a.severity === "critical" || a.severity === "warning" ? "amber" : "violet") as "blue" | "emerald" | "amber" | "violet",
      }));
    const fromTicks = props.streamTicks.slice(0, 24).map(tickToFeedLine);
    const fromActivity = (props.activity?.recentClicks ?? []).slice(0, 8).map((c) => ({
      id: `c-${c.id}`,
      label: "Click",
      sub: c.pathname || "Trang",
      tone: "blue" as const,
    }));
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string; sub: string; tone: "blue" | "emerald" | "amber" | "violet" }> = [];
    for (const row of [...alertFeed, ...fromTicks, ...fromActivity]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= (compact ? 10 : 16)) break;
    }
    return out;
  }, [props.streamTicks, props.activity?.recentClicks, compact, allVisibleAlerts]);

  const groupLabel: Record<string, string> = {
    traffic: "Traffic",
    conversion: "Chuyển đổi",
    infra: "Hạ tầng",
    pixel: "Pixel",
    fraud: "Gian lận / bot",
    queue: "Queue",
  };

  const groupKeys: OpsAlertV1["group"][] = ["queue", "infra", "fraud", "conversion", "pixel", "traffic"];

  const rt = props.activity?.realtime;
  const online = props.activity?.activeVisitors ?? 0;
  const clicks5 = rt?.clicksLast5m ?? 0;
  const conv5 = rt?.conversionsLast5m ?? 0;
  const rev5 = rt?.revenueLast5m ?? 0;
  const clicksPerMin = clicks5 / 5;
  const convPerMin = conv5 / 5;
  const epcLive = clicks5 > 0 ? rev5 / clicks5 : props.overviewEpc;

  const maxSource = useMemo(() => {
    const rows = props.sourcesRows;
    if (!rows.length) return 1;
    return Math.max(1, ...rows.map((r) => r.clicks + r.visitors));
  }, [props.sourcesRows]);

  const maxCamp = useMemo(() => {
    const rows = props.campaignRows;
    if (!rows.length) return 1;
    return Math.max(1, ...rows.map((r) => r.clicks));
  }, [props.campaignRows]);

  const maxDev = useMemo(() => {
    const rows = props.deviceRows;
    if (!rows.length) return 1;
    return Math.max(1, ...rows.map((r) => r.clicks + r.visitors));
  }, [props.deviceRows]);

  if (!props.enabled) return null;

  return (
    <section
      aria-label="Live operations center"
      className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm ring-1 ring-emerald-200/70">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Live Operations</p>
            <p className="truncate text-[11px] text-slate-500">Luồng realtime · workspace hiện đại</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              props.sseLive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600",
            )}
          >
            <Radio className="h-3 w-3 shrink-0" aria-hidden />
            {props.sseLive ? "SSE live" : props.sseStatus === "connecting" ? "SSE…" : "Polling"}
          </span>
          <span
            className={clsx(
              "relative inline-flex h-8 w-8 items-center justify-center rounded-full border",
              burst >= 4
                ? "border-amber-200 bg-amber-50 text-amber-700 motion-safe:animate-pulse motion-reduce:animate-none"
                : "border-slate-200 bg-slate-50 text-slate-500",
            )}
            title="Mật độ sự kiện stream (2s)"
          >
            <Zap className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>

      <div
        className={clsx(
          "sticky z-20 border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-sm sm:px-3",
          "top-14 lg:top-0",
        )}
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5">
          <KpiPill label="Online" value={`${online}`} accent="cyan" pulse={Boolean(rt && props.sseLive)} hint="Ước lượng visitor đang hoạt động" />
          <KpiPill
            label="Click / phút"
            value={clicksPerMin < 10 ? clicksPerMin.toFixed(1) : Math.round(clicksPerMin).toLocaleString("vi-VN")}
            accent="slate"
            hint={
              snapshot?.rolling?.source === "redis"
                ? "Rolling Redis (phút) — ingest worker"
                : "Rolling Prisma aggregate (fallback)"
            }
          />
          <KpiPill
            label="Chuyển đổi / phút"
            value={convPerMin < 10 ? convPerMin.toFixed(2) : convPerMin.toFixed(1)}
            accent="emerald"
            hint="Rolling 5 phút"
          />
          <KpiPill label="Doanh thu 5m" value={fmtVnd(rev5)} accent="fuchsia" />
          <KpiPill label="EPC live" value={fmtVnd(epcLive)} accent="amber" hint="Doanh thu 5m / click 5m hoặc EPC tổng quan" />
        </div>
        {alertStats.n > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
            {alertStats.c > 0 ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                Critical {alertStats.c}
              </span>
            ) : null}
            {alertStats.w > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Warning {alertStats.w}
              </span>
            ) : null}
            {alertStats.i > 0 ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                Info {alertStats.i}
              </span>
            ) : null}
            <span className="text-[10px] text-slate-400">Smart alerts · ack/snooze local</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Activity feed</p>
            <span className="text-[10px] text-slate-400">{feedLines.length} dòng</span>
          </div>
          <div className="mt-2 max-h-[min(52vh,22rem)] space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-[26rem]">
            {feedLines.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-xs text-slate-400">
                Chờ sự kiện từ stream hoặc click gần đây…
              </p>
            ) : (
              feedLines.map((row, idx) => (
                <div
                  key={row.id}
                  className={clsx(
                    "affiliate-ops-feed-in flex items-start justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-3",
                    !compact && idx === 0 && "ring-1 ring-blue-200",
                  )}
                  style={{ animationDelay: compact ? "0ms" : `${Math.min(idx, 8) * 28}ms` }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{row.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.sub}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Source & campaign flow</p>
          <div className="mt-2 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              Nguồn (top)
            </div>
            <div className="space-y-1.5">
              {(compact ? props.sourcesRows.slice(0, 4) : props.sourcesRows.slice(0, 6)).map((r) => (
                <div key={r.source} className="flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                      style={{ width: `${Math.min(100, Math.round(((r.clicks + r.visitors) / maxSource) * 100))}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 truncate text-right text-[10px] text-slate-500">{r.source || "—"}</span>
                </div>
              ))}
              {!props.sourcesRows.length ? <p className="text-[11px] text-slate-400">Chưa có dữ liệu nguồn trong kỳ.</p> : null}
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Campaign
              </div>
              <div className="mt-1.5 space-y-1.5">
                {(compact ? props.campaignRows.slice(0, 3) : props.campaignRows.slice(0, 5)).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500"
                        style={{ width: `${Math.min(100, Math.round((c.clicks / maxCamp) * 100))}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 truncate text-right text-[10px] text-slate-500">{c.name}</span>
                  </div>
                ))}
                {!props.campaignRows.length ? <p className="text-[11px] text-slate-400">Chưa có campaign.</p> : null}
              </div>
            </div>
            {!compact ? (
              <div className="border-t border-slate-200 pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <Cpu className="h-3.5 w-3.5" aria-hidden />
                  Thiết bị
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {props.deviceRows.slice(0, 5).map((d) => (
                    <div key={d.device} className="flex items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${Math.min(100, Math.round(((d.clicks + d.visitors) / maxDev) * 100))}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 truncate text-right text-[10px] text-slate-500">{d.device}</span>
                    </div>
                  ))}
                  {!props.deviceRows.length ? <p className="text-[11px] text-slate-400">Chưa có phân tích thiết bị.</p> : null}
                </div>
              </div>
            ) : null}
            <p className="text-[10px] leading-snug text-slate-400">Geo: sẵn sàng mở rộng khi có dữ liệu quốc gia.</p>
          </div>
        </div>

        <div className="lg:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Health & alerts</p>
          <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="flex items-center gap-1 text-slate-500">
                  <Server className="h-3 w-3" aria-hidden />
                  Redis
                </p>
                <p className={clsx("mt-0.5 font-semibold", snapshot?.redis.ok ? "text-emerald-700" : "text-rose-700")}>
                  {snapshot ? (snapshot.redis.ok ? `${snapshot.redis.ms}ms` : "Lỗi") : "…"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="flex items-center gap-1 text-slate-500">
                  <Radio className="h-3 w-3" aria-hidden />
                  SSE (global)
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">{snapshot ? snapshot.sse.activeConnections : "…"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="flex items-center gap-1 text-slate-500">
                  <Shield className="h-3 w-3" aria-hidden />
                  DLQ 24h
                </p>
                <p className="mt-0.5 font-semibold text-amber-700">{snapshot?.dlq24h ?? "…"}</p>
                {snapshot?.dlq1h != null ? <p className="mt-0.5 text-[9px] text-slate-400">1h: {snapshot.dlq1h}</p> : null}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="flex items-center gap-1 text-slate-500">
                  <Activity className="h-3 w-3" aria-hidden />
                  Ingest latency
                </p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  p50 {snapshot?.ingestLatencyP50Ms != null ? `${snapshot.ingestLatencyP50Ms}ms` : "—"}
                  <span className="font-normal text-slate-400"> · </span>
                  p90 {snapshot?.ingestLatencyP90Ms != null ? `${snapshot.ingestLatencyP90Ms}ms` : "—"}
                </p>
              </div>
            </div>
            {snapshot?.rolling ? (
              <p className="text-[10px] leading-snug text-slate-500">
                Rolling {snapshot.rolling.source === "redis" ? "Redis" : "DB"}: click 1m {snapshot.rolling.clicks1m} (baseline{" "}
                {snapshot.rolling.clicks1mBaseline}) · 5m {snapshot.rolling.clicks5m} (baseline {snapshot.rolling.clicks5mBaseline}) · 15m{" "}
                {snapshot.rolling.clicks15m} (baseline {snapshot.rolling.clicks15mBaseline})
                {snapshot.rolling.rollMeta?.writerLagMs != null
                  ? ` · ghi trễ ~${Math.round(snapshot.rolling.rollMeta.writerLagMs / 1000)}s`
                  : ""}
                {typeof snapshot.alertsSuppressedCount === "number" && snapshot.alertsSuppressedCount > 0
                  ? ` · server ẩn ${snapshot.alertsSuppressedCount} cảnh báo (cooldown)`
                  : ""}
              </p>
            ) : null}
            {snapshot?.trackingQueues ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[10px] text-slate-600">
                <p className="font-semibold text-slate-700">Queue depth</p>
                <p className="mt-1 font-mono leading-relaxed">
                  in:{snapshot.trackingQueues.ingest?.waiting ?? "—"} / at:{snapshot.trackingQueues.attribution?.waiting ?? "—"} / rt:
                  {snapshot.trackingQueues.realtime?.waiting ?? "—"}
                  {snapshot.conversionDispatchQueue ? (
                    <>
                      {" "}
                      / capi:{snapshot.conversionDispatchQueue.waiting ?? "—"}
                    </>
                  ) : null}
                </p>
                {snapshot.capiJobs24h && Object.keys(snapshot.capiJobs24h).length > 0 ? (
                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-slate-500">
                    CAPI 24h:{" "}
                    {Object.entries(snapshot.capiJobs24h)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">{snapshot && !snapshot.bullMqEnabled ? "BullMQ tắt — không có queue depth." : "Đang tải queue…"}</p>
            )}
            {snapErr ? <p className="text-[11px] text-rose-700">{snapErr}</p> : null}
            {allVisibleAlerts.length > 0 ? (
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">Smart alerts</p>
                {groupKeys.map((gk) => {
                  const list = groupedAlerts[gk];
                  if (!list?.length) return null;
                  return (
                    <div key={gk} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-600">{groupLabel[gk] ?? gk}</p>
                      <ul className="mt-1 space-y-1.5">
                        {list.map((a) => (
                          <li
                            key={a.id}
                            className={clsx(
                              "rounded-md border px-2 py-1.5 text-[11px] shadow-none",
                              a.severity === "critical"
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : a.severity === "warning"
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-sky-200 bg-sky-50 text-sky-900",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-start gap-2">
                                <div className="mt-0.5 shrink-0 text-slate-500">
                                  {a.severity === "critical" || a.severity === "warning" ? (
                                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                                  ) : (
                                    <span className="block h-3.5 w-3.5 rounded-full bg-sky-400/70" aria-hidden />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold leading-snug text-slate-900">{a.title}</p>
                                  <p className="mt-0.5 text-[10px] leading-snug text-slate-600">{a.detail}</p>
                                  {a.ai?.features && !compact ? (
                                    <p className="mt-1 font-mono text-[9px] text-slate-500">
                                      AI-ready: {Object.entries(a.ai.features)
                                        .slice(0, 4)
                                        .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`)
                                        .join(" · ")}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => onAckAlert(a.id)}
                                  className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Đã đọc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSnoozeAlert(a.id)}
                                  className="rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[9px] text-slate-500 hover:bg-slate-100"
                                >
                                  Ẩn 8p
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Live timeline</p>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {([5, 15, 60] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSparkWindow(w)}
                className={clsx(
                  "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                  sparkWindow === w ? "border border-blue-200 bg-white text-blue-800 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {w === 60 ? "1h" : `${w}m`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <CreatorRealtimeSparklineLazy history={props.rtHistory} windowMinutes={sparkWindow} />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-400">
          WebSocket không bắt buộc — SSE một chiều ổn định sau proxy; có thể bổ sung WS sau nếu cần hai chiều.
        </p>
      </div>
    </section>
  );
}
