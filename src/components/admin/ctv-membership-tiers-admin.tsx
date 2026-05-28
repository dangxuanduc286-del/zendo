"use client";

import { useCallback, useEffect, useState } from "react";
import type { CtvMembershipTierRecord } from "@/lib/ctv/ctv-membership-tier-types";

type TierForm = {
  code: string;
  name: string;
  revenueFrom: string;
  revenueTo: string;
  rewardThreshold: string;
  rewardAmount: string;
  commissionPercent: string;
  sortOrder: string;
  icon: string;
  isActive: boolean;
  badgeColorJson: string;
};

function tierToForm(t: CtvMembershipTierRecord): TierForm {
  return {
    code: t.code,
    name: t.name,
    revenueFrom: String(t.revenueFrom),
    revenueTo: String(t.revenueTo),
    rewardThreshold: String(t.rewardThreshold),
    rewardAmount: String(t.rewardAmount),
    commissionPercent: String(t.commissionPercent),
    sortOrder: String(t.sortOrder),
    icon: t.icon,
    isActive: t.isActive,
    badgeColorJson: JSON.stringify(t.badgeColor, null, 2),
  };
}

export function CtvMembershipTiersAdmin(): JSX.Element {
  const [tiers, setTiers] = useState<CtvMembershipTierRecord[]>([]);
  const [forms, setForms] = useState<Record<string, TierForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ctv-membership-tiers");
      const data = (await res.json()) as { tiers: CtvMembershipTierRecord[] };
      const list = data.tiers ?? [];
      setTiers(list);
      const next: Record<string, TierForm> = {};
      for (const t of list) next[t.id] = tierToForm(t);
      setForms(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = (id: string, key: keyof TierForm, value: string | boolean) => {
    setForms((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [key]: value },
    }));
  };

  const save = async (id: string) => {
    const form = forms[id];
    if (!form) return;
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/ctv-membership-tiers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          revenueFrom: Number(form.revenueFrom),
          revenueTo: Number(form.revenueTo),
          rewardThreshold: Number(form.rewardThreshold),
          rewardAmount: Number(form.rewardAmount),
          commissionPercent: Number(form.commissionPercent),
          sortOrder: Number(form.sortOrder),
        }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      setMessage("Đã lưu cấp bậc CTV. Trung tâm CTV và Thưởng doanh thu sẽ cập nhật sau khi tải lại.");
      await load();
    } catch {
      setMessage("Không lưu được. Kiểm tra dữ liệu và thử lại.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải cấp hình cấp bậc CTV…</p>;
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-semibold text-[#0F172A]">Cấp bậc CTV & Thưởng doanh thu</h3>
        <p className="mt-1 text-sm text-[#64748B]">
          Nguồn dữ liệu duy nhất cho mốc doanh thu, tiền thưởng và % hoa hồng (hiển thị % chỉ trên tab Thưởng doanh
          thu).
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div>
      ) : null}

      <div className="space-y-4">
        {tiers.map((tier) => {
          const form = forms[tier.id];
          if (!form) return null;
          return (
            <article key={tier.id} className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-bold text-slate-900">{tier.name}</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-medium text-slate-600">
                  Mã (code)
                  <input
                    id={`ctv-tier-${tier.id}-code`}
                    name={`ctvTier_${tier.id}_code`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.code}
                    onChange={(e) => updateField(tier.id, "code", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Tên hiển thị
                  <input
                    id={`ctv-tier-${tier.id}-name`}
                    name={`ctvTier_${tier.id}_name`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.name}
                    onChange={(e) => updateField(tier.id, "name", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  % Hoa hồng
                  <input
                    id={`ctv-tier-${tier.id}-commission-percent`}
                    name={`ctvTier_${tier.id}_commissionPercent`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.commissionPercent}
                    onChange={(e) => updateField(tier.id, "commissionPercent", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Doanh thu từ (₫)
                  <input
                    id={`ctv-tier-${tier.id}-revenue-from`}
                    name={`ctvTier_${tier.id}_revenueFrom`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.revenueFrom}
                    onChange={(e) => updateField(tier.id, "revenueFrom", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Doanh thu đến (₫)
                  <input
                    id={`ctv-tier-${tier.id}-revenue-to`}
                    name={`ctvTier_${tier.id}_revenueTo`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.revenueTo}
                    onChange={(e) => updateField(tier.id, "revenueTo", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Ngưỡng thưởng (₫)
                  <input
                    id={`ctv-tier-${tier.id}-reward-threshold`}
                    name={`ctvTier_${tier.id}_rewardThreshold`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.rewardThreshold}
                    onChange={(e) => updateField(tier.id, "rewardThreshold", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Tiền thưởng (₫)
                  <input
                    id={`ctv-tier-${tier.id}-reward-amount`}
                    name={`ctvTier_${tier.id}_rewardAmount`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.rewardAmount}
                    onChange={(e) => updateField(tier.id, "rewardAmount", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Thứ tự
                  <input
                    id={`ctv-tier-${tier.id}-sort-order`}
                    name={`ctvTier_${tier.id}_sortOrder`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.sortOrder}
                    onChange={(e) => updateField(tier.id, "sortOrder", e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Icon (medal, crown, gem…)
                  <input
                    id={`ctv-tier-${tier.id}-icon`}
                    name={`ctvTier_${tier.id}_icon`}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={form.icon}
                    onChange={(e) => updateField(tier.id, "icon", e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:col-span-2">
                  <input
                    id={`ctv-tier-${tier.id}-is-active`}
                    name={`ctvTier_${tier.id}_isActive`}
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField(tier.id, "isActive", e.target.checked)}
                  />
                  Đang hoạt động
                </label>
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-600">
                Theme JSON (badgeColor)
                <textarea
                  id={`ctv-tier-${tier.id}-badge-color-json`}
                  name={`ctvTier_${tier.id}_badgeColorJson`}
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 font-mono text-xs"
                  rows={4}
                  value={form.badgeColorJson}
                  onChange={(e) => updateField(tier.id, "badgeColorJson", e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={savingId === tier.id}
                onClick={() => void save(tier.id)}
                className="mt-3 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingId === tier.id ? "Đang lưu…" : "Lưu cấp bậc"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
