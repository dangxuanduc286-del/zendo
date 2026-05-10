"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SafeResponsiveContainer from "../shared/safe-responsive-container";

type MonthlyPoint = {
  label: string;
  visits: number;
};

interface MonthlyVisitsChartProps {
  data: MonthlyPoint[];
}

export default function MonthlyVisitsChart({ data }: MonthlyVisitsChartProps): JSX.Element {
  if (!data.length) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Biểu đồ 12 tháng hiện tại</h3>
        <div className="mt-3 flex h-64 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#64748B]">
          Chưa có dữ liệu theo tháng.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Biểu đồ 12 tháng hiện tại</h3>
      <SafeResponsiveContainer className="mt-3 h-64" minHeight={256}>
        {() => (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#52525b", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 10, borderColor: "#d4d4d8", fontSize: 12 }}
              formatter={(value: number) => [`${new Intl.NumberFormat("vi-VN").format(value)} lượt`, "Truy cập"]}
              labelFormatter={(label: string) => `Tháng: ${label}`}
            />
            <Bar dataKey="visits" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SafeResponsiveContainer>
    </section>
  );
}
