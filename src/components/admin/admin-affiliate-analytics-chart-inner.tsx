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
import { CTV_PAID_ORDER_KPI_BASE } from "@/lib/ctv/ctv-order-display";
import type { AdminAffiliateChartBucket } from "./admin-affiliate-analytics-chart-lazy";

export default function AdminAffiliateAnalyticsChartInner(props: {
  buckets: AdminAffiliateChartBucket[];
  compact?: boolean;
}): JSX.Element {
  const h = props.compact ? 220 : 288;
  return (
    <div className="w-full" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip />
          <Legend />
          <Bar dataKey="clicks" name="Click" fill="#2563EB" radius={[4, 4, 0, 0]} />
          <Bar dataKey="orders" name={CTV_PAID_ORDER_KPI_BASE} fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
