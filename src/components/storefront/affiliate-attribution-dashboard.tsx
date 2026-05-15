"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Overview = {
  ok: true;
  windows: Record<string, Record<string, number | undefined>>;
  matchedConversions24h: number;
  paidTrafficEvents24h: number;
  unmatchedRate24h: number;
};

type ConvRow = {
  id: string;
  orderId: string;
  state: string;
  winningModel: string;
  touchCount: number;
  duplicatePaidHits: number;
  selfReferralRisk: boolean;
  resolvedAt: string;
  replayVersion: number;
};

export default function AffiliateAttributionDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [conversions, setConversions] = useState<ConvRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [o, c] = await Promise.all([
        fetch("/api/account/affiliate/attribution/overview", { credentials: "include" }),
        fetch("/api/account/affiliate/attribution/conversions?take=30", { credentials: "include" }),
      ]);
      const jo = (await o.json()) as Overview & { ok?: boolean; message?: string };
      const jc = (await c.json()) as { ok?: boolean; items?: ConvRow[]; message?: string };
      if (!o.ok || !jo.ok) throw new Error(jo.message ?? "overview");
      if (!c.ok || !jc.ok) throw new Error(jc.message ?? "conversions");
      setOverview(jo);
      setConversions(jc.items ?? []);
    } catch {
      setErr("Không tải được dữ liệu attribution.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const w24 = overview?.windows?.["24h"] ?? {};

  return (
    <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-[#E2E8F0] bg-white px-4 py-5 shadow-sm sm:px-5 sm:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Attribution</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Conversion match, touch chain, campaign/source — engine Phase 2.2.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
          >
            Làm mới
          </button>
          <Link
            href="/tai-khoan/affiliate/analytics"
            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
          >
            Analytics
          </Link>
        </div>
      </div>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      {overview ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">MATCHED 24h</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{w24.MATCHED ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">UNATTRIBUTED / PARTIAL</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {(w24.UNATTRIBUTED ?? 0) + (w24.PARTIAL_MATCH ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Paid events 24h</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">{overview.paidTrafficEvents24h}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Unmatched rate</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">{overview.unmatchedRate24h}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[#0F172A]">Conversion match (gần đây)</h2>
        <p className="text-xs text-[#64748B]">Replay: POST /api/account/affiliate/attribution/replay với orderIds.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Touches</th>
                <th className="px-3 py-2">Dup paid</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Replay</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((r) => (
                <tr key={r.id} className="border-b border-[#F1F5F9]">
                  <td className="px-3 py-2 font-mono text-xs">{r.orderId.slice(0, 12)}…</td>
                  <td className="px-3 py-2">{r.state}</td>
                  <td className="px-3 py-2">{r.winningModel}</td>
                  <td className="px-3 py-2">{r.touchCount}</td>
                  <td className="px-3 py-2">{r.duplicatePaidHits}</td>
                  <td className="px-3 py-2">{r.selfReferralRisk ? "yes" : "—"}</td>
                  <td className="px-3 py-2">{r.replayVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {conversions.length === 0 ? <p className="p-4 text-sm text-[#64748B]">Chưa có conversion match.</p> : null}
        </div>
      </div>
    </div>
  );
}
