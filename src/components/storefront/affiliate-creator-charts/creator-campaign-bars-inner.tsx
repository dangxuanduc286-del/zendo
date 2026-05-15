"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CampaignBarRow = {
  id: string;
  name: string;
  clicks: number;
  revenue: number;
  commission: number;
  epc: number;
  conversion: number;
};

function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

function CreatorCampaignBarsInnerImpl(props: { rows: CampaignBarRow[]; metric: "revenue" | "epc" | "clicks" }): JSX.Element {
  const data = useMemo(() => {
    const sorted = [...props.rows].sort((a, b) => {
      if (props.metric === "revenue") return b.revenue - a.revenue;
      if (props.metric === "epc") return b.epc - a.epc;
      return b.clicks - a.clicks;
    });
    return sorted.slice(0, 8).map((r) => ({
      ...r,
      label: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
      convPct: Math.round(r.conversion * 10_000) / 100,
    }));
  }, [props.rows, props.metric]);

  const dataKey = props.metric === "revenue" ? "revenue" : props.metric === "epc" ? "epc" : "clicks";
  const fill = props.metric === "revenue" ? "#8b5cf6" : props.metric === "epc" ? "#f59e0b" : "#2563eb";

  if (!data.length) {
    return <div className="flex h-40 items-center justify-center text-xs text-slate-500">Chưa có campaign.</div>;
  }

  return (
    <div className="h-[14rem] w-full min-h-[14rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tick={{ fontSize: 10, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(v: number, name: string) => {
              if (name === "Doanh thu" || name === "EPC" || name === "HH") return [fmtVnd(v), name];
              return [v.toLocaleString("vi-VN"), name];
            }}
            labelFormatter={() => ""}
          />
          <Bar
            dataKey={dataKey}
            name={props.metric === "revenue" ? "Doanh thu" : props.metric === "epc" ? "EPC" : "Click"}
            fill={fill}
            radius={[0, 6, 6, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const key = (rows: CampaignBarRow[], m: string): string =>
  `${m}:${rows.map((r) => `${r.id}:${r.clicks}:${r.revenue}`).join("|")}`;

export default memo(CreatorCampaignBarsInnerImpl, (a, b) => key(a.rows, a.metric) === key(b.rows, b.metric));
