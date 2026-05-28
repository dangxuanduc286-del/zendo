"use client";

import { CTV_PAID_ORDER_KPI_BASE } from "@/lib/ctv/ctv-order-display";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CreatorTimelinePoint = {
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

function shortLabel(raw: string): string {
  if (raw.length >= 10 && raw.includes("-")) {
    const p = raw.slice(5);
    return p.startsWith("0") ? p.replace(/^0/, "") : p;
  }
  return raw;
}

function CreatorTrafficLineInnerImpl(props: { buckets: CreatorTimelinePoint[] }): JSX.Element {
  const data = useMemo(
    () =>
      props.buckets.map((b) => ({
        ...b,
        day: shortLabel(b.label),
        convPct: Math.round(b.conversionRate * 10_000) / 100,
      })),
    [props.buckets],
  );

  if (!data.length) {
    return <div className="flex h-36 items-center justify-center text-xs text-slate-500">Chưa có dữ liệu theo ngày.</div>;
  }

  return (
    <div className="h-[12rem] w-full min-h-[12rem] min-w-0 sm:h-[13rem]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={30} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={34}
            domain={[0, "auto"]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
            }}
            formatter={(value: number, name: string) => {
              if (name === "Conv %") return [`${value}%`, name];
              return [value.toLocaleString("vi-VN"), name];
            }}
            labelFormatter={(_, payload) => (payload?.[0]?.payload?.label as string) ?? ""}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" height={28} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="clicks"
            name="Click"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="orders"
            name={CTV_PAID_ORDER_KPI_BASE}
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="convPct"
            name="Conv %"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const keyOf = (b: CreatorTimelinePoint[]): string =>
  b.length === 0 ? "" : `${b.length}:${b[0]!.label}:${b[b.length - 1]!.label}:${b[0]!.clicks}:${b[b.length - 1]!.clicks}`;

export default memo(CreatorTrafficLineInnerImpl, (a, b) => keyOf(a.buckets) === keyOf(b.buckets));
