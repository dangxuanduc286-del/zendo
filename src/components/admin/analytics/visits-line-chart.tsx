"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SafeResponsiveContainer from "../../shared/safe-responsive-container";

export interface VisitsLineChartPoint {
  label: string;
  visits: number;
  orders: number;
  revenue: number;
}

interface VisitsLineChartProps {
  data: VisitsLineChartPoint[];
  totalVisits: number;
  timezone: string;
  showMismatchWarning?: boolean;
}

export default function VisitsLineChart({
  data,
  totalVisits,
  timezone,
  showMismatchWarning = false,
}: VisitsLineChartProps): JSX.Element {
  const chartSum = data.reduce((sum, row) => sum + row.visits, 0);
  const mismatch = chartSum - totalVisits;
  const isEmpty = data.every((item) => item.visits === 0 && item.orders === 0 && item.revenue === 0);

  return (
    <section className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Truy cập / Đơn hàng / Doanh thu theo ngày</h3>
          <p className="mt-0.5 text-xs text-[#64748B]">Múi giờ thống kê: {timezone}.</p>
        </div>
        {showMismatchWarning && mismatch !== 0 ? (
          <p className="text-xs font-medium text-rose-600">Lệch tổng thẻ và biểu đồ: {mismatch}</p>
        ) : null}
      </div>
      {isEmpty ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] text-center">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Chưa đủ dữ liệu để vẽ biểu đồ.</p>
            <p className="mt-1 text-xs text-[#64748B]">Hãy mở storefront public để hệ thống bắt đầu ghi nhận.</p>
          </div>
        </div>
      ) : (
        <SafeResponsiveContainer className="h-80 min-w-0" minHeight={320}>
          {() => (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748B", fontSize: 12 }}
                interval={data.length > 20 ? 2 : 0}
              />
              <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const formatted = new Intl.NumberFormat("vi-VN").format(value);
                  if (name === "revenue") return [`${formatted} đ`, "Doanh thu"];
                  if (name === "orders") return [`${formatted}`, "Đơn hàng"];
                  return [`${formatted}`, "Truy cập"];
                }}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Line
                dataKey="visits"
                type="monotone"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: "#2563EB" }}
                activeDot={{ r: 4 }}
              />
              <Line
                dataKey="orders"
                type="monotone"
                stroke="#0EA5E9"
                strokeWidth={2}
                dot={{ r: 2, fill: "#0EA5E9" }}
              />
              <Line
                dataKey="revenue"
                type="monotone"
                stroke="#16A34A"
                strokeWidth={2}
                dot={{ r: 2, fill: "#16A34A" }}
              />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SafeResponsiveContainer>
      )}
    </section>
  );
}
