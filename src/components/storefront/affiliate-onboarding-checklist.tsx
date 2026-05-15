"use client";

import { memo, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zendo_affiliate_onboard_v1";

type Step = { id: string; label: string };

const STEPS: Step[] = [
  { id: "link", label: "Lấy link giới thiệu (trang chủ hoặc link ngắn /go)" },
  { id: "share", label: "Chia sẻ lên Zalo / Facebook / TikTok" },
  { id: "order", label: "Chờ khách đặt đơn hợp lệ qua ref" },
  { id: "analytics", label: "Xem analytics để tối ưu nguồn & sản phẩm" },
];

export default memo(function AffiliateOnboardingChecklist(props: { dismissed?: boolean }): JSX.Element | null {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const o = JSON.parse(raw) as Record<string, boolean>;
      if (o && typeof o === "object") setDone(o);
    } catch {
      /* ignore */
    }
  }, []);

  const total = STEPS.length;
  const count = useMemo(() => STEPS.filter((s) => done[s.id]).length, [done]);
  const pct = Math.round((count / total) * 100);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (props.dismissed) return null;

  return (
    <div className="rounded-xl border border-dashed border-[#93C5FD] bg-[#EFF6FF] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F172A]">Checklist CTV mới</p>
        <span className="text-xs font-bold tabular-nums text-[#2563EB]">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 space-y-2">
        {STEPS.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-xs text-[#0F172A]">
            <input
              type="checkbox"
              checked={Boolean(done[s.id])}
              onChange={() => toggle(s.id)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CBD5E1]"
            />
            <span className={done[s.id] ? "text-[#64748B] line-through" : ""}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
