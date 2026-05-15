"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#64748B", "#0EA5E9"];

export default function AffiliateAnalyticsPieInner(props: {
  data: Array<{ name: string; value: number }>;
  compact?: boolean;
}): JSX.Element {
  const h = props.compact ? 200 : 240;
  return (
    <div className="w-full" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={props.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
            {props.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]!} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [v.toLocaleString("vi-VN"), ""]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
