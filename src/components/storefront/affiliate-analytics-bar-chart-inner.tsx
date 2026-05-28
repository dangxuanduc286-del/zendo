"use client";

import { CTV_PAID_ORDER_KPI_BASE } from "@/lib/ctv/ctv-order-display";
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

export default function AffiliateAnalyticsBarChartInner(props: {
  data: AffiliateBarBucket[];
  compact?: boolean;
  /** Traffic tab — mở rộng plot area (chỉ khi size=tall). */
  wide?: boolean;
}): JSX.Element {
  const compact = props.compact ?? true;
  const wide = props.wide ?? false;
  const margin = compact
    ? { top: 4, right: 4, left: -22, bottom: 2 }
    : wide
      ? { top: 4, right: 2, left: -18, bottom: 0 }
      : { top: 8, right: 8, left: 0, bottom: 4 };
  const yAxisWidth = compact ? 28 : wide ? 30 : 36;
  const maxBarSize = compact ? 28 : wide ? 42 : 28;
  return (
    <div className="h-full w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data} margin={margin} barCategoryGap={wide ? "12%" : "20%"} barGap={wide ? 3 : 4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={yAxisWidth} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
            }}
          />
          {!compact ? (
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 11, paddingTop: wide ? 2 : 8 }}
            />
          ) : null}
          <Bar dataKey="clicks" name="Click" fill="#2563EB" radius={[5, 5, 0, 0]} maxBarSize={maxBarSize} />
          <Bar dataKey="orders" name={CTV_PAID_ORDER_KPI_BASE} fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={maxBarSize} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
