"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type LandingRow = {
  pathname: string;
  visits: number;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function CreatorLandingBarsInnerImpl(props: { rows: LandingRow[] }): JSX.Element {
  const data = useMemo(() => {
    return [...props.rows]
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8)
      .map((r) => {
        const epc = r.clicks > 0 ? r.commission / r.clicks : 0;
        return {
          ...r,
          label: r.pathname.length > 26 ? `${r.pathname.slice(0, 24)}…` : r.pathname,
          epc,
          convPct: Math.round(r.conversionRate * 10_000) / 100,
        };
      });
  }, [props.rows]);

  if (!data.length) {
    return <div className="flex h-36 items-center justify-center text-xs text-slate-500">Chưa có landing.</div>;
  }

  return (
    <div className="h-[13rem] w-full min-h-[13rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(v: number, name: string) => {
              if (name === "EPC") return [fmtVnd(v), name];
              if (name === "Conv %") return [`${v}%`, name];
              return [v.toLocaleString("vi-VN"), name];
            }}
          />
          <Bar dataKey="epc" name="EPC" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const rk = (rows: LandingRow[]): string => rows.map((r) => `${r.pathname}:${r.visits}`).join("|");

export default memo(CreatorLandingBarsInnerImpl, (a, b) => rk(a.rows) === rk(b.rows));
