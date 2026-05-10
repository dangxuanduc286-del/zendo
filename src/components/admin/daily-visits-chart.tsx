"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SafeResponsiveContainer from "../shared/safe-responsive-container";

type DailyPoint = {
  label: string;
  visits: number;
};

interface DailyVisitsChartProps {
  title: string;
  data: DailyPoint[];
}

function EmptyChart({ title }: { title: string }): JSX.Element {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="mt-3 flex h-64 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#64748B]">
        Chưa có dữ liệu truy cập.
      </div>
    </section>
  );
}

export default function DailyVisitsChart({ title, data }: DailyVisitsChartProps): JSX.Element {
  const safeData = useMemo(() => data.map((item) => ({ label: item.label, visits: item.visits ?? 0 })), [data]);
  if (!safeData.length) return <EmptyChart title={title} />;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <SafeResponsiveContainer className="mt-3 h-64" minHeight={256}>
        {() => (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#52525b", fontSize: 12 }} />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
              contentStyle={{ borderRadius: 10, borderColor: "#d4d4d8", fontSize: 12 }}
              formatter={(value: number) => [`${new Intl.NumberFormat("vi-VN").format(value)} lượt`, "Truy cập"]}
              labelFormatter={(label: string) => `Ngày: ${label}`}
            />
            <Line type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SafeResponsiveContainer>
    </section>
  );
}
