"use client";

import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AffiliateAnalyticsTimelineInner(props: {
  buckets: Array<{ label: string; clicks: number; orders: number; revenue: number; commission: number; conversionRate: number }>;
  compact?: boolean;
}): JSX.Element {
  const data = props.buckets.map((b) => ({
    ...b,
    conversionPct: Math.round(b.conversionRate * 10000) / 100,
  }));
  const h1 = props.compact ? 120 : 160;
  const h2 = props.compact ? 100 : 130;
  return (
    <div className="w-full space-y-2 overflow-x-auto">
      <div className="min-w-[520px]" style={{ height: h1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="a" tick={{ fontSize: 10 }} width={34} />
            <Tooltip formatter={(v: number) => [v.toLocaleString("vi-VN"), ""]} />
            <Legend />
            <Line yAxisId="a" type="monotone" dataKey="clicks" name="Click" stroke="#2563EB" strokeWidth={2} dot={false} />
            <Line yAxisId="a" type="monotone" dataKey="orders" name="Đơn" stroke="#10B981" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-[520px]" style={{ height: h2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="b" tick={{ fontSize: 10 }} width={34} />
            <YAxis yAxisId="c" orientation="right" tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === "Conv %" ? [`${v}%`, name] : [`${Math.round(v).toLocaleString("vi-VN")}đ`, name]
              }
            />
            <Legend />
            <Line yAxisId="b" type="monotone" dataKey="conversionPct" name="Conv %" stroke="#F59E0B" strokeWidth={2} dot={false} />
            <Line yAxisId="c" type="monotone" dataKey="commission" name="Commission" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            <Line yAxisId="c" type="monotone" dataKey="revenue" name="Doanh thu" stroke="#0EA5E9" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
