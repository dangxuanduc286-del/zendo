"use client";

import { clsx } from "clsx";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Globe2, ImageIcon, MapPin, Megaphone, Sparkles, Wand2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AffiliateConversionFunnelVisual from "./affiliate-conversion-funnel-visual";
import { CreatorEmptyState } from "./affiliate-creator-metric-card";
import AffiliateQrCodeCard from "./affiliate-qr-code-card";
import AffiliateQuickShareButtons from "./affiliate-quick-share-buttons";
import {
  type RangeKey,
  useAffiliateAssetsLibrary,
  useAffiliateCampaignAnalytics,
  useAffiliateCampaignList,
  useAffiliateGrowthInsightsPack,
  useAffiliateLandingGrowth,
} from "./use-affiliate-analytics-hooks";
import {
  AFFILIATE_ANALYTICS_CHIP_LINK,
  AFFILIATE_ANALYTICS_SUBTAB_ACTIVE,
  AFFILIATE_ANALYTICS_SUBTAB_INACTIVE,
  AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
  AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY,
} from "@/lib/affiliate-analytics-ui-tokens";

const AffiliateAnalyticsBarChartLazy = dynamic(() => import("./affiliate-analytics-bar-chart-lazy"), {
  loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-[#F1F5F9]/90" />,
  ssr: false,
});

function creatorLog(_payload: Record<string, unknown>): void {
  void _payload;
}

const SNIPPET_KEY = "zendo_affiliate_snippets_v1";

type Snippet = { id: string; text: string };

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

type SubKey = "campaigns" | "landing" | "insights" | "templates" | "assets";

const SUBS: Array<{ key: SubKey; label: string; Icon: typeof Megaphone }> = [
  { key: "campaigns", label: "Campaign", Icon: Megaphone },
  { key: "landing", label: "Landing & EPC", Icon: MapPin },
  { key: "insights", label: "Growth", Icon: Sparkles },
  { key: "templates", label: "Mẫu share", Icon: Wand2 },
  { key: "assets", label: "Kho ảnh", Icon: ImageIcon },
];

export default memo(function AffiliateCampaignGrowthHub(props: { range: RangeKey }): JSX.Element {
  const { range } = props;
  const [sub, setSub] = useState<SubKey>("campaigns");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createSource, setCreateSource] = useState("");
  const [createSub, setCreateSub] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [quickTarget, setQuickTarget] = useState("/");
  const [pickLinkId, setPickLinkId] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState("");

  const [snippets, setSnippets] = useState<Snippet[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SNIPPET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setSnippets(
            parsed
              .filter((x): x is Snippet => Boolean(x && typeof x === "object" && typeof (x as Snippet).text === "string"))
              .map((x, i) => ({ id: String((x as Snippet).id ?? i), text: String((x as Snippet).text).slice(0, 500) })),
          );
          return;
        }
      }
      setSnippets([
        { id: "d1", text: "Deal hot hôm nay 🔥" },
        { id: "d2", text: "Comment để nhận link" },
        { id: "d3", text: "Flash sale — ship nhanh toàn quốc" },
      ]);
    } catch {
      setSnippets([]);
    }
  }, []);

  const persistSnippets = useCallback((next: Snippet[]) => {
    setSnippets(next);
    try {
      window.localStorage.setItem(SNIPPET_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const campaigns = useAffiliateCampaignList({ range, enabled: sub === "campaigns" });
  const detail = useAffiliateCampaignAnalytics({ campaignId: selectedId, range, enabled: sub === "campaigns" && Boolean(selectedId) });
  const landing = useAffiliateLandingGrowth({ range, enabled: sub === "landing" });
  const growth = useAffiliateGrowthInsightsPack({ range, enabled: sub === "insights" });
  const assets = useAffiliateAssetsLibrary({ enabled: sub === "assets" });

  const selectedLink = useMemo(() => {
    const links = detail.data?.trackingLinks ?? [];
    if (!links.length) return null;
    const byPick = pickLinkId ? links.find((l) => l.id === pickLinkId) : null;
    return byPick ?? links[0] ?? null;
  }, [detail.data?.trackingLinks, pickLinkId]);

  useEffect(() => {
    const links = detail.data?.trackingLinks ?? [];
    if (links.length && !pickLinkId) setPickLinkId(links[0]!.id);
  }, [detail.data?.trackingLinks, pickLinkId]);

  const onCreateCampaign = async () => {
    const name = createName.trim();
    if (!name) {
      setMsg("Nhập tên campaign.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account/affiliate/campaigns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          utmSource: createSource.trim() || null,
          defaultSubid: createSub.trim() || null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không tạo được.");
      creatorLog({ action: "create_campaign", name });
      setCreateName("");
      setCreateSource("");
      setCreateSub("");
      void campaigns.refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  };

  const onArchive = async (id: string) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/account/affiliate/campaigns/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không lưu được.");
      if (selectedId === id) setSelectedId(null);
      void campaigns.refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  };

  const onDuplicate = async (id: string) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/account/affiliate/campaigns/${encodeURIComponent(id)}/duplicate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không nhân bản được.");
      creatorLog({ action: "duplicate_campaign", id });
      void campaigns.refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  };

  const onQuickShortLink = async (campaignId: string) => {
    const targetPathname = quickTarget.trim() || "/";
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account/affiliate/short-links", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPathname, campaignId }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không tạo link.");
      creatorLog({ action: "quick_short_link", campaignId });
      setQuickTarget("/");
      void detail.refetch();
      void campaigns.refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  };

  const exportCampaign = (id: string) => {
    const u = `/api/account/affiliate/analytics/export?type=campaign-detail&range=${encodeURIComponent(range)}&format=excel&campaignId=${encodeURIComponent(id)}`;
    creatorLog({ action: "export_campaign", id });
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const copyText = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        creatorLog({ action: "copy", label });
        setMsg("Đã copy.");
        window.setTimeout(() => setMsg(""), 1400);
      },
      () => setMsg("Không copy được."),
    );
  };

  const chartBuckets = useMemo(
    () =>
      (detail.data?.timeline ?? []).map((b) => ({
        label: b.label,
        clicks: b.clicks,
        orders: b.orders,
        revenue: b.revenue,
        commission: b.commission,
      })),
    [detail.data?.timeline],
  );

  const filteredCampaigns = useMemo(() => {
    const rows = campaigns.data?.campaigns ?? [];
    const q = campaignFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(q) || c.source?.toLowerCase().includes(q));
  }, [campaigns.data?.campaigns, campaignFilter]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="sticky top-14 z-20 w-full min-w-0 md:top-0">
        <div
          className={clsx(
            AFFILIATE_ANALYTICS_TAB_ROW_SURFACE,
            "flex w-full min-w-0 snap-x snap-mandatory flex-nowrap gap-1 overflow-x-auto pb-1 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:justify-start md:gap-1.5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden",
          )}
        >
          {SUBS.map((s) => {
            const Icon = s.Icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSub(s.key);
                  setMsg("");
                }}
                className={sub === s.key ? AFFILIATE_ANALYTICS_SUBTAB_ACTIVE : AFFILIATE_ANALYTICS_SUBTAB_INACTIVE}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {msg ? (
        <p className={`text-sm ${msg.startsWith("Đã") ? "text-emerald-700" : "text-rose-600"}`}>{msg}</p>
      ) : null}

      {sub === "campaigns" ? (
        <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0F172A]">Tạo campaign nhanh</h3>
            <p className="mt-1 text-xs text-[#64748B]">Ví dụ: TikTok-Deal-7-7, FB-Reels-NoiChien…</p>
            <label className="mt-3 block text-xs font-medium text-[#64748B]">Tên</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm"
              placeholder="Tên campaign"
              maxLength={180}
            />
            <label className="mt-2 block text-xs font-medium text-[#64748B]">Nguồn (utm / label)</label>
            <input
              value={createSource}
              onChange={(e) => setCreateSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm"
              placeholder="tiktok, facebook…"
              maxLength={120}
            />
            <label className="mt-2 block text-xs font-medium text-[#64748B]">SubId mặc định</label>
            <input
              value={createSub}
              onChange={(e) => setCreateSub(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm"
              placeholder="deal77, flash…"
              maxLength={120}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreateCampaign()}
              className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY, "mt-3 w-full py-2 text-sm disabled:opacity-60")}
            >
              Tạo campaign
            </button>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-3">
              <a
                className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-semibold text-[#2563EB]"
                href={`/api/account/affiliate/analytics/export?type=campaign-summary&range=${encodeURIComponent(range)}&format=excel`}
                target="_blank"
                rel="noreferrer"
              >
                Xuất CSV/Excel tất cả campaign
              </a>
              <a
                className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-semibold text-[#2563EB]"
                href={`/api/account/affiliate/analytics/export?type=funnel-report&range=${encodeURIComponent(range)}&format=excel`}
                target="_blank"
                rel="noreferrer"
              >
                Xuất funnel (toàn hồ sơ)
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#0F172A]">Danh sách</h3>
              <button type="button" className="text-xs font-semibold text-[#2563EB]" onClick={() => void campaigns.refetch()}>
                Tải lại
              </button>
            </div>
            {campaigns.data?.campaigns?.length ? (
              <div className="mt-2 space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Tìm và chọn campaign</label>
                <input
                  type="search"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  placeholder="Gõ tên hoặc nguồn…"
                  className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-medium text-[#0F172A] shadow-sm placeholder:text-[#94A3B8]"
                  aria-label="Lọc campaign"
                />
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setSelectedId(v || null);
                    setPickLinkId(null);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 text-sm font-semibold text-[#0F172A] shadow-sm"
                  aria-label="Chọn campaign"
                >
                  <option value="">— Chọn campaign —</option>
                  {filteredCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.archived ? " (lưu trữ)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {campaigns.loading && !campaigns.data ? (
              <div className="mt-3 h-40 animate-pulse rounded-xl bg-[#F1F5F9]/90" />
            ) : campaigns.data?.campaigns?.length ? (
              <ul className="mt-2 space-y-1">
                {filteredCampaigns.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setPickLinkId(null);
                      }}
                      className={`flex w-full flex-col rounded-xl border px-2 py-2 text-left text-sm transition active:scale-[0.99] ${
                        selectedId === c.id
                          ? "border-[#3B82F6] bg-[#EFF6FF]/90 shadow-sm ring-1 ring-[#DBEAFE]"
                          : "border-[#E2E8F0]/90 bg-white hover:border-[#CBD5E1] hover:shadow-sm"
                      }`}
                    >
                      <span className="font-semibold text-[#0F172A]">{c.name}</span>
                      <span className="text-[11px] text-[#64748B]">
                        Click {c.stats.clicks} · HH {fmtVnd(c.stats.commission)} · EPC {fmtVnd(c.stats.epc)}
                        {c.archived ? " · Đã lưu trữ" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#64748B]">Chưa có campaign.</p>
            )}
            {campaigns.data?.campaigns?.length && !filteredCampaigns.length ? (
              <p className="mt-2 text-xs font-medium text-amber-700">Không tìm thấy campaign khớp &quot;{campaignFilter}&quot;.</p>
            ) : null}
          </div>

          {selectedId ? (
            <div className="space-y-3 lg:col-span-2">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#0F172A]">{detail.data?.name ?? "Campaign"}</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-semibold"
                      onClick={() => exportCampaign(selectedId)}
                    >
                      Export analytics
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-semibold"
                      onClick={() => void onDuplicate(selectedId)}
                    >
                      Nhân bản
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                      onClick={() => void onArchive(selectedId)}
                    >
                      Lưu trữ
                    </button>
                  </div>
                </div>
                {detail.loading && !detail.data ? (
                  <div className="mt-3 h-32 animate-pulse rounded-xl bg-[#F1F5F9]" />
                ) : detail.data ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Click" v={String(detail.data.summary.clicks)} />
                    <Metric label="Visitor" v={String(detail.data.summary.visitors)} />
                    <Metric label="Đơn" v={String(detail.data.summary.orders)} />
                    <Metric label="Conv" v={fmtPct(detail.data.summary.conversion)} />
                    <Metric label="Doanh thu" v={fmtVnd(detail.data.summary.revenue)} />
                    <Metric label="HH" v={fmtVnd(detail.data.summary.commission)} />
                    <Metric label="EPC" v={fmtVnd(detail.data.summary.epc)} />
                  </div>
                ) : null}
              </div>

              <div className="grid w-full min-w-0 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase text-[#64748B]">Timeline &amp; trend</h4>
                  {chartBuckets.length ? (
                    <div className="mt-2">
                      <AffiliateAnalyticsBarChartLazy buckets={chartBuckets} />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#64748B]">Chưa đủ dữ liệu timeline.</p>
                  )}
                  <p className="mt-2 text-[11px] text-[#64748B]">Conversion trend theo ngày (đơ/click trong bucket).</p>
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase text-[#64748B]">Funnel (theo link campaign)</h4>
                  <AffiliateConversionFunnelVisual
                    loading={detail.loading}
                    steps={detail.data?.funnel?.steps ?? []}
                    variant="compact"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                <h4 className="text-sm font-semibold text-[#0F172A]">Link ngắn trong campaign</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={quickTarget}
                    onChange={(e) => setQuickTarget(e.target.value)}
                    className="min-w-[12rem] flex-1 rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm"
                    placeholder="/deal-hot hoặc URL path"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onQuickShortLink(selectedId)}
                    className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY, "shrink-0 rounded-xl px-3 py-2 text-sm disabled:opacity-60")}
                  >
                    Tạo link ngắn
                  </button>
                </div>
                {detail.data?.trackingLinks?.length ? (
                  <div className="mt-3 space-y-3">
                    <select
                      className="w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-sm"
                      value={pickLinkId ?? ""}
                      onChange={(e) => setPickLinkId(e.target.value || null)}
                    >
                      {detail.data.trackingLinks.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.shortUrl ?? l.targetPathname}
                        </option>
                      ))}
                    </select>
                    {selectedLink?.shortUrl ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-[#64748B]">Share nhanh &amp; copy</p>
                          <div className="mt-2">
                            <AffiliateQuickShareButtons shareUrl={selectedLink.shortUrl} className="flex flex-wrap gap-1" />
                          </div>
                        </div>
                        <AffiliateQrCodeCard url={selectedLink.shortUrl} label="QR link campaign" />
                      </div>
                    ) : (
                      <p className="text-sm text-[#64748B]">Chưa có slug — tạo link ngắn để có QR.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#64748B]">Chưa có link. Thêm link ngắn gắn campaign này.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {sub === "landing" ? (
        <div className="rounded-xl border border-[#E2E8F0]/90 bg-gradient-to-b from-white to-[#F8FAFC]/40 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:rounded-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]0/10 text-[#2563EB]">
                <Globe2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-[#0F172A]">Landing mạnh (theo EPC)</h3>
                <p className="text-[10px] text-[#64748B]">Vuốt ngang trên điện thoại để xem nhanh.</p>
              </div>
            </div>
            <a
              className={AFFILIATE_ANALYTICS_CHIP_LINK}
              href={`/api/account/affiliate/analytics/export?type=landing-growth&range=${encodeURIComponent(range)}&format=excel`}
              target="_blank"
              rel="noreferrer"
            >
              Xuất Excel
            </a>
          </div>
          {landing.loading && !landing.data ? (
            <div className="mt-3 h-44 animate-pulse rounded-xl bg-[#F1F5F9]/90" />
          ) : landing.data?.rows?.length ? (
            <>
              <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
                {landing.data.rows.slice(0, 14).map((r) => (
                  <div
                    key={r.pathname}
                    className="min-w-[220px] max-w-[85vw] shrink-0 snap-start rounded-xl border border-[#E2E8F0]/90 bg-white/90 p-3 shadow-sm"
                  >
                    <p className="line-clamp-2 text-xs font-bold text-[#0F172A]">{r.pathname}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[#64748B]">
                      <span>Click</span>
                      <span className="text-right font-semibold tabular-nums text-[#1E293B]">{r.clicks}</span>
                      <span>HH</span>
                      <span className="text-right font-semibold tabular-nums text-emerald-700">{fmtVnd(r.commission)}</span>
                      <span>EPC</span>
                      <span className="text-right font-semibold tabular-nums text-[#1E293B]">{fmtVnd(r.epc)}</span>
                    </div>
                    <p className="mt-2 truncate text-[10px] text-[#64748B]">
                      Nguồn: <span className="font-semibold text-[#334155]">{r.topSource ?? "—"}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                    <tr>
                      <th className="py-2 pr-2">Landing</th>
                      <th className="py-2 pr-2">Click</th>
                      <th className="py-2 pr-2">HH</th>
                      <th className="py-2 pr-2">EPC</th>
                      <th className="py-2">Top nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {landing.data.rows.slice(0, 25).map((r) => (
                      <tr key={r.pathname} className="border-t border-[#F1F5F9]">
                        <td className="py-2 pr-2 font-medium text-[#0F172A]">{r.pathname}</td>
                        <td className="py-2 pr-2 tabular-nums text-[#334155]">{r.clicks}</td>
                        <td className="py-2 pr-2 tabular-nums text-emerald-700">{fmtVnd(r.commission)}</td>
                        <td className="py-2 pr-2 tabular-nums text-[#334155]">{fmtVnd(r.epc)}</td>
                        <td className="py-2 text-xs text-[#64748B]">{r.topSource ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="mt-3">
              <CreatorEmptyState
                icon={MapPin}
                title="Chưa có landing nổi bật"
                hint="Khi có click qua link ref, bảng EPC theo đường dẫn sẽ hiện tại đây — thử kéo range rộng hơn hoặc chia sẻ thêm link."
              />
            </div>
          )}
        </div>
      ) : null}

      {sub === "insights" ? (
        <div className="rounded-xl border border-[#E2E8F0]/90 bg-gradient-to-b from-white to-[#F8FAFC]/40 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:rounded-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="text-sm font-bold tracking-tight text-[#0F172A]">Growth insights</h3>
            </div>
            <a
              className={AFFILIATE_ANALYTICS_CHIP_LINK}
              href={`/api/account/affiliate/analytics/export?type=growth-insights&range=${encodeURIComponent(range)}&format=excel`}
              target="_blank"
              rel="noreferrer"
            >
              Xuất Excel
            </a>
          </div>
          {growth.loading && !growth.data ? (
            <div className="mt-3 h-36 animate-pulse rounded-xl bg-[#F1F5F9]/90" />
          ) : growth.data?.insights ? (
            (() => {
              const ins = growth.data.insights;
              const cards = [
                { title: "Nguồn mạnh", value: ins.bestSource ?? "—", hint: "Traffic từ kênh", hot: Boolean(ins.bestSource) },
                {
                  title: "Campaign mạnh",
                  value: ins.bestCampaign ? ins.bestCampaign.name : "—",
                  hint: "HH cao trong kỳ",
                  hot: Boolean(ins.bestCampaign),
                },
                {
                  title: "Landing mạnh",
                  value: ins.bestLanding?.pathname ?? "—",
                  hint: "EPC / chuyển đổi",
                  hot: Boolean(ins.bestLanding?.pathname),
                },
                {
                  title: "Giờ convert (VN)",
                  value: ins.strongestHourLabel ?? "—",
                  hint: "Khung giờ vàng",
                  hot: Boolean(ins.strongestHourLabel),
                },
                {
                  title: "Sản phẩm trending",
                  value: ins.trendingProductName ?? "—",
                  hint: "Quan tâm gần đây",
                  hot: Boolean(ins.trendingProductName),
                },
              ];
              const anyHot = cards.some((c) => c.hot);
              return anyHot ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {cards.map((c) => (
                    <div
                      key={c.title}
                      className={`rounded-xl border px-3 py-2.5 transition ${
                        c.hot
                          ? "border-emerald-200/90 bg-emerald-50/50 shadow-sm"
                          : "border-[#F1F5F9] bg-white/80 text-[#64748B]"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{c.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-bold text-[#0F172A]">{c.value}</p>
                      <p className="mt-0.5 text-[10px] text-[#64748B]">{c.hint}</p>
                      {c.hot ? (
                        <span className="mt-1 inline-block rounded-full bg-emerald-600/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          Nổi bật
                        </span>
                      ) : (
                        <span className="mt-1 inline-block text-[9px] font-semibold text-[#94A3B8]">Chờ dữ liệu</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <CreatorEmptyState
                    icon={Sparkles}
                    title="Sẵn sàng khi có traffic"
                    hint="Khi có đủ click và đơn, Zendo sẽ gợi ý nguồn, landing, giờ vàng và sản phẩm mạnh — hãy chia sẻ link ref và theo dõi tab Analytics."
                  />
                </div>
              );
            })()
          ) : (
            <p className="mt-2 text-sm text-[#64748B]">Chưa tải được insights.</p>
          )}
        </div>
      ) : null}

      {sub === "templates" ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F172A]">Caption &amp; CTA — copy nhanh</h3>
          <p className="mt-1 text-xs text-[#64748B]">Lưu trên trình duyệt của bạn (local).</p>
          <ul className="mt-3 space-y-2">
            {snippets.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                <p className="min-w-0 flex-1 text-sm text-[#0F172A]">{s.text}</p>
                <button
                  type="button"
                  className={clsx(AFFILIATE_ANALYTICS_TOOLBAR_BTN_PRIMARY, "shrink-0 rounded-lg px-2 py-1 text-xs")}
                  onClick={() => {
                    copyText(s.text, "snippet");
                    creatorLog({ action: "copy_snippet" });
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="shrink-0 text-xs text-rose-600"
                  onClick={() => persistSnippets(snippets.filter((x) => x.id !== s.id))}
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              const text = window.prompt("Nội dung mẫu mới?");
              if (!text?.trim()) return;
              persistSnippets([...snippets, { id: `s_${Date.now()}`, text: text.trim().slice(0, 500) }]);
            }}
          >
            Thêm mẫu
          </button>
        </div>
      ) : null}

      {sub === "assets" ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F172A]">Kho ảnh / banner</h3>
          {assets.loading && !assets.data ? (
            <div className="mt-3 h-40 animate-pulse rounded-xl bg-[#F1F5F9]" />
          ) : assets.data?.items?.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {assets.data.items.map((it) => (
                <div key={it.id} className="rounded-xl border border-[#E2E8F0] p-2">
                  {it.previewUrl.startsWith("https://") ? (
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-[#F1F5F9]">
                      <Image
                        src={it.previewUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.previewUrl} alt="" className="h-24 w-full rounded-lg object-cover" loading="lazy" />
                  )}
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium text-[#0F172A]">{it.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <a
                      href={it.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#0F172A]"
                    >
                      Tải
                    </a>
                    <button
                      type="button"
                      className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]"
                      onClick={() => copyText(it.url, "asset_url")}
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#64748B]">Chưa có tài nguyên.</p>
          )}
        </div>
      ) : null}
    </div>
  );
});

function Metric(props: { label: string; v: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
      <p className="text-[10px] font-semibold uppercase text-[#64748B]">{props.label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-[#0F172A]">{props.v}</p>
    </div>
  );
}
