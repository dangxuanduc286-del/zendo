"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAffiliateCtvRuntimeActive } from "@/hooks/use-affiliate-ctv-runtime-active";
import {
  fetchAffiliateClientJson,
  readAffiliateClientJsonCache,
} from "@/lib/affiliate-client-json-cache";

import AffiliateQrCodeCard from "./affiliate-qr-code-card";
import AffiliateQuickShareButtons from "./affiliate-quick-share-buttons";

const CACHE_SHORT_LINKS = "affiliate:short-links:rows";
const CACHE_SHORT_LINK_STATS = "affiliate:short-links:stats:30d";

type LinkRow = {
  id: string;
  slug: string | null;
  shortUrl: string | null;
  label: string | null;
  targetPathname: string;
  utmSource: string | null;
  subid: string | null;
  isActive: boolean;
  createdAt: string;
  campaignName: string | null;
};

type StatRow = {
  id: string;
  slug: string | null;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  topSource: string | null;
};

type RowsPayload<T> = T[] | { ok?: boolean; message?: string; rows?: T[] };

function normalizeRowsPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { rows?: unknown }).rows)) {
    return (payload as { rows: T[] }).rows;
  }
  return [];
}

function isErrorPayload(payload: unknown): payload is { ok: false; message?: string } {
  return Boolean(payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === false);
}

export default memo(function AffiliateShortLinksPanel(): JSX.Element {
  const runtimeActive = useAffiliateCtvRuntimeActive();
  const initialRowsPayload = readAffiliateClientJsonCache<unknown>(CACHE_SHORT_LINKS);
  const initialStatsPayload = readAffiliateClientJsonCache<unknown>(CACHE_SHORT_LINK_STATS);
  const initialRows = normalizeRowsPayload<LinkRow>(initialRowsPayload);
  const initialStats = normalizeRowsPayload<StatRow>(initialStatsPayload);
  const [rows, setRows] = useState<LinkRow[]>(initialRows);
  const [stats, setStats] = useState<StatRow[]>(initialStats);
  const [loading, setLoading] = useState(() => !(initialRowsPayload && initialStatsPayload));
  const [err, setErr] = useState("");
  const [targetPath, setTargetPath] = useState("/");
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [subid, setSubid] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickUrl, setPickUrl] = useState("");

  const load = useCallback(async (force = false) => {
    setErr("");
    try {
      const [a, b] = await Promise.all([
        fetchAffiliateClientJson<RowsPayload<LinkRow>>({
          cacheKey: CACHE_SHORT_LINKS,
          url: "/api/account/affiliate/short-links",
          force,
          parse: async (r) => r.json(),
        }),
        fetchAffiliateClientJson<RowsPayload<StatRow>>({
          cacheKey: CACHE_SHORT_LINK_STATS,
          url: "/api/account/affiliate/analytics/short-links?range=30d",
          force,
          parse: async (r) => r.json(),
        }),
      ]);
      if (isErrorPayload(a)) throw new Error(a.message || "Không tải danh sách.");
      if (isErrorPayload(b)) throw new Error(b.message || "Không tải thống kê.");
      setRows(normalizeRowsPayload<LinkRow>(a));
      setStats(normalizeRowsPayload<StatRow>(b));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!runtimeActive) return;
    const cachedLinks = readAffiliateClientJsonCache<unknown>(CACHE_SHORT_LINKS);
    const cachedStats = readAffiliateClientJsonCache<unknown>(CACHE_SHORT_LINK_STATS);
    const cached = cachedLinks && cachedStats;
    void load(!cached);
  }, [load, runtimeActive]);

  const statById = useMemo(() => {
    const safeStats = Array.isArray(stats) ? stats : [];
    return new Map(safeStats.map((s) => [s.id, s]));
  }, [stats]);

  const onCreate = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/account/affiliate/short-links", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPathname: targetPath.trim(),
          slug: slug.trim() || null,
          label: label.trim() || null,
          utmSource: utmSource.trim() || null,
          subid: subid.trim() || null,
          campaignName: campaignName.trim() || null,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string; link?: { shortUrl?: string | null } };
      if (!res.ok || !j.ok) throw new Error(j.message || "Không tạo được.");
      setSlug("");
      setCampaignName("");
      await load(true);
      if (j.link?.shortUrl) setPickUrl(j.link.shortUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tạo link.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/account/affiliate/short-links/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  };

  const displayQrUrl = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    return pickUrl || safeRows.find((r) => r.shortUrl)?.shortUrl || "";
  }, [pickUrl, rows]);

  const tableRows = useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-sm">
        <p className="text-sm font-semibold text-[#0F172A]">Link ngắn /go/…</p>
        <p className="mt-1 text-xs text-[#64748B]">
          Tạo slug dễ nhớ, gắn nguồn (utm) hoặc campaign. Ví dụ: <span className="font-mono text-[#0F172A]">/go/deal-tiktok</span>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#64748B]">
            Đích (path nội bộ)
            <input
              id="affiliate-short-link-target-path"
              name="targetPathname"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm text-[#0F172A]"
              placeholder="/san-pham/ten-sp"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Slug tuỳ chọn (để trống = tự sinh)
            <input
              id="affiliate-short-link-slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 font-mono text-sm text-[#0F172A]"
              placeholder="deal-tiktok"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Nhãn (tuỳ chọn)
            <input
              id="affiliate-short-link-label"
              name="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            utm_source / nguồn
            <input
              id="affiliate-short-link-utm-source"
              name="utmSource"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
              placeholder="tiktok"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            subid (tuỳ chọn)
            <input
              id="affiliate-short-link-subid"
              name="subid"
              value={subid}
              onChange={(e) => setSubid(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Tên campaign (tạo nhóm riêng)
            <input
              id="affiliate-short-link-campaign-name"
              name="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
              placeholder="Sale 7.7"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCreate()}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {busy ? "Đang tạo…" : "Tạo link ngắn"}
          </button>
          <Link
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#2563EB]"
            href="/api/account/affiliate/analytics/export?type=short-links&range=30d&format=csv"
            prefetch={false}
          >
            CSV short links
          </Link>
        </div>
        {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}
      </div>

      {displayQrUrl ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <AffiliateQrCodeCard url={displayQrUrl} label="QR link đang chọn" />
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">Chia sẻ nhanh</p>
            <AffiliateQuickShareButtons shareUrl={displayQrUrl} className="mt-2" />
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-[#64748B]">Đang tải link…</p> : null}
      {!loading && tableRows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[10px] uppercase text-[#64748B]">
              <tr>
                <th className="px-2 py-2">Slug</th>
                <th className="px-2 py-2">Đích</th>
                <th className="px-2 py-2">30d click</th>
                <th className="px-2 py-2">Đơn</th>
                <th className="px-2 py-2">HH</th>
                <th className="px-2 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const st = statById.get(r.id);
                return (
                  <tr key={r.id} className="border-t border-[#E2E8F0]">
                    <td className="px-2 py-2 font-mono text-[11px]">{r.slug ?? "—"}</td>
                    <td className="max-w-[220px] truncate px-2 py-2 text-[11px]" title={r.targetPathname}>
                      {r.targetPathname}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{st?.clicks ?? 0}</td>
                    <td className="px-2 py-2 tabular-nums">{st?.orders ?? 0}</td>
                    <td className="px-2 py-2 tabular-nums">{new Intl.NumberFormat("vi-VN").format(st?.commission ?? 0)}₫</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.shortUrl ? (
                          <button
                            type="button"
                            className="rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB]"
                            onClick={() => setPickUrl(r.shortUrl!)}
                          >
                            QR
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[10px]"
                          onClick={() => void toggle(r.id, r.isActive)}
                        >
                          {r.isActive ? "Tắt" : "Bật"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
});
