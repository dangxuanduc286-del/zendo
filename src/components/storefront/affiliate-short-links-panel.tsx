"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AffiliateQrCodeCard from "./affiliate-qr-code-card";
import AffiliateQuickShareButtons from "./affiliate-quick-share-buttons";


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

export default memo(function AffiliateShortLinksPanel(): JSX.Element {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [targetPath, setTargetPath] = useState("/");
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [subid, setSubid] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickUrl, setPickUrl] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const [a, b] = await Promise.all([
        fetch("/api/account/affiliate/short-links", { credentials: "same-origin" }).then((r) => r.json()),
        fetch("/api/account/affiliate/analytics/short-links?range=30d", { credentials: "same-origin" }).then((r) => r.json()),
      ]);
      if (!a?.ok) throw new Error(a?.message || "Không tải danh sách.");
      if (!b?.ok) throw new Error(b?.message || "Không tải thống kê.");
      setRows(a.rows ?? []);
      setOrigin(String(a.origin ?? ""));
      setStats(b.rows ?? []);    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statById = useMemo(() => new Map(stats.map((s) => [s.id, s])), [stats]);

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
      if (!res.ok || !j.ok) throw new Error(j.message || "Không tạo được.");      setSlug("");
      setCampaignName("");
      await load();
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

  const displayQrUrl = pickUrl || rows.find((r) => r.shortUrl)?.shortUrl || "";

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
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm text-[#0F172A]"
              placeholder="/san-pham/ten-sp"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Slug tuỳ chọn (để trống = tự sinh)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 font-mono text-sm text-[#0F172A]"
              placeholder="deal-tiktok"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Nhãn (tuỳ chọn)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            utm_source / nguồn
            <input
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
              placeholder="tiktok"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            subid (tuỳ chọn)
            <input
              value={subid}
              onChange={(e) => setSubid(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-[#64748B]">
            Tên campaign (tạo nhóm riêng)
            <input
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
      {!loading && rows.length === 0 ? <p className="text-sm text-[#64748B]">Chưa có link ngắn.</p> : null}
      {rows.length ? (
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
              {rows.map((r) => {
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
      {origin ? (
        <p className="text-[11px] text-[#64748B]">
          Base: <span className="font-mono text-[#0F172A]">{origin}</span>
        </p>
      ) : null}
    </div>
  );
});
