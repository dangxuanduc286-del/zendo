"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AffiliateBarBucket = {
  label: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
};

export default function AffiliateAnalyticsBarChartInner(props: { data: AffiliateBarBucket[]; compact?: boolean }): JSX.Element {
  const compact = props.compact ?? true;
  const margin = compact
    ? { top: 4, right: 4, left: -22, bottom: 2 }
    : { top: 12, right: 12, left: 4, bottom: 8 };
  return (
    <div className="h-full w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
            }}
          />
          {!compact ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
          <Bar dataKey="clicks" name="Click" fill="#2563EB" radius={[5, 5, 0, 0]} maxBarSize={28} />
          <Bar dataKey="orders" name="Đơn trả" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
