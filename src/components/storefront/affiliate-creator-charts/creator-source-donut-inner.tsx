"use client";

import { memo, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  TIKTOK: "#000000",
  FACEBOOK: "#1877f2",
  YOUTUBE: "#ef4444",
  INSTAGRAM: "#e4405f",
  DIRECT: "#64748b",
  UNKNOWN: "#94a3b8",
};

const LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook / Messenger",
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  DIRECT: "Direct",
  UNKNOWN: "Khác (Zalo, Telegram, …)",
};

export type SourceRow = {
  source: string;
  clicks: number;
  visitors: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

function CreatorSourceDonutInnerImpl(props: { rows: SourceRow[] }): JSX.Element {
  const data = useMemo(() => {
    const total = props.rows.reduce((s, r) => s + r.clicks, 0);
    return props.rows
      .filter((r) => r.clicks > 0)
      .map((r) => {
        const key = String(r.source).toUpperCase();
        return {
          name: LABELS[key] ?? key,
          raw: key,
          value: r.clicks,
          pct: total > 0 ? Math.round((r.clicks / total) * 1000) / 10 : 0,
          orders: r.orders,
          conv: Math.round(r.conversionRate * 10_000) / 100,
        };
      });
  }, [props.rows]);

  if (!data.length) {
    return <div className="flex h-44 items-center justify-center text-xs text-slate-500">Chưa có phân bổ nguồn.</div>;
  }

  return (
    <div className="h-[11.5rem] w-full min-h-[11.5rem]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={1}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={`${d.raw}-${i}`} fill={COLORS[d.raw] ?? COLORS.UNKNOWN} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as { name: string; pct: number; orders: number; conv: number; value: number };
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="mt-0.5 text-slate-600">
                    {p.pct}% traffic · {p.value.toLocaleString("vi-VN")} click
                  </p>
                  <p className="text-slate-600">
                    {p.orders} đơn · conv {p.conv}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const rowKey = (rows: SourceRow[]): string =>
  rows.length === 0 ? "" : rows.map((r) => `${r.source}:${r.clicks}:${r.orders}`).join("|");

export default memo(CreatorSourceDonutInnerImpl, (a, b) => rowKey(a.rows) === rowKey(b.rows));
